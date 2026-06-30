import path from 'node:path'

// 全局运行配置。所有取值优先读环境变量,缺省时回退到合理默认值,
// 本地开发零配置即可启动,生产通过环境变量覆盖。
//
// 设计要点:需要持久化的状态(SQLite 数据库文件 + 上传的照片)都放在 DATA_DIR 下,
// 部署时只要把这一个目录挂成 Docker volume,即可完整备份/迁移。
// 路径默认基于 process.cwd();后端始终从 backend 目录运行(npm 脚本 / fastify start)。

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data')

const config = {
  // 数据根目录,启动时会确保它存在。
  dataDir,
  // SQLite 数据库文件路径。
  databasePath: process.env.DATABASE_PATH || path.join(dataDir, 'app.db'),
  // 上传照片的存放目录。
  uploadDir: process.env.UPLOAD_DIR || path.join(dataDir, 'uploads'),
  // drizzle 迁移文件目录(drizzle-kit 生成,启动时由 migrator 应用)。
  migrationsFolder: process.env.MIGRATIONS_DIR || path.resolve(process.cwd(), 'drizzle'),
  // JWT 签名密钥。生产必须设置;此默认值仅供开发,auth 插件检测到会告警。
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  // JWT 有效期,家庭场景用较长的 30 天。
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  // 允许的跨域来源。开发默认 '*';生产建议改成前端域名。
  corsOrigin: process.env.CORS_ORIGIN || '*',
  // 单张照片上传大小上限(字节),默认 25MB。
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES) || 25 * 1024 * 1024
}

export default config
