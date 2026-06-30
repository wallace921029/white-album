import fp from 'fastify-plugin'
import sensible from '@fastify/sensible'

// 注册 @fastify/sensible:提供 fastify.httpErrors.*(如 unauthorized/notFound),
// 路由统一用它抛出带状态码的错误。
// @see https://github.com/fastify/fastify-sensible
export default fp(async function (fastify) {
  fastify.register(sensible)
})
