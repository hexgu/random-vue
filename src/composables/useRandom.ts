export interface Quota {
  bitsLeft?: number
  requestsLeft?: number
}

export interface RandomApiResponse {
  ok: boolean
  numbers?: number[]
  source?: 'random.org' | 'local'
  transport?: string
  quota?: Quota
  reason?: string
  error?: string
}

export interface FetchRandomOptions {
  n: number
  min: number
  max: number
  unique?: boolean
}

/**
 * 调用后端代理 /api/random（Cloudflare Pages Function）。
 * 失败时抛出 Error，调用方负责展示。
 */
export async function fetchRandom(
  opts: FetchRandomOptions,
  signal?: AbortSignal,
): Promise<RandomApiResponse> {
  const params = new URLSearchParams({
    n: String(opts.n),
    min: String(opts.min),
    max: String(opts.max),
  })
  if (opts.unique) params.set('unique', '1')

  const res = await fetch(`/api/random?${params.toString()}`, {
    signal,
    headers: { accept: 'application/json' },
  })

  let data: RandomApiResponse | null = null
  try {
    data = (await res.json()) as RandomApiResponse
  } catch {
    data = null
  }

  if (!res.ok || !data || data.ok === false) {
    throw new Error(data?.error ?? `请求失败（HTTP ${res.status}）`)
  }
  return data
}

export interface SourceMeta {
  source?: 'random.org' | 'local'
  transport?: string
  quota?: Quota
  reason?: string
}

/** 生成用于展示的数据来源标签 */
export function describeSource(meta: SourceMeta | null): {
  label: string
  level: 'real' | 'local' | 'idle'
  title: string
} {
  if (!meta) return { label: '等待生成', level: 'idle', title: '' }
  if (meta.source === 'random.org') {
    const via = meta.transport === 'json-rpc' ? 'JSON-RPC API' : 'public API'
    return {
      label: 'random.org 真随机',
      level: 'real',
      title: `随机数来自 random.org（${via}）`,
    }
  }
  if (meta.reason === '取值范围仅有一个值') {
    return { label: '固定值', level: 'idle', title: '取值范围只有一个值，结果唯一' }
  }
  return {
    label: '本地降级随机',
    level: 'local',
    title: meta.reason ? `random.org 暂不可用：${meta.reason}` : 'random.org 暂不可用',
  }
}
