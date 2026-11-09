/**
 * 与 random.org 交互的核心逻辑。
 *
 * 该模块同时被两处使用：
 *   1. worker/index.ts / functions/api/random.ts —— Cloudflare Workers（生产环境）
 *   2. vite.config.ts 的 dev 中间件 —— 本地 `vite dev` 调试
 *
 * 因此只依赖 Web 标准 API（fetch / crypto / TextDecoder），不依赖 Node 专有模块。
 *
 * 随机数来源优先级：
 *   - 配置了 RANDOM_ORG_API_KEY -> 官方 JSON-RPC API（你自己的 Key，最推荐）
 *   - 未配置                    -> 官方 JSON-RPC 公共测试 Key（可直接开箱使用）
 *   - 以上均失败                -> www.random.org/integers 公开接口（无需 Key）
 *   - 全部失败                  -> 运行环境本地 crypto.getRandomValues（明确标注降级）
 */

/** random.org 官方文档中的公共测试 Key（仅供开发/演示，生产请配置自己的 Key） */
export const RANDOM_ORG_DEMO_KEY = '00000000-0000-0000-0000-000000000000'
const JSON_RPC_URL = 'https://api.random.org/json-rpc/4/invoke'
const HTTP_INTEGERS_URL = 'https://www.random.org/integers/'

/** 单次请求最多生成多少个整数（避免滥用、也符合 random.org 的限额） */
export const MAX_COUNT = 100
/** 单次上游请求超时 */
const REQUEST_TIMEOUT_MS = 6000
/** 所有上游来源合计的时间预算，超出后直接走本地降级，避免函数超时 */
const OVERALL_BUDGET_MS = 12000

export interface RandomEnv {
  /** 通过 `wrangler secret put RANDOM_ORG_API_KEY` 或 .dev.vars 配置 */
  RANDOM_ORG_API_KEY?: string
}

export interface GenerateOptions {
  n: number
  min: number
  max: number
  unique: boolean
}

export type Transport = 'json-rpc' | 'http-integers'

export interface Quota {
  bitsLeft?: number
  requestsLeft?: number
}

export interface RandomOk {
  ok: true
  numbers: number[]
  source: 'random.org' | 'local'
  transport: Transport | 'local'
  quota?: Quota
  /** 降级时的说明 */
  reason?: string
}

export interface RandomErr {
  ok: false
  error: string
}

export type RandomResult = RandomOk | RandomErr

/* ------------------------------------------------------------------ */
/* 参数解析与校验                                                       */
/* ------------------------------------------------------------------ */

export class ValidationError extends Error {}

function toInt(value: string | null, fallback: number): number {
  if (value === null || value.trim() === '') return fallback
  const n = Number(value)
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new ValidationError(`参数不是合法整数: ${value}`)
  }
  return n
}

export function parseGenerateOptions(url: URL): GenerateOptions {
  const n = toInt(url.searchParams.get('n'), 1)
  const min = toInt(url.searchParams.get('min'), 1024)
  const max = toInt(url.searchParams.get('max'), 49151)
  const uniqueRaw = (url.searchParams.get('unique') ?? '').toLowerCase()
  const unique = uniqueRaw === '1' || uniqueRaw === 'true' || uniqueRaw === 'yes'

  if (n < 1 || n > MAX_COUNT) {
    throw new ValidationError(`数量 n 必须在 1 ~ ${MAX_COUNT} 之间`)
  }
  if (min > max) {
    throw new ValidationError('最小值 min 不能大于最大值 max')
  }
  if (min < -1_000_000_000 || max > 1_000_000_000) {
    throw new ValidationError('取值范围超出 random.org 支持的上限')
  }
  if (unique && max - min + 1 < n) {
    throw new ValidationError('去重模式下，可取值数量不足以生成所需个数')
  }
  return { n, min, max, unique }
}

