import fp from 'fastify-plugin'
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '../db/schema'
import config from '../lib/config'

// 插件可接收的覆盖项(测试时传入,例如 :memory: 数据库)。
interface DbOptions {
  databasePath?: string
  migrationsFolder?: string
}

// 数据库插件:用 better-sqlite3 建连接,套上 drizzle,启动时应用迁移建表,
// 并把 drizzle 实例挂到 fastify.db。用 fastify-plugin 包裹使其对全应用可见。
export default fp(async function (fastify, opts: DbOptions) {
  const databasePath = opts.databasePath || config.databasePath
  const migrationsFolder = opts.migrationsFolder || config.migrationsFolder
  // 测试用 ':memory:' 内存库,每个实例独立、无需清理。
  const inMemory = databasePath === ':memory:'

  // 文件库:确保父目录存在(首次部署目录可能还没建)。
  if (!inMemory) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true })
  }

  const sqlite = new Database(databasePath)
  // WAL 模式提升并发读写;内存库不适用,跳过。
  if (!inMemory) {
    sqlite.pragma('journal_mode = WAL')
  }
  // SQLite 默认关闭外键约束,需显式开启让 references 生效。
  sqlite.pragma('foreign_keys = ON')

  const db = drizzle(sqlite, { schema })
  // 应用 drizzle-kit 生成的迁移(幂等,已应用的会跳过);内存库则每次新建全部表。
  migrate(db, { migrationsFolder })

  fastify.decorate('db', db)
  // 应用关闭时释放底层连接(否则 WAL 文件会被占用)。
  fastify.addHook('onClose', async () => {
    sqlite.close()
  })
}, { name: 'db' })
