import { type FastifyPluginAsync } from 'fastify'
import { randomBytes } from 'node:crypto'
import { eq, desc } from 'drizzle-orm'
import { inviteCodes, users } from '../../db/schema'
import { toInvite } from '../../lib/serializers'

// 邀请码管理路由,挂载到 /invites 前缀下。仅管理员可用。
const inviteRoutes: FastifyPluginAsync = async (fastify) => {
  const { db } = fastify

  // 整个路由组统一加管理员鉴权:任何 /invites 请求先过 authorizeAdmin。
  fastify.addHook('preHandler', fastify.authorizeAdmin)

  // 列出全部邀请码(含使用状态)。LEFT JOIN 取出使用者昵称用于展示。
  fastify.get('/', async () => {
    const rows = db.select({
      id: inviteCodes.id,
      code: inviteCodes.code,
      usedBy: inviteCodes.usedBy,
      usedAt: inviteCodes.usedAt,
      createdAt: inviteCodes.createdAt,
      usedByName: users.displayName
    })
      .from(inviteCodes)
      .leftJoin(users, eq(users.id, inviteCodes.usedBy))
      .orderBy(desc(inviteCodes.createdAt), desc(inviteCodes.id))
      .all()
    return { invites: rows.map(toInvite) }
  })

  // 生成一个新邀请码(10 位十六进制随机串)。
  fastify.post('/', async (request, reply) => {
    let code: string | null = null
    // 碰撞概率极低,仍最多重试 5 次以防万一(UNIQUE 约束兜底)。
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = randomBytes(5).toString('hex')
      const clash = db.select({ id: inviteCodes.id }).from(inviteCodes).where(eq(inviteCodes.code, candidate)).get()
      if (!clash) {
        code = candidate
        break
      }
    }
    if (!code) throw fastify.httpErrors.internalServerError('生成邀请码失败,请重试')

    const invite = db.insert(inviteCodes).values({ code, createdBy: request.user.id }).returning().get()
    reply.code(201)
    return { invite: toInvite(invite) }
  })

  // 作废(删除)一个尚未使用的邀请码。已使用的不允许删除,保留使用记录。
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const id = Number(request.params.id)
    const invite = db.select().from(inviteCodes).where(eq(inviteCodes.id, id)).get()
    if (!invite) throw fastify.httpErrors.notFound('邀请码不存在')
    if (invite.usedBy !== null) throw fastify.httpErrors.conflict('邀请码已被使用,无法删除')
    db.delete(inviteCodes).where(eq(inviteCodes.id, id)).run()
    reply.code(204)
  })
}

export default inviteRoutes
