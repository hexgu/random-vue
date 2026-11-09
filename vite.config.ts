import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { handleRandomRequest } from './shared/random.ts'

/** 读取 .dev.vars（Cloudflare 本地环境变量文件），供 `vite dev` 使用 */
function loadDevVars(): Record<string, string> {
  const file = resolve(process.cwd(), '.dev.vars')
  if (!existsSync(file)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(file, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

/**
 * 开发环境下模拟 Cloudflare Pages Function：
 * 让 `vite dev` 也能访问 /api/random，无需先安装 wrangler。
 */
function randomApiPlugin(): Plugin {
  const devVars = loadDevVars()
  return {
    name: 'random-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/random', async (req, res) => {
        try {
          const host = req.headers.host ?? 'localhost'
          const path = (req as { originalUrl?: string }).originalUrl ?? req.url ?? '/'
          const url = new URL(path, `http://${host}`)
          const request = new Request(url, {
            method: req.method ?? 'GET',
            headers: req.headers as Record<string, string>,
          })
          const response = await handleRandomRequest(request, {
            RANDOM_ORG_API_KEY: process.env.RANDOM_ORG_API_KEY ?? devVars.RANDOM_ORG_API_KEY,
          })
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(await response.text())
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), randomApiPlugin()],
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
  server: {
    port: 5173,
    host: true,
  },
})
