import { test } from 'node:test'
import assert from 'node:assert'
import { build } from '../helper'

test('root route reports status', async (t) => {
  const app = await build(t)

  const res = await app.inject({ url: '/' })
  assert.deepStrictEqual(JSON.parse(res.payload), {
    name: 'white-album-backend',
    status: 'ok'
  })
})

test('health route', async (t) => {
  const app = await build(t)

  const res = await app.inject({ url: '/health' })
  assert.strictEqual(res.statusCode, 200)
  assert.strictEqual(JSON.parse(res.payload).status, 'ok')
})