/* ------------------------------------------------------------------ */
/* 工具函数                                                             */
/* ------------------------------------------------------------------ */

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'user-agent': 'random-vue/1.0 (Cloudflare Worker; +https://www.random.org/)',
        accept: 'application/json, text/plain, */*',
        ...(init.headers ?? {}),
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 对 429 / 5xx 做有限次退避重试（random.org 偶发限流） */
async function fetchResilient(url: string, init: RequestInit = {}, retries = 1): Promise<Response> {
  let response = await fetchWithTimeout(url, init)
  for (let attempt = 0; attempt < retries; attempt++) {
    if (response.status !== 429 && response.status < 500) return response
    await sleep(250 * (attempt + 1))
    response = await fetchWithTimeout(url, init)
  }
  return response
}

/** 无模偏的 [min, max] 整数（含端点），使用加密级随机源 */
export function secureRandomInt(min: number, max: number): number {
  const range = max - min + 1
  if (range <= 0) throw new Error('非法取值范围')
  if (range === 1) return min
  if (range > 0x100000000) throw new Error('取值范围过大')
  const limit = Math.floor(0x100000000 / range) * range
  const buf = new Uint32Array(1)
  let x = 0
  do {
    crypto.getRandomValues(buf)
    x = buf[0]
  } while (x >= limit)
  return min + (x % range)
}

function localNumbers(n: number, min: number, max: number, unique: boolean): number[] {
  if (!unique) {
    return Array.from({ length: n }, () => secureRandomInt(min, max))
  }
  const picked = new Set<number>()
  // 当取值范围接近 n 时，改用洗牌更稳妥
  const range = max - min + 1
  if (range <= n * 4) {
    const pool = Array.from({ length: range }, (_, i) => min + i)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = secureRandomInt(0, i)
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    return pool.slice(0, n)
  }
  while (picked.size < n) picked.add(secureRandomInt(min, max))
  return [...picked]
}

/* ------------------------------------------------------------------ */
/* 来源 1：random.org 官方 JSON-RPC API                                  */
/* ------------------------------------------------------------------ */

interface JsonRpcResponse {
  jsonrpc: string
  id: number | string
  result?: {
    random: { data: number[] }
    bitsUsed: number
    bitsLeft: number
    requestsLeft: number
  }
  error?: { code: number; message: string }
}

async function fromJsonRpc(opts: GenerateOptions, apiKey: string): Promise<RandomOk> {
  const body = {
    jsonrpc: '2.0',
    method: 'generateIntegers',
    params: {
      apiKey,
      n: opts.n,
      min: opts.min,
      max: opts.max,
      replacement: !opts.unique,
    },
    id: Date.now(),
  }
  const res = await fetchResilient(JSON_RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`random.org JSON-RPC HTTP ${res.status}`)
  const data = (await res.json()) as JsonRpcResponse
  if (data.error) {
    throw new Error(`random.org JSON-RPC 错误 ${data.error.code}: ${data.error.message}`)
  }
  const numbers = data.result?.random?.data
  if (!Array.isArray(numbers) || numbers.length !== opts.n) {
    throw new Error('random.org JSON-RPC 返回数据不完整')
  }
  return {
    ok: true,
    numbers,
    source: 'random.org',
    transport: 'json-rpc',
    quota: {
      bitsLeft: data.result?.bitsLeft,
      requestsLeft: data.result?.requestsLeft,
    },
  }
}

/* ------------------------------------------------------------------ */
/* 来源 2：www.random.org/integers 公开接口（无需 Key）                   */
/* ------------------------------------------------------------------ */

async function fetchPlainIntegers(count: number, min: number, max: number): Promise<number[]> {
  const params = new URLSearchParams({
    num: String(count),
    min: String(min),
    max: String(max),
    col: '1',
    base: '10',
    format: 'plain',
    rnd: 'new',
  })
  const res = await fetchResilient(`${HTTP_INTEGERS_URL}?${params.toString()}`)
  if (!res.ok) throw new Error(`www.random.org/integers HTTP ${res.status}`)
  const text = await res.text()
  const nums = text
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
  const valid = nums.filter((x) => Number.isInteger(x) && x >= min && x <= max)
  if (valid.length === 0) throw new Error('www.random.org/integers 返回内容无法解析')
  return valid
}

