# Database Design

MongoDB via Mongoose. Four collections. Every field below is justified —
don't add a field without updating this doc in the same change.

> **Update (2026-09-16):** categories are now a full user-owned collection
> with CRUD, not a fixed enum — the user asked for category CRUD explicitly.
> The original "fixed enum" reasoning below the `expenses` table is kept as a
> record of why we started there, but it's superseded by the `categories`
> section.
>
> **Update (2026-09-16, later same day):** email+password signup/login is now
> also implemented, alongside phone+OTP — both create the same shape of user
> (default categories seeded either way). `name` and `email` can additionally
> be set/edited any time via `PATCH /api/auth/me`, independent of which method
> was used to sign up — a phone user can add an email as a contact-info field
> without that becoming a second login method (no password gets attached
> unless they go through the separate email signup flow).

## `users`

| Field           | Type    | Notes |
|-----------------|---------|-------|
| `_id`           | ObjectId | |
| `name`          | String, optional | For personalization ("Hi, Nitesh") — not required at signup to keep signup minimal. |
| `avatar`        | enum: `AVATAR_KEYS` (`constants/avatarPresets.js`), optional | A key the frontend maps to a bundled cartoon illustration (`assets/avatars/`), not a free-form string or an uploaded image — no upload/storage/moderation surface needed. `null` until the user picks one; the frontend falls back to the first letter of `name` until then. |
| `email`         | String, unique, sparse | Sparse because a phone-only user won't have one. Lowercased before save. |
| `phone`         | String, unique, sparse | Sparse for the same reason, reversed. E.164 format. |
| `passwordHash`  | String, optional | Only set for email/password accounts. Never store plaintext. |
| `authProvider`  | enum: `email`, `phone`, `google` | `google` reserved for future use — not active yet, but present now so adding Google Sign-In is additive, not a migration. |
| `googleId`      | String, optional, sparse | Reserved for future Google Sign-In. Unused until that ships. |
| `currency`      | String, default `INR` | Single default currency assumption for v1 (flagged as an open item in STATUS.md) — stored per-user rather than hardcoded so it's a one-field change to make it user-configurable later. |
| `emailVerified` | Boolean, default `false` | Only meaningful for `authProvider: 'email'` — a phone-login account is implicitly verified by having proven ownership of the phone via OTP. Set `true` once the signup verification code (see `verificationcodes`, purpose `email-verify`) is confirmed. |
| `monthlyReportEnabled` | Boolean, default `true` | Opt-out, not opt-in — the monthly report cron job (`src/jobs/monthlyReport.job.js`) only skips a user when this is explicitly `false`. Toggled from Settings, or via the no-login-required unsubscribe link every report email carries. |
| `unsubscribeToken` | String, unique | Opaque, generated once at creation (`crypto.randomBytes`) — not derived from the user id, so it can't be guessed/enumerated from a leaked report email. Powers `GET /public/unsubscribe/:token`. |
| `createdAt` / `updatedAt` | Date (Mongoose timestamps) | |

**Why not a separate `profile` sub-document:** there's currently exactly one
optional profile field (`name`). A nested sub-document would be indirection
without payoff — flatten it back into `users` unless the profile surface
actually grows.

