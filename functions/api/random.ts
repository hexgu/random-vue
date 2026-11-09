import { handleRandomRequest } from '../../shared/random'

interface Env {
  RANDOM_ORG_API_KEY?: string
}

interface PagesContext {
  request: Request
  env: Env
}

/**
 * Cloudflare Pages Function —— 路由：/api/random
 * 部署到 Cloudflare Pages 后自动生效（functions/ 目录）。
 */
export const onRequest = (context: PagesContext): Promise<Response> =>
  handleRandomRequest(context.request, context.env)
