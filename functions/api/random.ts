import { handleRandomRequest } from '../../shared/random'

interface Env {
  RANDOM_ORG_API_KEY?: string
}

interface PagesContext {
  request: Request
  env: Env
}

/**
 * `/api/random` 请求处理器（Pages Function 形态的 `onRequest`）。
 * 生产环境由 `worker/index.ts` 调用（Workers + Static Assets 部署）；
 * 也可直接作为 Pages Function 使用。核心逻辑复用 `shared/random.ts`。
 */
export const onRequest = (context: PagesContext): Promise<Response> =>
  handleRandomRequest(context.request, context.env)
