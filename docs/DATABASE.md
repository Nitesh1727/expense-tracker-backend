# Database Design

MongoDB via Mongoose. Three collections. Every field below is justified —
don't add a field without updating this doc in the same change.

## `users`

| Field           | Type    | Notes |
|-----------------|---------|-------|
| `_id`           | ObjectId | |
| `name`          | String, optional | For personalization ("Hi, Nitesh") — not required at signup to keep signup minimal. |
| `email`         | String, unique, sparse | Sparse because a phone-only user won't have one. Lowercased before save. |
| `phone`         | String, unique, sparse | Sparse for the same reason, reversed. E.164 format. |
| `passwordHash`  | String, optional | Only set for email/password accounts. Never store plaintext. |
| `authProvider`  | enum: `email`, `phone`, `google` | `google` reserved for future use — not active yet, but present now so adding Google Sign-In is additive, not a migration. |
| `googleId`      | String, optional, sparse | Reserved for future Google Sign-In. Unused until that ships. |
| `currency`      | String, default `INR` | Single default currency assumption for v1 (flagged as an open item in STATUS.md) — stored per-user rather than hardcoded so it's a one-field change to make it user-configurable later. |
| `createdAt` / `updatedAt` | Date (Mongoose timestamps) | |

**Why not a separate `profile` sub-document:** there's currently exactly one
optional profile field (`name`). A nested sub-document would be indirection
without payoff — flatten it back into `users` unless the profile surface
actually grows.

**Indexes:** unique+sparse on `email`, unique+sparse on `phone` (enforces "no
two accounts with the same email/phone" while allowing either to be absent).

## `otps`

Short-lived, not user-facing data — a separate collection rather than fields
on `users` so it can have its own TTL expiry and doesn't bloat the user
document with auth-flow noise.

| Field        | Type   | Notes |
|--------------|--------|-------|
| `_id`        | ObjectId | |
| `phone`      | String | The phone number the code was issued for. |
| `codeHash`   | String | Hashed OTP (never store the raw code). |
| `attempts`   | Number, default 0 | Incremented on each failed verify; service rejects after 5. |
| `expiresAt`  | Date | Set to now + 5 minutes at creation. |
| `createdAt`  | Date | |

**Indexes:** TTL index on `expiresAt` (`expireAfterSeconds: 0`) — MongoDB
auto-deletes expired OTP docs, no manual cleanup job needed. Non-unique index
on `phone` for lookup during verify.

## `expenses`

The core domain object. Deliberately minimal fields per the product goal —
resist adding anything here that isn't asked for.

| Field         | Type     | Notes |
|---------------|----------|-------|
| `_id`         | ObjectId | |
| `userId`      | ObjectId, ref `User`, required | Every expense belongs to exactly one user. |
| `amount`      | Number, required, min 0 | Stored as a plain number in the user's currency (see `users.currency`) — no multi-currency conversion in v1. |
| `description` | String, required, max ~120 chars | Free text, kept short intentionally — this is a label, not notes. |
| `category`    | String, enum, required | Fixed enum for v1 (Food, Transport, Shopping, Bills, Entertainment, Health, Other) — see "Why categories are an enum" below. |
| `date`        | Date, required, default now | The date the expense actually happened — distinct from `createdAt`. This is what analytics filters and CSV export use. User can backdate an entry (e.g. logging yesterday's coffee). |
| `createdAt` / `updatedAt` | Date (Mongoose timestamps) | Audit trail only — never used for filtering/analytics, that's what `date` is for. |

**Indexes:** compound index on `{ userId: 1, date: -1 }` — every real query
(list expenses, analytics aggregation, CSV export) filters by `userId` and a
`date` range, then usually sorts by `date` descending. This one index serves
all three.

**Why categories are an enum, not a collection:** making categories
user-editable would mean a whole CRUD surface (create/rename/delete category,
handle what happens to expenses when a category is deleted) for a feature
that isn't part of the minimal spec. A fixed enum keeps the entry form fast
(a chip picker, no "create new category" flow) and keeps the schema simple.
If custom categories are wanted later, this is a contained migration: add a
`categories` collection, migrate the enum values as seed data, change
`expenses.category` from enum-string to an ObjectId ref.

Default category set (icon/color mapping lives in the frontend design system,
not the DB):
`Food`, `Transport`, `Shopping`, `Bills`, `Entertainment`, `Health`, `Other`.

## Explicitly not modeled (yet)

- **Budgets/limits** — not asked for, not built.
- **Recurring expenses** — not asked for, not built.
- **Multi-currency conversion** — `currency` field exists per-user for future
  use, but no conversion logic exists; all amounts for a user are assumed to
  be in their single currency.
- **Attachments/receipts** — not asked for, not built.

Don't add these speculatively — if the user asks for one, it gets designed
(and documented here) at that point.
