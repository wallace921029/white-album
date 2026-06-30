import { test } from 'node:test'
import assert from 'node:assert'
import { type FastifyInstance } from 'fastify'
import { build } from '../helper'

// 创建一个管理员和一个普通成员,返回各自的 token。
async function seedUsers (app: FastifyInstance) {
  const admin = JSON.parse((await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { username: 'dad', password: 'secret1', displayName: '爸爸' }
  })).payload)

  const code = JSON.parse((await app.inject({
    method: 'POST', url: '/invites', headers: { authorization: `Bearer ${admin.token}` }
  })).payload).invite.code

  const member = JSON.parse((await app.inject({
    method: 'POST', url: '/auth/register',
    payload: { username: 'mom', password: 'secret1', displayName: '妈妈', inviteCode: code }
  })).payload)

  return { adminToken: admin.token as string, memberToken: member.token as string }
}

const auth = (token: string) => ({ authorization: `Bearer ${token}` })

test('notices: admin can create, members can read, members cannot create', async (t) => {
  const app = await build(t)
  const { adminToken, memberToken } = await seedUsers(app)

  const created = await app.inject({
    method: 'POST', url: '/notices', headers: auth(adminToken),
    payload: { title: '家庭聚会', content: '周日中午', pinned: true }
  })
  assert.strictEqual(created.statusCode, 201)
  assert.strictEqual(JSON.parse(created.payload).notice.pinned, true)

  const list = await app.inject({ url: '/notices', headers: auth(memberToken) })
  assert.strictEqual(list.statusCode, 200)
  assert.strictEqual(JSON.parse(list.payload).notices.length, 1)

  const forbidden = await app.inject({
    method: 'POST', url: '/notices', headers: auth(memberToken),
    payload: { title: 'nope' }
  })
  assert.strictEqual(forbidden.statusCode, 403)
})

test('messages: member posts, admin can delete any', async (t) => {
  const app = await build(t)
  const { adminToken, memberToken } = await seedUsers(app)

  const posted = JSON.parse((await app.inject({
    method: 'POST', url: '/messages', headers: auth(memberToken),
    payload: { content: '想念大家' }
  })).payload).message
  assert.strictEqual(posted.authorName, '妈妈')

  // 管理员删除成员的留言。
  const del = await app.inject({
    method: 'DELETE', url: `/messages/${posted.id}`, headers: auth(adminToken)
  })
  assert.strictEqual(del.statusCode, 204)

  const list = JSON.parse((await app.inject({ url: '/messages', headers: auth(memberToken) })).payload)
  assert.strictEqual(list.messages.length, 0)
})

test('messages: a member cannot delete another member\'s message', async (t) => {
  const app = await build(t)
  const { adminToken, memberToken } = await seedUsers(app)

  const adminMsg = JSON.parse((await app.inject({
    method: 'POST', url: '/messages', headers: auth(adminToken),
    payload: { content: '管理员留言' }
  })).payload).message

  const forbidden = await app.inject({
    method: 'DELETE', url: `/messages/${adminMsg.id}`, headers: auth(memberToken)
  })
  assert.strictEqual(forbidden.statusCode, 403)
})

test('photos: empty list, upload via multipart, then visible', async (t) => {
  const app = await build(t)
  const { adminToken, memberToken } = await seedUsers(app)

  const empty = JSON.parse((await app.inject({ url: '/photos', headers: auth(memberToken) })).payload)
  assert.deepStrictEqual(empty.photos, [])

  // 构造最小 multipart 请求体,带一段极小的 PNG 字节。
  const boundary = '----whitealbumtest'
  const pngBytes = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n全家福\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="a.png"\r\nContent-Type: image/png\r\n\r\n`),
    pngBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ])

  const upload = await app.inject({
    method: 'POST', url: '/photos',
    headers: { ...auth(adminToken), 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload: body
  })
  assert.strictEqual(upload.statusCode, 201)
  const photo = JSON.parse(upload.payload).photo
  assert.strictEqual(photo.caption, '全家福')
  assert.match(photo.url, /^\/uploads\/.+\.png$/)

  const list = JSON.parse((await app.inject({ url: '/photos', headers: auth(memberToken) })).payload)
  assert.strictEqual(list.photos.length, 1)
})

test('notices: read status persistence', async (t) => {
  const app = await build(t)
  const { adminToken, memberToken } = await seedUsers(app)

  // 1. 创建通知
  const createdRes = await app.inject({
    method: 'POST', url: '/notices', headers: auth(adminToken),
    payload: { title: '测试已读', content: '测试内容' }
  })
  const notice = JSON.parse(createdRes.payload).notice

  // 2. 成员读取通知，此时 read 字段应该为 false
  const list1 = await app.inject({ url: '/notices', headers: auth(memberToken) })
  assert.strictEqual(JSON.parse(list1.payload).notices[0].read, false)

  // 3. 标记为已读
  const readRes = await app.inject({
    method: 'POST', url: `/notices/${notice.id}/read`, headers: auth(memberToken)
  })
  assert.strictEqual(readRes.statusCode, 204)

  // 4. 再次拉取通知，此时 read 字段应该为 true
  const list2 = await app.inject({ url: '/notices', headers: auth(memberToken) })
  assert.strictEqual(JSON.parse(list2.payload).notices[0].read, true)
})

