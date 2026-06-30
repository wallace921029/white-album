import { type FastifyPluginAsync } from 'fastify'

// 根路由:基础探活接口,无需登录。
const root: FastifyPluginAsync = async (fastify) => {
  // 服务标识,可用于确认后端在线。
  fastify.get('/', async () => {
    return { name: 'white-album-backend', status: 'ok' }
  })

  // 健康检查,供容器 / 负载均衡探活。
  fastify.get('/health', async () => {
    return { status: 'ok', uptime: process.uptime() }
  })
}

export default root
