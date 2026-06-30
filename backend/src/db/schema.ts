import { sqliteTable, integer, text, unique } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Drizzle 数据库 schema。这里定义的表结构是唯一事实来源:
//   - 类型由各表的 $inferSelect 自动推导(见文件末尾导出),路由层直接复用;
//   - 迁移 SQL 由 drizzle-kit 依据本文件生成(npm run db:generate),启动时自动应用。
// 字段命名用 camelCase(TS 侧),通过 text('snake_case') 映射到数据库列名,
// 因此查询结果天然是 camelCase,无需再手动转换。

// 所有时间列默认取 SQLite 的 datetime('now')(UTC,'YYYY-MM-DD HH:MM:SS')。
const now = sql`(datetime('now'))`

// 家庭成员账号。role 用字符串枚举区分管理员 / 普通成员。
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
  createdAt: text('created_at').notNull().default(now)
})

// 邀请码。member 注册时凭码;usedBy 记录被谁用掉(一次性)。
// 外键 ON DELETE SET NULL:删除用户不会连带删除邀请记录,只断开关联。
export const inviteCodes = sqliteTable('invite_codes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  usedBy: integer('used_by').references(() => users.id, { onDelete: 'set null' }),
  usedAt: text('used_at'),
  createdAt: text('created_at').notNull().default(now)
})

// 照片元信息。真实文件存磁盘(uploadDir),这里只存文件名;sortOrder 决定轮播顺序。
export const photos = sqliteTable('photos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filename: text('filename').notNull(),
  originalName: text('original_name'),
  caption: text('caption').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  uploadedBy: integer('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().default(now)
})

// 通知公告。pinned 用 integer + mode:'boolean',读写自动在 0/1 与 boolean 间转换。
export const notices = sqliteTable('notices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().default(now),
  updatedAt: text('updated_at').notNull().default(now)
})

// 留言。authorName 在发表时冗余保存,作者账号被删后(userId 变 null)仍能显示署名。
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  authorName: text('author_name').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull().default(now)
})

// 各表的"查询结果"类型,供路由与序列化层复用。
export type User = typeof users.$inferSelect
export type Photo = typeof photos.$inferSelect
export type Notice = typeof notices.$inferSelect
export type Message = typeof messages.$inferSelect
export type InviteCode = typeof inviteCodes.$inferSelect

// 通知已读记录
export const noticeReads = sqliteTable('notice_reads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  noticeId: integer('notice_id').notNull().references(() => notices.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(now)
}, (t) => ({
  unq: unique().on(t.userId, t.noticeId)
}))

export type NoticeRead = typeof noticeReads.$inferSelect
