import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFile } from 'node:child_process'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { promisify } from 'node:util'
import type { Plugin, PreviewServer, ViteDevServer } from 'vite'

const yahooProxyHeaders = {
  Accept: 'application/json,text/plain,*/*',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
}
const execFileAsync = promisify(execFile)

const createFinanceApiPlugin = (): Plugin => ({
  name: 'finance-api-proxy',
  configureServer(server: ViteDevServer) {
    server.middlewares.use('/finance-api', financeApiHandler)
    server.middlewares.use('/eodhd-api', eodhdApiHandler)
  },
  configurePreviewServer(server: PreviewServer) {
    server.middlewares.use('/finance-api', financeApiHandler)
    server.middlewares.use('/eodhd-api', eodhdApiHandler)
  },
})

type NextFunction = (error?: unknown) => void

const fetchWithCurl = async (targetUrl: URL) => {
  const { stdout } = await execFileAsync(
    'curl',
    [
      '-sS',
      '-L',
      '-A',
      yahooProxyHeaders['User-Agent'],
      '-H',
      `Accept: ${yahooProxyHeaders.Accept}`,
      '-w',
      '\n__HTTP_STATUS__:%{http_code}',
      targetUrl.toString(),
    ],
    { maxBuffer: 8 * 1024 * 1024 },
  )
  const marker = '\n__HTTP_STATUS__:'
  const markerIndex = stdout.lastIndexOf(marker)
  const body = markerIndex >= 0 ? stdout.slice(0, markerIndex) : stdout
  const status = markerIndex >= 0 ? Number(stdout.slice(markerIndex + marker.length)) : 200

  return {
    body,
    status: Number.isFinite(status) ? status : 200,
  }
}

const sendJsonProxyResponse = async (
  req: IncomingMessage,
  res: ServerResponse,
  next: NextFunction,
  baseUrl: string,
) => {
  if (!req.url) {
    next()
    return
  }

  try {
    const requestPath = req.url.startsWith('/') ? req.url.slice(1) : req.url
    const targetUrl = new URL(requestPath, baseUrl)
    const { body, status } = await fetchWithCurl(targetUrl)

    res.statusCode = status
    res.setHeader('content-type', 'application/json;charset=utf-8')
    res.end(body)
  } catch (error) {
    res.statusCode = 502
    res.setHeader('content-type', 'application/json;charset=utf-8')
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Finance API proxy failed',
      }),
    )
  }
}

const financeApiHandler = (req: IncomingMessage, res: ServerResponse, next: NextFunction) =>
  sendJsonProxyResponse(req, res, next, 'https://query2.finance.yahoo.com')

const eodhdApiHandler = (req: IncomingMessage, res: ServerResponse, next: NextFunction) =>
  sendJsonProxyResponse(req, res, next, 'https://eodhd.com/api/')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), createFinanceApiPlugin()],
})
