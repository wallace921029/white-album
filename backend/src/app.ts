import path from 'node:path'
import AutoLoad, { type AutoloadPluginOptions } from '@fastify/autoload'
import { type FastifyPluginAsync } from 'fastify'

export type AppOptions = Partial<AutoloadPluginOptions> & Record<string, unknown>

// fastify-cli 默认导出的应用入口。它先加载 plugins/(支撑能力,通过 fastify-plugin
// 暴露 db / 鉴权 / 上传等装饰器),再加载 routes/(各业务路由,按目录名映射 URL 前缀)。
// 在此之间无需手写注册顺序,@fastify/autoload 会扫描目录自动注册。
const options: AppOptions = {}

const app: FastifyPluginAsync<AppOptions> = async (fastify, opts): Promise<void> => {
  // 加载支撑插件(db、auth、app、sensible)。
  void fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: { ...opts }
  })

  // 加载业务路由(auth / invites / photos / notices / messages / root)。
  void fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: { ...opts }
  })
}

export default app
export { app, options }
