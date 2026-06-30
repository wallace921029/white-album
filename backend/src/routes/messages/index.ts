import { type FastifyPluginAsync } from 'fastify'
import { eq, desc } from 'drizzle-orm'
import { messages } from '../../db/schema'
import { toMessage } from '../../lib/serializers'

// 发表留言:内容必填、限长 1000 字。
const createSchema = {
  type: 'object',
  required: ['content'],
  additionalProperties: false,
  properties: {
    content: { type: 'string', minLength: 1, maxLength: 1000 }
  }
}

interface CreateBody {
  content: string
}

// 留言板路由,挂载到 /messages 前缀下。登录后即可查看和发表;删除限本人或管理员。
const messageRoutes: FastifyPluginAsync = async (fastify) => {
  const { db } = fastify

  // 列出留言:所有已登录家庭成员可见,按时间倒序。
  fastify.get('/', { preHandler: fastify.authenticate }, async () => {
    const rows = db.select().from(messages).orderBy(desc(messages.createdAt), desc(messages.id)).all()
    return { messages: rows.map(toMessage) }
  })

  // 发表留言。署名取当前登录用户昵称并冗余存库(authorName),
  // 这样即使日后账号被删,旧留言仍能显示是谁发的。
  fastify.post<{ Body: CreateBody }>('/', { preHandler: fastify.authenticate, schema: { body: createSchema } }, async (request, reply) => {
    const message = db.insert(messages).values({
      userId: request.user.id,
      authorName: request.user.displayName,
      content: request.body.content
    }).returning().get()
    reply.code(201)
    return { message: toMessage(message) }
  })

  // 删除留言:作者本人或管理员均可;其他人 403。
  fastify.delete<{ Params: { id: string } }>('/:id', { preHandler: fastify.authenticate }, async (request, reply) => {
    const id = Number(request.params.id)
    const message = db.select().from(messages).where(eq(messages.id, id)).get()
    if (!message) throw fastify.httpErrors.notFound('留言不存在')

    const isOwner = message.userId === request.user.id
    const isAdmin = request.user.role === 'admin'
    if (!isOwner && !isAdmin) throw fastify.httpErrors.forbidden('只能删除自己的留言')

    db.delete(messages).where(eq(messages.id, id)).run()
    reply.code(204)
  })
}

export default messageRoutes
