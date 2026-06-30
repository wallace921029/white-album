# White Album 后端 API 文档

家庭相册通知中心的后端接口。前端(iPad Safari 为主)登录后可查看照片轮播、通知、发表留言;管理员可编辑照片与通知、管理邀请码。

- 技术栈:Fastify 5 + `node:sqlite`
- 默认端口:`3000`
- 数据格式:除文件上传外,请求与响应均为 `application/json; charset=utf-8`

---

## 目录

- [认证与鉴权](#认证与鉴权)
- [统一约定](#统一约定)
- [错误格式](#错误格式)
- [接口一览](#接口一览)
- [认证 Auth](#认证-auth)
- [邀请码 Invites](#邀请码-invites)
- [照片 Photos](#照片-photos)
- [通知 Notices](#通知-notices)
- [留言 Messages](#留言-messages)
- [静态文件](#静态文件)
- [数据模型](#数据模型)

---

## 认证与鉴权

- 采用 **JWT**,登录/注册成功后返回 `token`。
- 受保护接口需在请求头携带:`Authorization: Bearer <token>`。
- 前端建议把 `token` 存于 `localStorage`(不依赖 Cookie,规避 iPad Safari 的 ITP 限制)。
- Token 默认有效期 30 天(`JWT_EXPIRES_IN` 可配)。

**角色与权限**

| 角色 | 说明 |
| --- | --- |
| `admin` | 管理员。可编辑照片、通知,管理邀请码。系统第一个注册的用户自动成为管理员。 |
| `member` | 普通家庭成员。可查看内容、发表留言、删除自己的留言。 |

**注册规则(重要)**

- 系统中**还没有任何用户**时,第一次注册**无需邀请码**,且该用户成为 `admin`。
- 之后所有注册**必须携带有效且未使用的邀请码**,注册的用户为 `member`。
- 邀请码由管理员通过 [`POST /invites`](#生成邀请码) 生成,一次性使用。

**鉴权层级**

| 标记 | 含义 |
| --- | --- |
| 公开 | 无需 token |
| 登录 | 需要任意有效 token(`admin` 或 `member`) |
| 管理员 | 需要 `admin` 的 token |
| 本人或管理员 | 资源作者本人或 `admin` |

---

## 统一约定

- 列表/单条资源均包裹在具名字段中,例如 `{ "photos": [...] }`、`{ "notice": {...} }`,方便前端类型区分与未来扩展。
- 时间字段为 UTC 字符串,格式 `YYYY-MM-DD HH:MM:SS`(SQLite `datetime('now')`)。
- 字段命名对外统一为 camelCase。
- 删除类接口成功返回 `204 No Content`(无响应体)。

---

## 错误格式

错误使用标准 HTTP 状态码,响应体为 Fastify 默认结构:

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "请先登录"
}
```

常见状态码:

| 状态码 | 含义 | 典型场景 |
| --- | --- | --- |
| `400` | Bad Request | 参数缺失/格式错误、缺邀请码、邀请码无效或已用、无可更新字段 |
| `401` | Unauthorized | 未登录、token 失效、用户名或密码错误 |
| `403` | Forbidden | 已登录但权限不足(非管理员 / 非本人) |
| `404` | Not Found | 资源不存在 |
| `409` | Conflict | 用户名已存在、删除已使用的邀请码 |
| `413` | Payload Too Large | 上传图片超过大小上限 |
| `415` | Unsupported Media Type | 上传的不是图片 |

---

## 接口一览

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/` | 公开 | 服务标识 |
| GET | `/health` | 公开 | 健康检查 |
| POST | `/auth/register` | 公开 | 注册(首个用户免邀请码且为管理员) |
| POST | `/auth/login` | 公开 | 登录 |
| GET | `/auth/me` | 登录 | 当前用户信息 |
| GET | `/invites` | 管理员 | 邀请码列表 |
| POST | `/invites` | 管理员 | 生成邀请码 |
| DELETE | `/invites/:id` | 管理员 | 删除未使用的邀请码 |
| GET | `/photos` | 登录 | 照片列表(轮播顺序) |
| GET | `/photos/:id` | 登录 | 单张照片 |
| POST | `/photos` | 管理员 | 上传照片(multipart) |
| PATCH | `/photos/:id` | 管理员 | 修改说明/排序 |
| DELETE | `/photos/:id` | 管理员 | 删除照片 |
| GET | `/notices` | 登录 | 通知列表 |
| GET | `/notices/:id` | 登录 | 单条通知 |
| POST | `/notices` | 管理员 | 新建通知 |
| PATCH | `/notices/:id` | 管理员 | 编辑通知 |
| DELETE | `/notices/:id` | 管理员 | 删除通知 |
| GET | `/messages` | 登录 | 留言列表 |
| POST | `/messages` | 登录 | 发表留言 |
| DELETE | `/messages/:id` | 本人或管理员 | 删除留言 |
| GET | `/uploads/*` | 公开 | 照片静态文件 |

---

## 认证 Auth

### 注册

`POST /auth/register` · 公开

请求体:

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `username` | string | 是 | 3–32 位,仅 `字母 数字 _ . -` |
| `password` | string | 是 | 6–128 位 |
| `displayName` | string | 是 | 1–32 位,展示昵称 |
| `inviteCode` | string | 否* | 非首个用户必填 |

\* 系统首个用户注册时不需要 `inviteCode`;之后必填。

请求示例(首个用户):

```bash
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"dad","password":"secret1","displayName":"爸爸"}'
```

成功响应 `201`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "dad",
    "displayName": "爸爸",
    "role": "admin",
    "createdAt": "2026-06-30 07:23:51"
  }
}
```

错误:`400`(缺/无效/已用邀请码)、`409`(用户名已存在)。

---

### 登录

`POST /auth/login` · 公开

请求体:

| 字段 | 类型 | 必填 |
| --- | --- | --- |
| `username` | string | 是 |
| `password` | string | 是 |

请求示例:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"dad","password":"secret1"}'
```

成功响应 `200`:结构同注册(`{ token, user }`)。

错误:`401`(用户名或密码错误,出于安全不区分二者)。

---

### 获取当前用户

`GET /auth/me` · 登录

请求示例:

```bash
curl http://localhost:3000/auth/me -H "Authorization: Bearer $TOKEN"
```

成功响应 `200`:

```json
{ "user": { "id": 1, "username": "dad", "displayName": "爸爸", "role": "admin", "createdAt": "2026-06-30 07:23:51" } }
```

错误:`401`。

---

## 邀请码 Invites

> 全部需要管理员权限。

### 邀请码列表

`GET /invites` · 管理员

成功响应 `200`:

```json
{
  "invites": [
    {
      "id": 2,
      "code": "a1b2c3d4e5",
      "used": true,
      "usedBy": 3,
      "usedByName": "妈妈",
      "usedAt": "2026-06-30 08:00:00",
      "createdAt": "2026-06-30 07:50:00"
    }
  ]
}
```

### 生成邀请码

`POST /invites` · 管理员 · 无请求体

成功响应 `201`:

```json
{ "invite": { "id": 3, "code": "f6a7b8c9d0", "used": false, "usedBy": null, "usedByName": null, "usedAt": null, "createdAt": "2026-06-30 09:00:00" } }
```

### 删除邀请码

`DELETE /invites/:id` · 管理员

仅能删除**未使用**的邀请码。

- 成功:`204`
- 错误:`404`(不存在)、`409`(已被使用)

---

## 照片 Photos

### 照片列表

`GET /photos` · 登录

按 `sortOrder` 升序(即轮播顺序)返回。

成功响应 `200`:

```json
{
  "photos": [
    {
      "id": 1,
      "url": "/uploads/3f1c9a8e-....png",
      "caption": "全家福",
      "sortOrder": 0,
      "originalName": "a.png",
      "createdAt": "2026-06-30 09:10:00"
    }
  ]
}
```

> `url` 为相对路径,前端需拼接后端 origin:`<API_BASE>/uploads/...`。

### 单张照片

`GET /photos/:id` · 登录 → `{ "photo": {...} }`,不存在返回 `404`。

### 上传照片

`POST /photos` · 管理员 · `multipart/form-data`

表单字段:

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `file` | file | 是 | 图片文件(`image/*`) |
| `caption` | text | 否 | 照片说明,≤500 字 |

- 文件名落盘时会被替换为随机 UUID + 推断扩展名。
- 新照片的 `sortOrder` 自动取当前最大值 +1(排到末尾)。
- 单文件大小上限默认 25MB(`MAX_UPLOAD_BYTES` 可配)。

请求示例:

```bash
curl -X POST http://localhost:3000/photos \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/photo.jpg" \
  -F "caption=全家福"
```

成功响应 `201`:`{ "photo": {...} }`

错误:`400`(缺文件)、`415`(非图片)、`413`(过大)。

### 修改照片

`PATCH /photos/:id` · 管理员

请求体(至少传一个字段):

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `caption` | string | 说明,≤500 字 |
| `sortOrder` | integer | 轮播排序值 |

成功响应 `200`:`{ "photo": {...} }`

错误:`400`(无可更新字段)、`404`。

### 删除照片

`DELETE /photos/:id` · 管理员 → `204`(同时删除磁盘文件);不存在返回 `404`。

---

## 通知 Notices

### 通知列表

`GET /notices` · 登录

置顶优先,其次按创建时间倒序。

成功响应 `200`:

```json
{
  "notices": [
    {
      "id": 1,
      "title": "家庭聚会",
      "content": "周日中午12点老地方",
      "pinned": true,
      "createdAt": "2026-06-30 09:20:00",
      "updatedAt": "2026-06-30 09:20:00"
    }
  ]
}
```

### 单条通知

`GET /notices/:id` · 登录 → `{ "notice": {...} }`,不存在返回 `404`。

### 新建通知

`POST /notices` · 管理员

请求体:

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `title` | string | 是 | 1–200 字 |
| `content` | string | 否 | ≤5000 字,默认空 |
| `pinned` | boolean | 否 | 是否置顶,默认 `false` |

成功响应 `201`:`{ "notice": {...} }`

### 编辑通知

`PATCH /notices/:id` · 管理员

请求体:`title` / `content` / `pinned` 均可选,至少传一个。会刷新 `updatedAt`。

成功响应 `200`:`{ "notice": {...} }`

错误:`400`(无可更新字段)、`404`。

### 删除通知

`DELETE /notices/:id` · 管理员 → `204`;不存在返回 `404`。

---

## 留言 Messages

### 留言列表

`GET /messages` · 登录

按时间倒序。

成功响应 `200`:

```json
{
  "messages": [
    {
      "id": 5,
      "userId": 3,
      "authorName": "妈妈",
      "content": "想念大家",
      "createdAt": "2026-06-30 10:00:00"
    }
  ]
}
```

> `authorName` 在发表时冗余保存;即使作者账号被删,留言仍显示原署名(此时 `userId` 为 `null`)。

### 发表留言

`POST /messages` · 登录

请求体:

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `content` | string | 是 | 1–1000 字 |

署名自动取当前登录用户昵称,无需在请求体中传。

成功响应 `201`:`{ "message": {...} }`

### 删除留言

`DELETE /messages/:id` · 本人或管理员

- 成功:`204`
- 错误:`403`(既非作者本人也非管理员)、`404`

---

## 静态文件

`GET /uploads/<filename>` · 公开

照片原图通过该路径提供。照片接口返回的 `url` 字段即形如 `/uploads/<uuid>.jpg`,前端拼接后端 origin 后即可加载。

---

## 数据模型

> 对外返回的字段(camelCase),底层 SQLite 表见 `plugins/db.js`。

**User**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 主键 |
| `username` | string | 登录名(唯一) |
| `displayName` | string | 展示昵称 |
| `role` | `"admin"` \| `"member"` | 角色 |
| `createdAt` | string | 创建时间 |

> 密码哈希(scrypt)绝不对外返回。

**Photo**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 主键 |
| `url` | string | 静态访问路径 `/uploads/...` |
| `caption` | string | 说明 |
| `sortOrder` | number | 轮播排序(升序) |
| `originalName` | string \| null | 上传时原文件名 |
| `createdAt` | string | 上传时间 |

**Notice**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 主键 |
| `title` | string | 标题 |
| `content` | string | 正文 |
| `pinned` | boolean | 是否置顶 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 最后更新时间 |

**Message**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 主键 |
| `userId` | number \| null | 作者用户 id(账号删除后为 null) |
| `authorName` | string | 作者昵称(冗余保存) |
| `content` | string | 内容 |
| `createdAt` | string | 发表时间 |

**Invite**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 主键 |
| `code` | string | 邀请码 |
| `used` | boolean | 是否已被使用 |
| `usedBy` | number \| null | 使用者用户 id |
| `usedByName` | string \| null | 使用者昵称 |
| `usedAt` | string \| null | 使用时间 |
| `createdAt` | string | 创建时间 |
