import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'

// 密码哈希工具。使用 Node 内置的 scrypt,不引入额外依赖。
// 存储格式为 `盐(hex):哈希(hex)`,每个用户独立随机盐,数据库泄露也难以批量破解。

// 把明文密码哈希成可存库的字符串。
export function hashPassword (password: string): string {
  // 16 字节随机盐,保证相同密码的两个用户哈希结果也不同。
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, 64)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

// 校验明文密码是否与库里存的哈希匹配。
export function verifyPassword (password: string, stored: string): boolean {
  // 防御:格式不对(空值、缺分隔符)直接判失败,避免后续解析抛错。
  if (typeof stored !== 'string' || !stored.includes(':')) return false
  const [saltHex, hashHex] = stored.split(':')
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const derived = scryptSync(password, salt, expected.length)
  // 恒定时间比较,避免计时侧信道;先比长度防止 timingSafeEqual 抛错。
  return expected.length === derived.length && timingSafeEqual(expected, derived)
}
