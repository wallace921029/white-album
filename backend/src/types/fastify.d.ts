import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { FastifyRequest, FastifyReply } from 'fastify'
import type * as schema from '../db/schema'

// 全局类型增强:为 Fastify 实例和 JWT 载荷补上我们注入的属性,
// 这样路由里使用 fastify.db / fastify.authenticate / request.user 时都有完整类型。

type Role = 'admin' | 'member'

declare module 'fastify' {
  interface FastifyInstance {
    // 由 plugins/db.ts 注入:带 schema 的 drizzle 实例(同步 better-sqlite3 驱动)。
    db: BetterSQLite3Database<typeof schema>
    // 由 plugins/auth.ts 注入的两个鉴权 preHandler。
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    authorizeAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    // 由 plugins/app.ts 注入:上传目录及大小上限。
    uploadDir: string
    maxUploadBytes: number
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    // 签发 token 时写入的载荷。
    payload: { id: number, username: string, displayName: string, role: Role }
    // request.user 的类型(校验后从 token 解出)。
    user: { id: number, username: string, displayName: string, role: Role }
  }
}
