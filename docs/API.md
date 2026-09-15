# API Reference

Base path: `/api`. All request/response bodies are JSON. Authenticated routes
require `Authorization: Bearer <jwt>`.

This doc describes the intended contract — update it in the same change that
adds/modifies an endpoint. If code and this doc disagree, the code is
probably right and this doc is stale; fix whichever is wrong.

## Auth — `/api/auth`

| Method | Path | Auth? | Body | Notes |
|--------|------|-------|------|-------|
| POST | `/signup/email` | No | `{ email, password, name? }` | Creates user, returns `{ user, token }`. |
| POST | `/login/email` | No | `{ email, password }` | Returns `{ user, token }`. |
| POST | `/otp/request` | No | `{ phone }` | Generates + sends OTP. Rate-limited. Returns `{ success: true }` (dev env also echoes the code — see ARCHITECTURE.md). |
| POST | `/otp/verify` | No | `{ phone, code }` | Verifies code; finds-or-creates user; returns `{ user, token }`. |
| GET | `/me` | Yes | — | Returns current user profile. |
| DELETE | `/me` | Yes | — | Deletes account + cascades delete of the user's expenses. Store-compliance requirement, not optional. |

## Expenses — `/api/expenses`

All routes require auth; all queries are implicitly scoped to `req.userId` —
a user can never see/modify another user's expenses.

| Method | Path | Body / Query | Notes |
|--------|------|---------------|-------|
| POST | `/` | `{ amount, description, category, date? }` | `date` defaults to now if omitted. |
| GET | `/` | query: `from?, to?, category?, page?, limit?` | List, most recent first. Date range optional (unbounded if omitted). |
| GET | `/:id` | — | Single expense. |
| PUT | `/:id` | `{ amount?, description?, category?, date? }` | Partial update. |
| DELETE | `/:id` | — | |

## Analytics — `/api/analytics`

| Method | Path | Query | Notes |
|--------|------|-------|-------|
| GET | `/summary` | `period=day\|week\|month\|year`, `anchor?` (ISO date, defaults to today) | Returns `{ period, range: {start,end}, total, byCategory: [{category, total, count}] }`. |
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
