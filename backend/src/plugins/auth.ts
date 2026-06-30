import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import type { FastifyRequest } from 'fastify'
import config from '../lib/config'

interface AuthOptions {
  jwtSecret?: string
  jwtExpiresIn?: string
}

// 鉴权插件:注册 JWT,并提供两个 preHandler 装饰器供路由复用:
//   fastify.authenticate    要求请求带有效 JWT(任意已登录用户)
//   fastify.authorizeAdmin  在此基础上还要求角色为 admin
// 校验通过后,解码出的载荷挂在 request.user 上(类型见 types/fastify.d.ts)。
export default fp(async function (fastify, opts: AuthOptions) {
  const secret = opts.jwtSecret || config.jwtSecret
  const expiresIn = opts.jwtExpiresIn || config.jwtExpiresIn

  // 用了开发默认密钥说明生产忘配 JWT_SECRET,打告警提醒。
  if (secret === 'dev-insecure-secret-change-me') {
    fastify.log.warn('JWT_SECRET is not set; using an insecure development secret.')
  }

  fastify.register(fastifyJwt, {
    secret,
    sign: { expiresIn }
  })

  // 任意登录用户校验:验签失败统一抛 401。
  fastify.decorate('authenticate', async function (request: FastifyRequest) {
    try {
      await request.jwtVerify()
    } catch {
      throw fastify.httpErrors.unauthorized('请先登录')
    }
  })

  // 管理员校验:先验签(未登录 401),再校验角色(非管理员 403)。
  fastify.decorate('authorizeAdmin', async function (request: FastifyRequest) {
    try {
      await request.jwtVerify()
    } catch {
      throw fastify.httpErrors.unauthorized('请先登录')
    }
    if (request.user.role !== 'admin') {
      throw fastify.httpErrors.forbidden('需要管理员权限')
    }
  })
}, { name: 'auth' })