**Indexes:** unique+sparse on `email`, unique+sparse on `phone` (enforces "no
two accounts with the same email/phone" while allowing either to be absent).

**Sensitive field handling:** `passwordHash` has `select: false`, but that
only suppresses it from *query* results — a document already loaded in
memory (what `.create()` returns, or after an explicit
`.select('+passwordHash')` to check a login) still carries it, and would
leak into a `res.json({ user })` response. Caught in manual testing: both
signup and login were leaking the hash. Fixed with a schema-level `toJSON`
transform (`user.model.js`) that strips it unconditionally — the one place
that guarantees it never reaches a response regardless of how the document
was loaded, rather than relying on remembering to `.select('-passwordHash')`
at every call site.

## `verificationcodes`

Short-lived, not user-facing data — a separate collection rather than fields
on `users` so it can have its own TTL expiry and doesn't bloat the user
document with auth-flow noise. Was `otps` (phone login only); generalized to
also back email verification and password reset once those needed the same
mechanics — `purpose` keeps the three from ever matching each other's
lookups even if the same phone/email is mid-flow on more than one at once.

| Field        | Type   | Notes |
|--------------|--------|-------|
| `_id`        | ObjectId | |
| `phone`      | String, optional | Set for `purpose: 'phone-login'`. |
| `email`      | String, optional | Set for `purpose: 'email-verify'` / `'password-reset'`. |
| `purpose`    | enum: `phone-login`, `email-verify`, `password-reset` | |
| `codeHash`   | String | Hashed code (never store the raw value). |
| `attempts`   | Number, default 0 | Incremented on each failed verify; service rejects after 5. |
| `expiresAt`  | Date | Set to now + 5 minutes at creation. |
| `createdAt`  | Date | |

**Indexes:** TTL index on `expiresAt` (`expireAfterSeconds: 0`) — MongoDB
auto-deletes expired codes, no manual cleanup job needed. Non-unique indexes
on `phone` and `email` for lookup during verify.

## `expenses`

The core domain object. Deliberately minimal fields per the product goal —
resist adding anything here that isn't asked for.

| Field         | Type     | Notes |
|---------------|----------|-------|
| `_id`         | ObjectId | |
| `userId`      | ObjectId, ref `User`, required | Every expense belongs to exactly one user. |
| `amount`      | Number, required, min 0 | Stored as a plain number in the user's currency (see `users.currency`) — no multi-currency conversion in v1. |
| `description` | String, required, max 30 chars | Free text, kept short intentionally — this is a label, not notes. |
| `category`    | ObjectId, ref `Category`, required | See `categories` collection below. |
| `date`        | Date, required, default now | The date the expense actually happened — distinct from `createdAt`. This is what analytics filters and CSV export use. User can backdate an entry (e.g. logging yesterday's coffee). |
| `createdAt` / `updatedAt` | Date (Mongoose timestamps) | Audit trail only — never used for filtering/analytics, that's what `date` is for. |

**Indexes:** compound index on `{ userId: 1, date: -1 }` — every real query
(list expenses, analytics aggregation, CSV export) filters by `userId` and a
`date` range, then usually sorts by `date` descending. This one index serves
all three.

*(Superseded — kept for history: categories started as a fixed enum to avoid
a CRUD surface. The user explicitly asked for category CRUD, so this is now
the `categories` collection below instead.)*

## `categories`

User-owned, not global — each user gets their own editable set, seeded with
defaults at signup. A per-user collection (rather than a shared global list
users pick from) because "CRUD category" implies rename/recolor/delete should
only ever affect that one user's data, never other users.

| Field         | Type    | Notes |
|---------------|---------|-------|
| `_id`         | ObjectId | |
| `userId`      | ObjectId, ref `User`, required | Owner. |
| `name`        | String, required, max ~30 chars | |
| `icon`        | String, required | Key into a fixed icon set the frontend maps to a Material icon — see `frontend/docs/DESIGN_SYSTEM.md`. Not a free-form icon upload — keeps the picker a curated grid, not a mess. |
| `color`       | String (hex), required | Picked from a curated palette (design system), not a free color picker — keeps categories visually consistent instead of clashing. |
| `isDeletable` | Boolean, default `true` | `false` only for the seeded `Other` category — it's the fallback target when another category is deleted (see below), so it must always exist. |
| `createdAt` / `updatedAt` | Date | |

**Indexes:** compound unique index on `{ userId: 1, name: 1 }` — no duplicate
category names within one user's set (case-insensitive collation).

**Seeding:** on account creation, seed each user with the default set below.
These are just normal rows owned by that user (`isDeletable: true` except
`Other`) — "default" only describes how they were created, not a special type
the code branches on afterward.

Default category set:

| Name | Icon key | Color |
|------|----------|-------|
| Food | `restaurant` | amber |
| Transport | `directions_car` | blue |
| Shopping | `shopping_bag` | violet |
| Bills | `receipt_long` | red-orange |
| Entertainment | `movie` | pink |
| Health | `favorite` | teal |
| Other | `category` | gray — `isDeletable: false` |

**Deleting a category:** any expense currently pointing at the deleted
category is reassigned to that user's `Other` category (single update-many,
done in the same service call before the delete) — never leaves an expense
with a dangling category reference, and never blocks the delete with a "still
in use" error, which would be a worse experience for a feature this small.
`Other` itself cannot be deleted (`isDeletable: false`, enforced in the
service) since it's the reassignment target.

## Explicitly not modeled (yet)

- **Budgets/limits** — not asked for, not built.
- **Recurring expenses** — not asked for, not built.
- **Multi-currency conversion** — `currency` field exists per-user for future
  use, but no conversion logic exists; all amounts for a user are assumed to
  be in their single currency.
- **Attachments/receipts** — not asked for, not built.

Don't add these speculatively — if the user asks for one, it gets designed
(and documented here) at that point.