async function fromHttpIntegers(opts: GenerateOptions): Promise<RandomOk> {
  let numbers: number[]
  if (!opts.unique) {
    numbers = (await fetchPlainIntegers(opts.n, opts.min, opts.max)).slice(0, opts.n)
    if (numbers.length < opts.n) throw new Error('www.random.org/integers 返回数量不足')
  } else {
    const picked = new Set<number>()
    let attempts = 0
    while (picked.size < opts.n && attempts < 6) {
      const want = Math.min(1000, Math.max((opts.n - picked.size) * 4, opts.n))
      const batch = await fetchPlainIntegers(want, opts.min, opts.max)
      for (const v of batch) {
        picked.add(v)
        if (picked.size >= opts.n) break
      }
      attempts++
    }
    numbers = [...picked].slice(0, opts.n)
    if (numbers.length < opts.n) {
      // 极端情况下用本地随机补齐（概率极低），并确保仍然去重
      const chosen = new Set(numbers)
      let guard = 0
      while (numbers.length < opts.n && guard < opts.n * 1000) {
        const v = secureRandomInt(opts.min, opts.max)
        if (!chosen.has(v)) {
          chosen.add(v)
          numbers.push(v)
        }
        guard++
      }
      if (numbers.length < opts.n) throw new Error('去重随机补足失败')
    }
  }
  return {
    ok: true,
    numbers,
    source: 'random.org',
    transport: 'http-integers',
  }
}

/* ------------------------------------------------------------------ */
/* 对外统一入口                                                         */
/* ------------------------------------------------------------------ */

export async function generateNumbers(opts: GenerateOptions, env: RandomEnv): Promise<RandomOk> {
  // 单一取值：random.org 要求 min < max，此情况直接返回（结果确定，无需真随机）
  if (opts.min === opts.max) {
    return {
      ok: true,
      numbers: Array.from({ length: opts.n }, () => opts.min),
      source: 'local',
      transport: 'local',
      reason: '取值范围仅有一个值',
    }
  }

  const errors: string[] = []
  const attempts: Array<{ label: string; run: () => Promise<RandomOk> }> = []
  const startedAt = Date.now()

  const userKey = (env.RANDOM_ORG_API_KEY ?? '').trim()
  if (userKey) {
    // 生产推荐：使用自己的 API Key，配额独立且最稳定
    attempts.push({ label: 'json-rpc(user-key)', run: () => fromJsonRpc(opts, userKey) })
    attempts.push({ label: 'http-integers', run: () => fromHttpIntegers(opts) })
  } else {
    // 未配置 Key：优先使用 random.org 官方公共测试 Key（真实随机、配额充足）
    attempts.push({ label: 'json-rpc(demo-key)', run: () => fromJsonRpc(opts, RANDOM_ORG_DEMO_KEY) })
    // 再退回无需 Key 的公开接口
    attempts.push({ label: 'http-integers', run: () => fromHttpIntegers(opts) })
  }

  for (const attempt of attempts) {
    if (Date.now() - startedAt > OVERALL_BUDGET_MS) {
      errors.push(`${attempt.label}: 已超出整体时间预算，跳过`)
      break
    }
    try {
      return await attempt.run()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${attempt.label}: ${msg}`)
    }
  }

  // 全部失败 -> 本地加密随机
  return {
    ok: true,
    numbers: localNumbers(opts.n, opts.min, opts.max, opts.unique),
    source: 'local',
    transport: 'local',
    reason: errors.join(' | ') || 'random.org 暂不可用',
  }
}

function jsonResponse(payload: RandomResult | Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET, OPTIONS',
    },
  })
}

/**
 * 处理 /api/random 请求。GET 与 OPTIONS 均支持。
 * 查询参数：n（数量）、min（最小值）、max（最大值）、unique（是否去重）
 */
export async function handleRandomRequest(request: Request, env: RandomEnv = {}): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type',
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-max-age': '86400',
      },
    })
  }
  if (request.method !== 'GET') {
    return jsonResponse({ ok: false, error: '仅支持 GET 请求' }, 405)
  }

  let opts: GenerateOptions
  try {
    opts = parseGenerateOptions(new URL(request.url))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return jsonResponse({ ok: false, error: msg }, 400)
  }

  const result = await generateNumbers(opts, env)
  return jsonResponse(result)
}
