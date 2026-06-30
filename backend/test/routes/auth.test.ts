import { test } from 'node:test'
import assert from 'node:assert'
import { type FastifyInstance } from 'fastify'
import { build } from '../helper'

interface RegisterBody {
  username: string
  password: string
  displayName: string
  inviteCode?: string
}

async function register (app: FastifyInstance, body: RegisterBody) {
  return app.inject({ method: 'POST', url: '/auth/register', payload: body })
}

test('first user becomes admin without an invite code', async (t) => {
  const app = await build(t)

  const res = await register(app, { username: 'dad', password: 'secret1', displayName: '爸爸' })
  assert.strictEqual(res.statusCode, 201)
  const body = JSON.parse(res.payload)
  assert.strictEqual(body.user.role, 'admin')
  assert.ok(body.token)
})

test('first user registration requires BOOTSTRAP_INVITE_CODE if set', async (t) => {
  process.env.BOOTSTRAP_INVITE_CODE = 'test-bootstrap-code'
  t.after(() => {
    process.env.BOOTSTRAP_INVITE_CODE = ''
  })

  const app = await build(t)

  // 无邀请码 -> 应该失败（返回 400）
  const noCode = await register(app, { username: 'dad', password: 'secret1', displayName: '爸爸' })
  assert.strictEqual(noCode.statusCode, 400)

  // 错误的邀请码 -> 应该失败（返回 400）
  const badCode = await register(app, { username: 'dad', password: 'secret1', displayName: '爸爸', inviteCode: 'wrong-code' })
  assert.strictEqual(badCode.statusCode, 400)

  // 正确的邀请码 -> 应该成功（返回 201）
  const okCode = await register(app, { username: 'dad', password: 'secret1', displayName: '爸爸', inviteCode: 'test-bootstrap-code' })
  assert.strictEqual(okCode.statusCode, 201)
  assert.strictEqual(JSON.parse(okCode.payload).user.role, 'admin')
})

test('second registration requires a valid invite code', async (t) => {
  const app = await build(t)

  const admin = JSON.parse((await register(app, { username: 'dad', password: 'secret1', displayName: '爸爸' })).payload)

  // 无邀请码 -> 拒绝。
  const noCode = await register(app, { username: 'mom', password: 'secret1', displayName: '妈妈' })
  assert.strictEqual(noCode.statusCode, 400)

  // 管理员生成邀请码。
  const inviteRes = await app.inject({
    method: 'POST',
    url: '/invites',
    headers: { authorization: `Bearer ${admin.token}` }
  })
  assert.strictEqual(inviteRes.statusCode, 201)
  const code = JSON.parse(inviteRes.payload).invite.code

  // 用邀请码注册 -> member。
  const member = await register(app, { username: 'mom', password: 'secret1', displayName: '妈妈', inviteCode: code })
  assert.strictEqual(member.statusCode, 201)
  assert.strictEqual(JSON.parse(member.payload).user.role, 'member')

  // 同一邀请码再次使用失败。
  const reuse = await register(app, { username: 'kid', password: 'secret1', displayName: '孩子', inviteCode: code })
  assert.strictEqual(reuse.statusCode, 400)
})

test('non-admin cannot create invite codes', async (t) => {
  const app = await build(t)

  await register(app, { username: 'dad', password: 'secret1', displayName: '爸爸' })
  const adminToken = JSON.parse((await app.inject({
    method: 'POST', url: '/auth/login', payload: { username: 'dad', password: 'secret1' }
  })).payload).token

  const code = JSON.parse((await app.inject({
    method: 'POST', url: '/invites', headers: { authorization: `Bearer ${adminToken}` }
  })).payload).invite.code

  const member = JSON.parse((await register(app, {
    username: 'mom', password: 'secret1', displayName: '妈妈', inviteCode: code
  })).payload)

  const forbidden = await app.inject({
    method: 'POST', url: '/invites', headers: { authorization: `Bearer ${member.token}` }
  })
  assert.strictEqual(forbidden.statusCode, 403)
})

test('login rejects wrong password and protected routes require auth', async (t) => {
  const app = await build(t)
  await register(app, { username: 'dad', password: 'secret1', displayName: '爸爸' })

  const bad = await app.inject({ method: 'POST', url: '/auth/login', payload: { username: 'dad', password: 'nope' } })
  assert.strictEqual(bad.statusCode, 401)

  const unauth = await app.inject({ url: '/photos' })
  assert.strictEqual(unauth.statusCode, 401)
})
