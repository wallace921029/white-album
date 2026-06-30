import { type FastifyPluginAsync } from 'fastify'
import { eq, desc, sql } from 'drizzle-orm'
import { notices, noticeReads, users } from '../../db/schema'
import { toNotice } from '../../lib/serializers'

// 创建通知:标题必填,正文与置顶可选。
const createSchema = {
  type: 'object',
  required: ['title'],
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 200 },
    content: { type: 'string', maxLength: 5000 },
    pinned: { type: 'boolean' }
  }
}

// 更新通知:全部字段可选(部分更新)。
const updateSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 200 },
    content: { type: 'string', maxLength: 5000 },
    pinned: { type: 'boolean' }
  }
}

interface CreateBody {
  title: string
  content?: string
  pinned?: boolean
}

type UpdateBody = Partial<CreateBody>

// 通知公告路由,挂载到 /notices 前缀下。查看需登录,增删改需管理员。
const noticeRoutes: FastifyPluginAsync = async (fastify) => {
  const { db } = fastify

  // 列出通知:置顶优先,其次按创建时间倒序。同时关联当前用户的已读状态，并返回所有已读用户列表
  fastify.get('/', { preHandler: fastify.authenticate }, async (request) => {
    const userId = request.user.id
    
    // 获取每条通知的已读用户列表
    const allReads = db.select({
      noticeId: noticeReads.noticeId,
      userId: users.id,
      displayName: users.displayName
    })
    .from(noticeReads)
    .innerJoin(users, eq(noticeReads.userId, users.id))
    .all()

    const noticeReadsMap: Record<number, { id: number, displayName: string }[]> = {}
    for (const r of allReads) {
      if (!noticeReadsMap[r.noticeId]) {
        noticeReadsMap[r.noticeId] = []
      }
      noticeReadsMap[r.noticeId].push({ id: r.userId, displayName: r.displayName })
    }

    const rows = db.select({
      notice: notices,
      read: sql<boolean>`CASE WHEN ${noticeReads.id} IS NOT NULL THEN 1 ELSE 0 END`
    })
    .from(notices)
    .leftJoin(noticeReads, sql`${notices.id} = ${noticeReads.noticeId} AND ${noticeReads.userId} = ${userId}`)
    .orderBy(desc(notices.pinned), desc(notices.createdAt), desc(notices.id))
    .all()

    return { 
      notices: rows.map(r => ({
        ...toNotice(r.notice),
        read: Boolean(r.read),
        readBy: noticeReadsMap[r.notice.id] || []
      })) 
    }
  })

  // 标记通知为已读 (登录用户)。
  fastify.post<{ Params: { id: string } }>('/:id/read', { preHandler: fastify.authenticate }, async (request, reply) => {
    const id = Number(request.params.id)
    const notice = db.select().from(notices).where(eq(notices.id, id)).get()
    if (!notice) throw fastify.httpErrors.notFound('通知不存在')

    // 记录已读，若已存在则忽略
    db.insert(noticeReads)
      .values({
        userId: request.user.id,
        noticeId: id
      })
      .onConflictDoNothing()
      .run()

    // 自动取消置顶
    db.update(notices)
      .set({ pinned: false })
      .where(eq(notices.id, id))
      .run()

    reply.code(204)
  })

  // 获取单条通知。
  fastify.get<{ Params: { id: string } }>('/:id', { preHandler: fastify.authenticate }, async (request) => {
    const notice = db.select().from(notices).where(eq(notices.id, Number(request.params.id))).get()
    if (!notice) throw fastify.httpErrors.notFound('通知不存在')
    return { notice: toNotice(notice) }
  })

  // 新建通知(管理员)。
  fastify.post<{ Body: CreateBody }>('/', { preHandler: fastify.authorizeAdmin, schema: { body: createSchema } }, async (request, reply) => {
    const { title, content = '', pinned = false } = request.body
    const notice = db.insert(notices).values({
      title,
      content,
      pinned,
      createdBy: request.user.id
    }).returning().get()
    reply.code(201)
    return { notice: toNotice(notice) }
  })

  // 编辑通知(管理员)。只更新传入字段,并刷新 updatedAt。
  fastify.patch<{ Params: { id: string }, Body: UpdateBody }>('/:id', { preHandler: fastify.authorizeAdmin, schema: { body: updateSchema } }, async (request) => {
    const id = Number(request.params.id)
    const notice = db.select().from(notices).where(eq(notices.id, id)).get()
    if (!notice) throw fastify.httpErrors.notFound('通知不存在')

    const { title, content, pinned } = request.body
    const updates: Partial<typeof notices.$inferInsert> = {}
    if (title !== undefined) updates.title = title
    if (content !== undefined) updates.content = content
    if (pinned !== undefined) {
      updates.pinned = pinned
      if (pinned === true) {
        // 如果操作置顶，则自动恢复为未读状态
        db.delete(noticeReads).where(eq(noticeReads.noticeId, id)).run()
      }
    }
    if (Object.keys(updates).length === 0) throw fastify.httpErrors.badRequest('没有需要更新的字段')

    // updatedAt 用 SQL 表达式刷新;放在 set 字面量里,drizzle 允许该列接受 SQL。
    const updated = db.update(notices)
      .set({ ...updates, updatedAt: sql`(datetime('now'))` })
      .where(eq(notices.id, id))
      .returning()
      .get()
    return { notice: toNotice(updated) }
  })

  // 删除通知(管理员)。
  fastify.delete<{ Params: { id: string } }>('/:id', { preHandler: fastify.authorizeAdmin }, async (request, reply) => {
    const id = Number(request.params.id)
    const notice = db.select().from(notices).where(eq(notices.id, id)).get()
    if (!notice) throw fastify.httpErrors.notFound('通知不存在')
    db.delete(notices).where(eq(notices.id, id)).run()
    reply.code(204)
  })
}

export default noticeRoutes
