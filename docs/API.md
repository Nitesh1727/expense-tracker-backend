# API Reference

Base path: `/api`. All request/response bodies are JSON. Authenticated routes
require `Authorization: Bearer <jwt>`.

This doc describes the intended contract — update it in the same change that
adds/modifies an endpoint. If code and this doc disagree, the code is
probably right and this doc is stale; fix whichever is wrong.

## Auth — `/api/auth`

Email+password is the frontend's only reachable sign-in flow right now —
phone+OTP still exists here and works exactly as before, but the frontend
dropped its own UI for it "for now" (see frontend's WelcomeScreen doc
comment); re-adding that UI needs no backend work.

| Method | Path | Auth? | Body | Notes |
|--------|------|-------|------|-------|
| POST | `/otp/request` | No | `{ phone }` | Generates + sends OTP. Rate-limited. Returns `{ success: true }` (dev env also echoes the code — see ARCHITECTURE.md). |
| POST | `/otp/verify` | No | `{ phone, code }` | Verifies code; finds-or-creates user (seeding default categories if new); returns `{ user, token, isNewUser }` — the frontend uses `isNewUser` to decide whether to show the optional "tell us your name" prompt. |
| POST | `/signup/email` | No | `{ email, password, name? }` | Creates a user the same way as the OTP path (seeds default categories). 409 if the email is already registered. Best-effort sends a verification email (see `/verify-email` below) — signup still succeeds even if that send fails. |
| POST | `/login/email` | No | `{ email, password }` | 401 on either a wrong email or wrong password — never reveals which, to avoid leaking whether an email is registered. |
| POST | `/verify-email/resend` | Yes | — | Sends a fresh 6-digit code to the current user's email. Rate-limited. |
| POST | `/verify-email` | Yes | `{ code }` | Verifies the code, sets `user.emailVerified = true`, returns `{ user }`. Not a login gate (see auth.service.js's class-level note) — an unverified account can use the app fully; this is a one-time confirmation whenever the user gets to it. |
| POST | `/password/forgot` | No | `{ email }` | Sends a 6-digit reset code if that email has a password-based account. Always returns `{ success: true }` regardless — including for an unregistered email or a send failure — so this can never be used to check which emails are registered. |
| POST | `/password/reset` | No | `{ email, code, newPassword }` | Verifies the code and sets the new password. |
| POST | `/password/change` | Yes | `{ currentPassword, newPassword }` | Settings → Account's "Change password" — proves ownership via the current password instead of an emailed code, unlike `/password/reset`. 401 if `currentPassword` is wrong; 400 if the account has no password to change (a phone-only account). |
| GET | `/me` | Yes | — | Returns current user profile. |
| PATCH | `/me` | Yes | `{ name?, avatar?, monthlyReportEnabled? }` | Partial profile update — used for profile edits and the Settings monthly-report toggle. No `email` — an account's email is fixed once set (it's the verified login identity), not an editable contact-info field. `avatar` must be one of `AVATAR_KEYS` (`constants/avatarPresets.js`) — a key, not the image itself; the frontend maps it to a bundled illustration. |
| DELETE | `/me` | Yes | — | Deletes account + cascades delete of the user's expenses and categories. Store-compliance requirement, not optional. |

## Public — `/api/public`

