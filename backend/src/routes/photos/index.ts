import { type FastifyPluginAsync } from 'fastify'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import { eq, asc, desc, sql } from 'drizzle-orm'
import { photos } from '../../db/schema'
import { toPhoto } from '../../lib/serializers'

// MIME 类型到扩展名的映射,用于给落盘文件起合理后缀。
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic', // iPhone/iPad 默认照片格式
  'image/heif': '.heif'
}

// PATCH 请求体:只允许改说明和排序,additionalProperties:false 拒绝多余字段。
const updateSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    caption: { type: 'string', maxLength: 500 },
    sortOrder: { type: 'integer' }
  }
}

interface UpdateBody {
  caption?: string
  sortOrder?: number
}

// 照片路由,挂载到 /photos 前缀下。查看需登录,增删改需管理员。
const photoRoutes: FastifyPluginAsync = async (fastify) => {
  const { db } = fastify

  // 列出所有照片,默认限制前10张。传递 ?all=true 获取全部, 或 ?limit=N 获取指定数量。
  fastify.get<{ Querystring: { limit?: string, all?: string } }>('/', { preHandler: fastify.authenticate }, async (request) => {
    let query = db.select().from(photos).orderBy(desc(photos.createdAt), desc(photos.id)).$dynamic()
    
    if (request.query.all !== 'true') {
      const limit = Number(request.query.limit) || 10
      query = query.limit(limit)
    }

    const rows = query.all()
    return { photos: rows.map(toPhoto) }
  })

  // 获取单张照片元信息。
  fastify.get<{ Params: { id: string } }>('/:id', { preHandler: fastify.authenticate }, async (request) => {
    const photo = db.select().from(photos).where(eq(photos.id, Number(request.params.id))).get()
    if (!photo) throw fastify.httpErrors.notFound('照片不存在')
    return { photo: toPhoto(photo) }
  })

  // 上传新照片(管理员)。multipart/form-data:含 file 文件字段、可选 caption 文本字段。
  fastify.post('/', { preHandler: fastify.authorizeAdmin }, async (request, reply) => {
    const data = await request.file()
    if (!data) throw fastify.httpErrors.badRequest('缺少上传文件')

    // 只接受图片类型。
    if (!data.mimetype || !data.mimetype.startsWith('image/')) {
      throw fastify.httpErrors.unsupportedMediaType('只支持图片文件')
    }

    // 用随机 UUID 作文件名,避免重名覆盖与特殊字符路径问题;
    // 扩展名优先按 MIME 推断,退而用原文件名后缀,再不行用 .bin。
    const ext = EXT_BY_MIME[data.mimetype] || path.extname(data.filename || '').toLowerCase() || '.bin'
    const filename = `${randomUUID()}${ext}`
    const dest = path.join(fastify.uploadDir, filename)

    // 流式写盘,避免大文件占满内存;失败则清理半截文件。
    try {
      await pipeline(data.file, fs.createWriteStream(dest))
    } catch (err) {
      await fs.promises.rm(dest, { force: true })
      throw err
    }

    // 超过大小上限时 @fastify/multipart 会把流标记为 truncated:删除残文件并返回 413。
    if (data.file.truncated) {
      await fs.promises.rm(dest, { force: true })
      throw fastify.httpErrors.payloadTooLarge('图片文件过大')
    }

    // 读取随文件提交的 caption 字段(可能不存在)并限长。
    const captionField = data.fields?.caption as { value?: string } | undefined
    const caption = (captionField?.value ?? '').toString().slice(0, 500)
    
    const photo = db.insert(photos).values({
      filename,
      originalName: data.filename || null,
      caption,
      uploadedBy: request.user.id
    }).returning().get()

    reply.code(201)
    return { photo: toPhoto(photo) }
  })

  // 修改照片说明 / 排序(管理员)。只更新传入的字段。
  fastify.patch<{ Params: { id: string }, Body: UpdateBody }>('/:id', { preHandler: fastify.authorizeAdmin, schema: { body: updateSchema } }, async (request) => {
    const id = Number(request.params.id)
    const photo = db.select().from(photos).where(eq(photos.id, id)).get()
    if (!photo) throw fastify.httpErrors.notFound('照片不存在')

    const { caption, sortOrder } = request.body
    const updates: Partial<typeof photos.$inferInsert> = {}
    if (caption !== undefined) updates.caption = caption
    if (sortOrder !== undefined) updates.sortOrder = sortOrder
    if (Object.keys(updates).length === 0) throw fastify.httpErrors.badRequest('没有需要更新的字段')

    const updated = db.update(photos).set(updates).where(eq(photos.id, id)).returning().get()
    return { photo: toPhoto(updated) }
  })

  // 删除照片(管理员):先删库记录,再删磁盘文件(force 容忍文件已不存在)。
  fastify.delete<{ Params: { id: string } }>('/:id', { preHandler: fastify.authorizeAdmin }, async (request, reply) => {
    const id = Number(request.params.id)
    const photo = db.select().from(photos).where(eq(photos.id, id)).get()
    if (!photo) throw fastify.httpErrors.notFound('照片不存在')

    db.delete(photos).where(eq(photos.id, id)).run()
    await fs.promises.rm(path.join(fastify.uploadDir, photo.filename), { force: true })
    reply.code(204)
  })
}

export default photoRoutes
