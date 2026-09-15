# API Reference

Base path: `/api`. All request/response bodies are JSON. Authenticated routes
require `Authorization: Bearer <jwt>`.

This doc describes the intended contract — update it in the same change that
adds/modifies an endpoint. If code and this doc disagree, the code is
probably right and this doc is stale; fix whichever is wrong.

## Auth — `/api/auth`

v1 is OTP-only — signup and login are the same flow (email/password is
schema-ready for later but has no endpoints yet, see DATABASE.md).

| Method | Path | Auth? | Body | Notes |
|--------|------|-------|------|-------|
| POST | `/otp/request` | No | `{ phone }` | Generates + sends OTP. Rate-limited. Returns `{ success: true }` (dev env also echoes the code — see ARCHITECTURE.md). |
| POST | `/otp/verify` | No | `{ phone, code }` | Verifies code; finds-or-creates user (seeding default categories if new); returns `{ user, token }`. |
| GET | `/me` | Yes | — | Returns current user profile. |
| DELETE | `/me` | Yes | — | Deletes account + cascades delete of the user's expenses and categories. Store-compliance requirement, not optional. |

## Expenses — `/api/expenses`

All routes require auth; all queries are implicitly scoped to `req.userId` —
a user can never see/modify another user's expenses.

| Method | Path | Body / Query | Notes |
|--------|------|---------------|-------|
| POST | `/` | `{ amount, description, categoryId, date? }` | `date` defaults to now if omitted. |
| GET | `/` | query: `from?, to?, categoryId?, page?, limit?` | List, most recent first. Date range optional (unbounded if omitted). Response items have `category` populated (`{id, name, icon, color}`), not just the raw id. |
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
| GET | `/csv` | `from?, to?, category?` | Same filters as expense list. Returns `text/csv` with `Content-Disposition: attachment`. Columns: `date, category, description, amount`. |

## Conventions

- Success responses: `{ data: ... }` for single/collection payloads, or the
  resource directly for simple cases — pick one and be consistent once
  implementation starts (documented here once decided).
- Error responses: `{ error: { message, code? } }`, status code carries the
  HTTP semantics (400 validation, 401 unauthenticated, 403 forbidden, 404 not
  found, 409 conflict, 500 unexpected).
- Pagination (expense list): `page`/`limit` query params, response includes
  `{ page, limit, total }` alongside the data array.
