# Admin User Management — Design

Date: 2026-07-02

## Purpose

The admin module currently manages photos, notices, and invite codes, but has no way to view or manage the family member accounts themselves (`users` table). This adds a "成员管理" (User Management) page to the admin module so an admin can see all accounts and edit them without touching the database directly.

## Scope

- View all users (id, username, displayName, role, createdAt).
- Edit a user's displayName.
- Change a user's role (admin ↔ member).
- Reset a user's password (admin sets a new one directly, no old-password check).
- Delete a user account.
- Guard rail: the system must always retain at least one admin. Demoting or deleting the last remaining admin is rejected with `409`. No other self-service restriction (an admin may demote/delete themselves if another admin exists).

Out of scope: username changes (usernames are immutable login identifiers), self-registration changes, audit logging of admin actions.

## Backend

New route file `backend/src/routes/users/index.ts`, autoloaded at prefix `/users`. Entire group requires `fastify.authorizeAdmin` (same pattern as `routes/invites/index.ts`).

### `GET /users` · 管理员

Lists all users ordered by `createdAt` ascending, using the existing `toUser` serializer (id, username, displayName, role, createdAt — passwordHash never included).

Response: `{ "users": [...] }`

### `PATCH /users/:id` · 管理员

Body (all optional, at least one required — same "no fields → 400" convention used by `PATCH /photos/:id` and `PATCH /notices/:id`):

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `displayName` | string | 1–32 位 |
| `role` | `"admin"` \| `"member"` | enum |
| `password` | string | 6–128 位 |

Behavior:
- If `password` is present, hash it with the existing `hashPassword` (scrypt) helper and update `passwordHash`.
- If `role` is present and is changing an `admin` to `member`, first check: is this user the only admin in the table? If so, throw `409` ("至少需要保留一名管理员") and make no changes.
- If `displayName` present, update it.
- Returns updated user via `toUser`: `{ "user": {...} }`.
- `404` if the user id doesn't exist.

### `DELETE /users/:id` · 管理员

- If the target user is currently the only admin, throw `409` ("至少需要保留一名管理员").
- Otherwise delete the row. Existing FK `onDelete: set null` on `photos.uploadedBy`, `messages.userId`, `inviteCodes.createdBy`/`usedBy` already handles orphaned references — no additional cleanup code needed. `messages.authorName` is a redundant snapshot column, so historical messages keep showing the deleted user's display name.
- `404` if not found. Success: `204`.

### Last-admin check helper

Both PATCH (role→member) and DELETE need the same check: count rows where `role = 'admin'`; if the target is one of them and the count is 1, reject. Implement as a small local helper function in the route file (not a new shared module — this is the only place it's needed).

### Docs

Add the three new endpoints to `backend/doc/api.md` (接口一览 table + a new "用户 Users" section), following the existing doc conventions (request/response JSON examples, error table).

## Frontend

New file `src/admin/Users.tsx`, structurally modeled on `src/admin/Invites.tsx` (same header/table/card visual style, same axios + localStorage-token pattern, same `alert()`-based error handling — no toast library is in use here).

### Table

Columns: 昵称 (displayName), 用户名 (username, monospace like invite codes), 角色 (Badge — 管理员/成员, styled like the existing used/unused invite badges), 注册时间 (createdAt, `toLocaleString('zh-CN')`), 操作.

### Row actions

- **编辑** button opens a `Dialog` (shadcn) with a displayName `Input` and a role `Select` (管理员/成员), pre-filled with current values. Submits via `PATCH /users/:id` with only the changed field(s).
- **重置密码** button opens a separate `Dialog` with a single new-password `Input` (type password, min 6 chars enforced client-side same as registration). Submits via `PATCH /users/:id` with `{ password }`.
- **删除** button, same `window.confirm(...)` pattern as `Invites.tsx`'s delete, then `DELETE /users/:id`.
- On any `409` (last-admin guard) or other error, `alert()` the message from `err.response?.data?.message` if present, else a generic fallback — matching how other admin pages surface backend error messages.

### Wiring

- `src/admin/AdminLayout.tsx`: add nav item `{ to: '/admin/users', label: '成员管理', icon: Users }` (lucide `Users` icon) after 邀请码管理.
- `src/App.tsx`: add `<Route path="users" element={<Users />} />` under the `/admin` route, import `Users` from `./admin/Users`.
- `src/admin/Dashboard.tsx`: add a stat card "家庭成员" showing total user count, fetched via `GET /users`, navigating to `/admin/users` on click (same pattern as the other three stat cards).

## Testing

- Backend: new `backend/test/routes/users.test.ts` following the existing test style (in-memory DB via `test/helper.ts`). Cover: list requires admin; PATCH displayName; PATCH role member→admin; PATCH role admin→member blocked when it's the last admin (409) and allowed when another admin exists; PATCH password actually changes login credentials (verify old password rejected, new one accepted); DELETE blocked on last admin; DELETE succeeds and orphaned photo/message rows keep `null` FK with preserved `authorName`.
- Frontend: no test framework in this repo (per CLAUDE.md) — verify manually by running both dev servers and exercising the page in-browser (list loads, edit, role change, password reset + re-login, delete, and the last-admin 409 surfaces as an alert).
