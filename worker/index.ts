/**
 * Cloudflare Workers 入口（`wrangler deploy` 的部署目标）。
 *
 * `wrangler.toml` 中配置了 `main = "worker/index.ts"` 与 `[assets]`：
 *   - `/api/*` 交给 Worker 处理，并复用 `functions/api/random.ts` 的 `onRequest`
 *     处理器（其核心逻辑在 `shared/random.ts`，与本地 `vite dev` 中间件同源）。
 *   - 其余请求全部交给静态资源绑定 `ASSETS`（`dist/` 构建产物，未知路径回退到
 *     index.html，见 `not_found_handling = "single-page-application"`）。
 */
import { onRequest } from '../functions/api/random'

/** 静态资源绑定：Cloudflare 注入的 Fetcher（对应 `[assets].binding = "ASSETS"`）。 */
interface AssetsFetcher {
  fetch(request: Request): Promise<Response>
}

interface Env {
  RANDOM_ORG_API_KEY?: string
  ASSETS: AssetsFetcher
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    // /api/* 由 Worker 处理（run_worker_first 已在 wrangler.toml 中指定）。
    if (pathname === '/api/random' || pathname.startsWith('/api/')) {
      return onRequest({
        request,
        env: { RANDOM_ORG_API_KEY: env.RANDOM_ORG_API_KEY },
      })
    }

    // 其余请求：静态资源（含 SPA 回退）。
    return env.ASSETS.fetch(request)
  },
}
