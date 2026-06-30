import { type FastifyPluginAsync } from 'fastify'
import { eq, count, sql } from 'drizzle-orm'
import { users, inviteCodes, type User } from '../../db/schema'
import { hashPassword, verifyPassword } from '../../lib/password'
import { toUser } from '../../lib/serializers'

// 注册请求体:用户名仅允许字母数字及 _.-,密码至少 6 位,昵称必填,inviteCode 可选。
const credentialsSchema = {
  type: 'object',
  required: ['username', 'password', 'displayName'],
  properties: {
    username: { type: 'string', minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_.-]+$' },
    password: { type: 'string', minLength: 6, maxLength: 128 },
    displayName: { type: 'string', minLength: 1, maxLength: 32 },
    inviteCode: { type: 'string', maxLength: 64 }
  }
}

const loginSchema = {
  type: 'object',
  required: ['username', 'password'],
  properties: {
    username: { type: 'string' },
    password: { type: 'string' }
  }
}

interface RegisterBody {
  username: string
  password: string
  displayName: string
  inviteCode?: string
}

interface LoginBody {
  username: string
  password: string
}

// 认证相关路由,自动挂载到 /auth 前缀下。
const authRoutes: FastifyPluginAsync = async (fastify) => {
  const { db } = fastify

  // 用用户行签发 JWT。载荷带上 displayName/role,后续接口直接用,无需每次回查库。
  function signToken (user: User): string {
    return fastify.jwt.sign({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    })
  }

  // 注册新成员。
  // 引导规则(解决"首个用户即管理员"与"邀请码注册"的先有鸡还是蛋问题):
  //   - 系统里还没有任何用户时,第一次注册无需邀请码,角色为 admin;
  //   - 之后所有注册必须携带有效且未使用的邀请码,角色为 member。
  fastify.post<{ Body: RegisterBody }>('/register', { schema: { body: credentialsSchema } }, async (request, reply) => {
    const { username, password, displayName, inviteCode } = request.body

    const userCount = db.select({ c: count() }).from(users).get()?.c ?? 0
    const isBootstrap = userCount === 0

    let invite: typeof inviteCodes.$inferSelect | undefined
    if (isBootstrap) {
      const bootstrapCode = process.env.BOOTSTRAP_INVITE_CODE
      if (bootstrapCode) {
        if (!inviteCode || inviteCode !== bootstrapCode) {
          throw fastify.httpErrors.badRequest('初始化注册需要正确的引导邀请码')
        }
      }
    } else {
      // 非引导注册:校验邀请码存在且未被使用。
      if (!inviteCode) throw fastify.httpErrors.badRequest('需要邀请码')
      invite = db.select().from(inviteCodes).where(eq(inviteCodes.code, inviteCode)).get()
      if (!invite) throw fastify.httpErrors.badRequest('邀请码无效')
      if (invite.usedBy !== null) throw fastify.httpErrors.badRequest('邀请码已被使用')
    }

    // 用户名唯一性检查(数据库 UNIQUE 兜底,这里给友好报错)。
    const existing = db.select({ id: users.id }).from(users).where(eq(users.username, username)).get()
    if (existing) throw fastify.httpErrors.conflict('用户名已存在')

    // 写入用户。首个用户 admin,其余 member;密码只存 scrypt 哈希。
    const role = isBootstrap ? 'admin' : 'member'
    const user = db.insert(users).values({
      username,
      passwordHash: hashPassword(password),
      displayName,
      role
    }).returning().get()

    // 标记邀请码已被本次注册使用(一次性)。
    if (invite) {
      db.update(inviteCodes)
        .set({ usedBy: user.id, usedAt: sql`(datetime('now'))` })
        .where(eq(inviteCodes.id, invite.id))
        .run()
    }

    // 注册即登录:直接返回 token,前端无需再调一次 /login。
    reply.code(201)
    return { token: signToken(user), user: toUser(user) }
  })

  // 登录:用户名不存在与密码错误返回同样的 401,避免泄露"用户名是否存在"。
  fastify.post<{ Body: LoginBody }>('/login', { schema: { body: loginSchema } }, async (request) => {
    const { username, password } = request.body
    const user = db.select().from(users).where(eq(users.username, username)).get()
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw fastify.httpErrors.unauthorized('用户名或密码错误')
    }
    return { token: signToken(user), user: toUser(user) }
  })

  // 获取当前登录用户。从库回查最新信息,使昵称/角色等变更能及时反映。
  fastify.get('/me', { preHandler: fastify.authenticate }, async (request) => {
    const user = db.select().from(users).where(eq(users.id, request.user.id)).get()
    if (!user) throw fastify.httpErrors.unauthorized('账号不存在')
    return { user: toUser(user) }
  })
}

export default authRoutes