No auth — reached from outside the app (a link in an email), not called
by the frontend.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/unsubscribe/:token` | Turns off `monthlyReportEnabled` for whichever user owns that `unsubscribeToken` (see DATABASE.md's `users` table). Returns a plain HTML confirmation page, not JSON — for a person opening the link directly in a browser. Silently no-ops for an unknown/already-used token. |
| POST | `/unsubscribe/:token` | Same effect, no body/content back — this is what Gmail/Outlook's own native one-click "Unsubscribe" button hits automatically (RFC 8058's `List-Unsubscribe-Post`, set on every monthly report email — see mailer.util.js), not something the frontend or a person calls directly. |

## Expenses — `/api/expenses`

All routes require auth; all queries are implicitly scoped to `req.userId` —
a user can never see/modify another user's expenses.

| Method | Path | Body / Query | Notes |
|--------|------|---------------|-------|
| POST | `/` | `{ amount, description, categoryId, date? }` | `date` defaults to now if omitted. |
| GET | `/` | query: `from?, to?, categoryId?, categoryIds?, q?, page?, limit?` | List, most recent first. Date range optional (unbounded if omitted); `from` inclusive, `to` **exclusive** — `[from, to)`, matching every other range in this API. `categoryIds` (used by the Search screen's multi-select Filters sheet) is a comma-separated list of ids, matched with `$in`; takes precedence over `categoryId` (singular, still used by single-category call sites like DayTile's per-day fetch) if both are somehow sent. `q` (used by the Search screen's text box) matches `description` as a case-insensitive partial string, OR `amount` as an **exact** number if `q` parses as one — both conditions OR'd together, so "500" finds every ₹500 expense *and* any description containing "500". Composes with every other filter (all combine with AND). Response items have `category` populated (`{id, name, icon, color}`), not just the raw id. Response also includes `totalAmount`: the sum of `amount` across **every** matching document for the current filter (not just the current page) — powers the Search screen's running total, which needs to be correct without loading every page. |
| GET | `/daily-summary` | `from?, to?, categoryId?, categoryIds?, page?, limit?` (default 15, max 60) | Powers Home's collapsible day-tiles (no filters — full history): one row per calendar day with an expense, `{date, total, count}`, newest first. Paginated by **number of days**, not number of expenses, so a page boundary never splits one day's total. Expand a tile client-side by calling the plain list endpoint above with that day as `{from, to}`. Also powers the Search screen's grouped-by-day results view (shown when a date and/or category filter is active but no text query) — `from`/`to`/`categoryId`/`categoryIds` (all optional, same conventions as the plain list endpoint) scope the whole summary. Response also includes `totalAmount`: the sum across **every** matching day, not just the current page — same reasoning as the plain list endpoint's `totalAmount`. |
| GET | `/:id` | — | Single expense, `category` populated. |
| PUT | `/:id` | `{ amount?, description?, categoryId?, date? }` | Partial update. |
| DELETE | `/:id` | — | |

## Categories — `/api/categories`

All routes require auth and are scoped to the current user.

| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET | `/` | — | List the user's categories. |
| POST | `/` | `{ name, icon, color }` | `icon`/`color` must be from the curated sets in `frontend/docs/DESIGN_SYSTEM.md`. |
| PUT | `/:id` | `{ name?, icon?, color? }` | |
| DELETE | `/:id` | — | Reassigns that category's expenses to `Other`, then deletes. 400s if the target is `Other` itself (`isDeletable: false`). |

## Analytics — `/api/analytics`

| Method | Path | Query | Notes |
|--------|------|-------|-------|
| GET | `/summary` | `period=day\|week\|month\|year`, `anchor?` (ISO date, defaults to today) | Returns `{ period, range: {start,end}, total, byCategory: [{category: {id,name,icon,color}, total, count}] }`. |
| GET | `/trend` | `period=week\|month\|year` | Returns a time-bucketed series (e.g. daily totals across the selected month) for charting — bucket size depends on `period`. |

## Export — `/api/export`

| Method | Path | Query | Notes |
|--------|------|-------|-------|
| GET | `/xlsx` | `from?, to?, categoryId?, label?` | Same filters as expense list (`to` exclusive). Returns a styled `.xlsx` workbook (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) with `Content-Disposition: attachment`. One sheet: a title row, the expense table (`date, category, description, amount`) with a bolded total row beneath it, then a "By category" breakdown (`category, amount, % of total`). `label` (e.g. `"September 2026"`) is the human period label the Analytics screen already shows on-screen — reused verbatim as the sheet name (sanitized/truncated to Excel's 31-char, no-`: \ / ? * [ ]` limit) and the filename; falls back to `"All expenses"` if omitted. |

## Conventions

- Success responses: `{ data: ... }` for single/collection payloads, or the
  resource directly for simple cases — pick one and be consistent once
  implementation starts (documented here once decided).
- Error responses: `{ error: { message, code? } }`, status code carries the
  HTTP semantics (400 validation, 401 unauthenticated, 403 forbidden, 404 not
  found, 409 conflict, 500 unexpected).
- Pagination (expense list): `page`/`limit` query params, response includes
  `{ page, limit, total }` alongside the data array.
