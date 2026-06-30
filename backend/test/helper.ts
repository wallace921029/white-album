// 测试间复用的构建/拆卸逻辑。

import { build as buildApplication } from 'fastify-cli/helper.js'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { type TestContext } from 'node:test'

// 编译后本文件位于 dist/test/,应用入口在 dist/src/app.js。
const AppPath = path.join(__dirname, '..', 'src', 'app.js')

// 清理环境变量，避免本地 .env 的配置干扰单元测试 (设置为空字符串防止 dotenv 覆盖它)
process.env.BOOTSTRAP_INVITE_CODE = ''

// 每个测试用独立的内存数据库 + 临时上传目录,彼此隔离、无需清理。
export function config () {
  return {
    skipOverride: true, // 用 fastify-plugin 注册应用,暴露装饰器供测试访问
    databasePath: ':memory:',
    uploadDir: path.join(os.tmpdir(), `white-album-test-${randomUUID()}`),
    jwtSecret: 'test-secret'
  }
}

// 自动构建并在测试结束后关闭实例。
export async function build (t: TestContext) {
  const argv = [AppPath]
  const app = await buildApplication(argv, config())
  t.after(() => app.close())
  return app
}
