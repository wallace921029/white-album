import fp from 'fastify-plugin'
import fs from 'node:fs'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import config from '../lib/config'

interface AppPluginOptions {
  uploadDir?: string
  maxUploadBytes?: number
  corsOrigin?: string
}

// 应用级 HTTP 横切能力,集中处理三件事:
//   1. CORS:前端(:5173)与后端(:3000)跨域;
//   2. multipart:解析照片上传的 multipart/form-data;
//   3. static:把上传目录以 /uploads/ 前缀对外提供静态访问。
// 同时把上传目录暴露为 fastify.uploadDir,供 photos 路由写文件使用。
export default fp(async function (fastify, opts: AppPluginOptions) {
  const uploadDir = opts.uploadDir || config.uploadDir
  const maxUploadBytes = opts.maxUploadBytes || config.maxUploadBytes
  const corsOrigin = opts.corsOrigin || config.corsOrigin

  // 确保上传目录存在(首次部署 / 测试临时目录可能还没建)。
  fs.mkdirSync(uploadDir, { recursive: true })

  // 鉴权走 Authorization 头而非 Cookie,故 origin 用 '*' 也安全。
  await fastify.register(cors, { 
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })

  // 限制单文件大小、每次最多 1 个文件。
  await fastify.register(multipart, {
    limits: { fileSize: maxUploadBytes, files: 1 }
  })

  // 照片通过 GET /uploads/<filename> 访问。启用强缓存机制，因为文件名使用 UUID。
  await fastify.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
    decorateReply: false,
    maxAge: 31536000000, // 1 year
    immutable: true
  })

  fastify.decorate('uploadDir', uploadDir)
  fastify.decorate('maxUploadBytes', maxUploadBytes)
}, { name: 'app' })
