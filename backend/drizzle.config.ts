import { defineConfig } from 'drizzle-kit'

// drizzle-kit 配置:从 TS schema 生成 SQL 迁移文件。
//   npm run db:generate  根据 src/db/schema.ts 的变化生成迁移到 ./drizzle
//   npm run db:migrate   把迁移应用到下面 dbCredentials 指向的数据库
// 运行期(启动时)也会用 ./drizzle 里的迁移自动建表,见 src/plugins/db.ts。
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_PATH || './data/app.db'
  }
})
