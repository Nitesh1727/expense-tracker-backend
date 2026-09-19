# Backend Architecture

Node.js + Express 5 + MongoDB (Mongoose). Plain JavaScript, ES modules
(`import`/`export`, `"type": "module"` in package.json) — no TypeScript by
design (see "Why no TypeScript" below). Was CommonJS originally; converted
per explicit user request. Two things that don't come up in CommonJS: every
relative import needs its explicit `.js` extension (`./foo.js`, not `./foo`
— ESM doesn't resolve extensions or directory `index.js` files implicitly),
and a module with several named exports (most services/controllers) uses a
single `export { a, b, c };` at the bottom rather than `export const`/
`export function` at each declaration — keeps the diff from the CommonJS
version minimal and every export visible in one place. `scripts/seed-demo-account.cjs`
is the one exception, kept as CommonJS via the explicit `.cjs` extension
(which always overrides the package's `"type"` for that one file) rather
than converted, since it wasn't part of that day's work.

## Layering rule

```
request → route → controller → service → model (Mongoose) → MongoDB
```

- **Route** (`routes/`) — maps HTTP verb+path to a controller function, applies
  route-level middleware (auth guard, validation, rate limiting). No logic.
- **Controller** (`controllers/`) — parses `req` (params/query/body), calls the
  service, shapes the HTTP response (status code + JSON). No business logic,
  no direct DB/model access.
- **Service** (`services/`) — all business logic lives here. Orchestrates
  model calls, enforces rules (e.g. "OTP max 5 attempts"), throws `ApiError`
  on failure. Framework-agnostic — a service function should never reference
  `req`/`res`.
- **Model** (`models/`) — Mongoose schemas. This *is* the data-access layer;
  there's no separate repository layer. For an app this size, a repository
  layer between service and Mongoose model would be indirection without
  payoff — reconsider only if the app grows enough that Mongoose calls need
  to be swapped or heavily reused across many services.

Never let a controller import a model directly, and never let a service touch
`req`/`res`. This keeps controllers/services independently testable and keeps
the DB swappable in theory (not a real goal here, but the discipline is what
keeps the codebase easy to follow).

## Folder structure (target)

```
backend/
├── src/
│   ├── config/
│   │   ├── env.js              # loads + validates process.env once, exports typed config object
│   │   └── db.js                # mongoose.connect() + connection event logging
│   ├── constants/
│   │   └── categoryPresets.js   # curated icon keys, curated colors, default category seed data
│   ├── models/
│   │   ├── user.model.js
│   │   ├── otp.model.js
│   │   ├── category.model.js
│   │   └── expense.model.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── category.controller.js
│   │   ├── expense.controller.js
│   │   ├── analytics.controller.js
│   │   └── export.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── otp.service.js       # OTP generation/verification, pluggable SMS sender
│   │   ├── category.service.js  # CRUD + default-category seeding on signup
│   │   ├── expense.service.js
│   │   ├── analytics.service.js
│   │   └── export.service.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── category.routes.js
│   │   ├── expense.routes.js
│   │   ├── analytics.routes.js
│   │   ├── export.routes.js
│   │   └── index.js             # mounts all routers under /api
│   ├── middleware/
│   │   ├── auth.middleware.js   # verifies JWT, attaches req.userId
│   │   ├── error.middleware.js  # centralized error handler (catches ApiError + unknowns)
│   │   ├── validate.middleware.js # runs a zod schema against req, 400s on failure
│   │   └── rateLimiter.middleware.js
│   ├── validators/
│   │   ├── auth.validator.js    # zod schemas for otp request/verify payloads
│   │   ├── category.validator.js
│   │   ├── expense.validator.js
│   │   ├── analytics.validator.js
│   │   └── common.validator.js  # shared idParamSchema for :id routes
│   ├── utils/
│   │   ├── ApiError.js          # custom error class (statusCode + message)
│   │   ├── jwt.util.js          # sign/verify
│   │   ├── hash.util.js         # bcrypt wrappers for passwords + OTP codes
│   │   ├── otp.util.js          # random code generation
│   │   ├── dateRange.util.js    # day/week/month/year → {start, end} for a given timezone
│   │   └── csv.util.js          # expenses[] → CSV string
│   ├── app.js                    # express app: middleware wiring, route mounting, error handler
│   └── server.js                 # entry point: connect DB, start HTTP server
├── docs/
├── .env.example
└── package.json
```

`src/server.js` is the real entry point (`src/index.js` was the original
empty scaffold placeholder and has been removed); `package.json`'s `main`
and `scripts.start`/`dev` point at it.

## Why no TypeScript

Deliberate call for this project's size: the app has ~3 real domain objects
(user, expense, otp) and a handful of endpoints. Zod validation at the API
boundary + JSDoc types where genuinely useful gives most of the safety benefit
without a build step. Revisit if the backend grows well past this scope —
don't add TS mid-project without a clear trigger, since a partial migration is
worse than none.

## Request validation

Every endpoint that takes a body, query, or `:id` param validates it with a
`zod` schema via `validate.middleware.js` before it reaches the controller.
Validation schemas live in `validators/`, one file per domain.

**Controllers read from `req.valid.{body,query,params}`, never
`req.body`/`req.query`/`req.params` directly.** This matters more than it
sounds: `req.query` in Express 5 is a getter-only accessor with no setter —
confirmed against the installed `express@5.2.1` — so reassigning it (e.g. to
write back zod's coerced/defaulted values) is a silent no-op, not an error.
`validate.middleware.js` works around this by stashing the parsed result on
`req.valid` instead of trying to mutate `req.query` in place. If a controller
ever reads `req.query.page` directly, it'll get the raw un-coerced string (or
`undefined` if the client omitted it) instead of zod's validated/defaulted
number — a subtle bug. Always go through `req.valid`.

## Error handling

- Services throw `ApiError(statusCode, message)` for expected failures
  (invalid credentials, OTP expired, not found, etc.).
- Express 5 automatically forwards both sync throws and rejected promises
  from async route handlers/middleware to the error middleware — no
  `asyncHandler` wrapper or manual try/catch needed in controllers.
- `error.middleware.js` is the single place that formats error responses and
  decides what's safe to expose to the client vs. only logged.

## Auth flow

Two independent paths, both producing the same shape of user (both seed
default categories via `category.service.js` on creation — a brand new user
should never hit the expense screen with an empty category list). The
frontend currently only surfaces email+password in its UI (phone+OTP was
dropped "for now" per explicit product decision — real SMS costs money at
every provider, there's no free gateway); both paths still work identically
at the API level, so re-adding the phone UI later is frontend-only.

**Phone + OTP** — signup and login are the same flow, there's no separate
"create account" step:
1. `POST /api/auth/otp/request` — generate 6-digit code, hash it, store in
   `verificationcodes` (purpose `phone-login`) with a 5-minute TTL index,
   send via the SMS provider interface (see below). Rate-limited per phone
   number.
2. `POST /api/auth/otp/verify` — check code against stored hash + expiry +
   attempt count. On success: find-or-create user by phone, issue JWT.

**Email + password** — a normal separate signup/login pair:
1. `POST /api/auth/signup/email` — 409 if the email is already registered,
   otherwise hash the password (bcrypt) and create the user. Best-effort
   sends a verification email (see below) — signup succeeds either way.
2. `POST /api/auth/login/email` — verify the password hash. Both a wrong
   email and a wrong password return the same 401 message, so a failed
   attempt never reveals whether an email is registered.

**Profile editing:** `PATCH /api/auth/me` accepts `{ name?, avatar?,
monthlyReportEnabled? }` and is deliberately the *same* endpoint for
editing from the Profile screen and toggling the monthly-report setting —
no separate endpoints for each. No `email` — per explicit product decision,
an account's email is fixed once set (it's the verified login identity, not
an editable contact-info field), so there's no path to change it after
signup at all, not even a hidden one.

**SMS provider is pluggable.** `services/otp.service.js` calls an injected
`sendSms(phone, code)` function. Dev implementation logs the code to the
console / includes it in the API response (never do this in production —
gate behind `NODE_ENV !== 'production'`). Swap in a real provider (Twilio,
MSG91, etc.) before launch — see `STATUS.md` open items.

**`verificationcodes` is shared infrastructure** (`models/verificationCode.
model.js`, `services/verificationCode.service.js`) — the same "hashed code,
5-minute TTL, capped wrong-attempts" mechanics back phone login OTP, email
verification, and password reset, distinguished by a `purpose` field so the
three can never satisfy each other's lookups. `otp.service.js` is now a thin
wrapper over this shared core (kept for its SMS-specific bits); email
verification and password reset call the shared core directly from
`auth.service.js`.

**Email verification is a one-time confirmation, not a login gate** — per
explicit product decision ("we will not verify everytime"), `emailVerified`
is informational only (drives Profile's "verify your email" prompt); nothing
currently blocks on it being `false`. `POST /api/auth/verify-email/resend`
+ `POST /api/auth/verify-email` (both authenticated) send and check the code.

**Password reset** (`POST /api/auth/password/forgot` then `POST /api/auth/
password/reset`) never reveals whether an email is registered — `forgot`
always returns `{ success: true }`, including when the send itself fails,
which matters just as much as the "unknown email" case (letting a send
failure surface as an error would 500 *only* for a registered email, an
enumeration leak by omission).

**Email sending** (`utils/mailer.util.js`, `utils/emailTemplates.util.js`) —
nodemailer over the account owner's own Gmail + an App Password
(`SMTP_USER` / `SMTP_APP_PASSWORD` in `.env`; unset until configured, in
which case any send throws a clear error rather than the whole server
failing to boot). Every email embeds the app logo (`src/assets/logo.png`) as
a `cid` attachment rather than a hosted image URL, since there's no public
asset host. Three templates share one branded HTML shell: email
verification, password reset (both a 6-digit code), and the monthly
spending report (see below).

**Monthly spending report** (`jobs/monthlyReport.job.js`) — a `node-cron`
job, scheduled for 00:30 `Asia/Kolkata` every day regardless of server
deploy timezone, that no-ops unless today is the 1st of the month (in IST)
— "yesterday was the last day of last month" is true regardless of that
month's actual length, so this needs no hardcoded Feb 28/29 handling. On a
1st, for every user with `monthlyReportEnabled !== false` who has at least
one expense last month: builds the same styled `.xlsx` workbook the Excel
export feature uses (`utils/excel.util.js`), emails a summary (total +
top-5 categories) with that workbook attached, and includes an unsubscribe
link (`GET /api/public/unsubscribe/:token`, no auth — see `routes/
public.routes.js`) that flips `monthlyReportEnabled` off without requiring
a login, since it's opened from an email client. A user with zero expenses
that month is skipped rather than sent an empty report.

**JWT:** single access token, ~30 day expiry, sent as `Authorization: Bearer`.
No refresh token flow for v1 — this is a personal finance app, not
high-security banking, and refresh-token rotation is complexity this app
doesn't need yet. Revisit if that judgment call turns out wrong.

**Google Sign-In (future):** `user.model.js` already has an `authProvider`
enum and optional `googleId` field reserved for this so it's additive, not a
migration. When it's added: Apple's guideline 4.8 will require Sign in with
Apple be added in the same release — see `STATUS.md`.

**Account deletion:** `DELETE /api/auth/me` — required by both app stores
once account creation exists. Cascades to delete the user's expenses.

## Analytics aggregation

`analytics.service.js` uses MongoDB aggregation pipelines (`$match` on
`userId` + date range, `$group` by category and/or truncated date) rather
than pulling all expenses into Node and summing in JS — keeps it correct as
data grows and pushes the work to where the indexes are. `dateRange.util.js`
converts a `period` query param (`day|week|month|year`) plus an optional
anchor date into the `{start, end}` bounds used in the `$match` stage.

## CSV export

`export.service.js` reuses the same date-range + filter logic as analytics,
pulls matching expenses, and builds a CSV via `csv.util.js` (columns: date,
category, description, amount — in that order, since that's the natural read
order in Sheets). No external CSV library needed for a shape this simple;
keep it a plain string-builder to avoid a dependency for ~10 lines of logic.
