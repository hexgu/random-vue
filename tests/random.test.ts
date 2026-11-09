import { describe, expect, test } from 'bun:test'
import {
  MAX_COUNT,
  ValidationError,
  parseGenerateOptions,
  secureRandomInt,
  handleRandomRequest,
} from '../shared/random'

describe('parseGenerateOptions', () => {
  test('使用默认值', () => {
    const opts = parseGenerateOptions(new URL('https://x/api/random'))
    expect(opts).toEqual({ n: 1, min: 1024, max: 49151, unique: false })
  })

  test('解析自定义参数与去重', () => {
    const opts = parseGenerateOptions(
      new URL('https://x/api/random?n=10&min=2000&max=3000&unique=1'),
    )
    expect(opts).toEqual({ n: 10, min: 2000, max: 3000, unique: true })
  })

  test('非法数量应报错', () => {
    expect(() => parseGenerateOptions(new URL('https://x/api/random?n=0'))).toThrow(ValidationError)
    expect(() => parseGenerateOptions(new URL(`https://x/api/random?n=${MAX_COUNT + 1}`))).toThrow(
      ValidationError,
    )
  })

  test('min 大于 max 应报错', () => {
    expect(() =>
      parseGenerateOptions(new URL('https://x/api/random?min=5000&max=4000')),
    ).toThrow(ValidationError)
  })

  test('去重时取值空间不足应报错', () => {
    expect(() =>
      parseGenerateOptions(new URL('https://x/api/random?min=100&max=102&n=10&unique=1')),
    ).toThrow(ValidationError)
  })
})

describe('secureRandomInt', () => {
  test('结果始终落在 [min, max] 内', () => {
    for (let i = 0; i < 2000; i++) {
      const v = secureRandomInt(1024, 49151)
      expect(v).toBeGreaterThanOrEqual(1024)
      expect(v).toBeLessThanOrEqual(49151)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  test('单一取值范围返回固定值', () => {
    expect(secureRandomInt(7, 7)).toBe(7)
  })
})

describe('handleRandomRequest 参数校验', () => {
  test('OPTIONS 返回 204', async () => {
    const res = await handleRandomRequest(new Request('https://x/api/random', { method: 'OPTIONS' }))
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  test('非 GET 返回 405', async () => {
    const res = await handleRandomRequest(new Request('https://x/api/random', { method: 'POST' }))
    expect(res.status).toBe(405)
  })

  test('非法参数返回 400', async () => {
    const res = await handleRandomRequest(new Request('https://x/api/random?n=999'))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(false)
  })

  test('所有 random.org 来源失败时降级为本地加密随机', async () => {
    const original = globalThis.fetch
    // 模拟网络完全不可用
    globalThis.fetch = (async () => {
      throw new Error('network down')
    }) as typeof fetch
    try {
      const res = await handleRandomRequest(new Request('https://x/api/random?n=5&unique=1'))
      const body = (await res.json()) as {
        ok: boolean
        source: string
        numbers: number[]
      }
      expect(body.ok).toBe(true)
      expect(body.source).toBe('local')
      expect(body.numbers.length).toBe(5)
      expect(new Set(body.numbers).size).toBe(5)
      for (const v of body.numbers) {
        expect(v).toBeGreaterThanOrEqual(1024)
        expect(v).toBeLessThanOrEqual(49151)
      }
    } finally {
      globalThis.fetch = original
    }
  })
})
