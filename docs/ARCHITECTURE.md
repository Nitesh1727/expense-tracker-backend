# Backend Architecture

Node.js + Express 5 + MongoDB (Mongoose). Plain JavaScript, CommonJS — no
TypeScript by design (see "Why no TypeScript" below).

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

**v1 is phone + OTP only** — signup and login are the same flow, there's no
separate "create account" step. Email/password schema fields exist for a
later addition but no endpoints are built for it yet.

1. `POST /api/auth/otp/request` — generate 6-digit code, hash it, store in
   `otps` collection with a 5-minute TTL index, send via the SMS provider
   interface (see below). Rate-limited per phone number.
2. `POST /api/auth/otp/verify` — check code against stored hash + expiry +
   attempt count. On success: find-or-create user by phone; if this created a
   new user, seed their default categories (`category.service.js`) in the
   same call before issuing the JWT — a brand new user should never hit the
   expense screen with an empty category list.

**SMS provider is pluggable.** `services/otp.service.js` calls an injected
`sendSms(phone, code)` function. Dev implementation logs the code to the
console / includes it in the API response (never do this in production —
gate behind `NODE_ENV !== 'production'`). Swap in a real provider (Twilio,
MSG91, etc.) before launch — see `STATUS.md` open items.

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
