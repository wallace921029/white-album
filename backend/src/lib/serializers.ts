import type { User, Photo, Notice, Message } from '../db/schema'

// 序列化层:把数据库行转换成对外返回的 API 形状。
// Drizzle 查询结果已是 camelCase,所以这里的职责收窄为:
//   1. 隐藏敏感字段(用户的 passwordHash 永不返回);
//   2. 计算派生字段(照片的访问 url);
//   3. 明确"对外暴露哪些字段",避免无意中泄露内部列。

// 用户:刻意不返回 passwordHash。
export function toUser (row: User) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    createdAt: row.createdAt
  }
}

// 照片:把磁盘文件名拼成前端可直接访问的静态 URL。
export function toPhoto (row: Photo) {
  return {
    id: row.id,
    url: `/uploads/${row.filename}`,
    caption: row.caption,
    sortOrder: row.sortOrder,
    originalName: row.originalName,
    createdAt: row.createdAt
  }
}

// 通知:pinned 已由 schema(mode:'boolean')转成真正的 boolean。
export function toNotice (row: Notice) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    pinned: row.pinned,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

// 留言。
export function toMessage (row: Message) {
  return {
    id: row.id,
    userId: row.userId,
    authorName: row.authorName,
    content: row.content,
    createdAt: row.createdAt
  }
}

// 邀请码。入参用结构类型(而非 InviteCode),以兼容列表查询里 JOIN 出来的 usedByName。
export function toInvite (row: {
  id: number
  code: string
  usedBy: number | null
  usedByName?: string | null
  usedAt: string | null
  createdAt: string
}) {
  return {
    id: row.id,
    code: row.code,
    used: row.usedBy !== null,
    usedBy: row.usedBy,
    usedByName: row.usedByName ?? null,
    usedAt: row.usedAt,
    createdAt: row.createdAt
  }
}
