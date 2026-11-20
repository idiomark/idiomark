/**
 * HTTP Server Adapter
 *
 * Simple HTTP server that applies Idiomark personality to incoming requests
 * Useful for quick testing and standalone personality services
 */

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'http'
import type { HTTPServerOptions, HTTPRequest, HTTPResponse } from '../types'
import type { IdiomarkFile } from '@idiomark/core'
import { BaseProjectionAdapter } from '../base'

// ============================================================
// HTTP Server Implementation
// ============================================================

export class HTTPServerAdapter extends BaseProjectionAdapter {
  private server: any = null
  private config: HTTPServerOptions
  private personality: IdiomarkFile | null = null

  constructor(config: HTTPServerOptions) {
    super('http-server', { name: 'http-server' })
    this.config = config
    this.personality = config.personality
  }

  // ============================================================
  // Start/Stop
  // ============================================================

  async start(): Promise<void> {
    const port = this.config.port || 3000

    this.server = createHttpServer(async (req, res) => {
      // CORS headers
      if (this.config.cors !== false) {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      }

      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      // Route handlers
      if (req.method === 'POST' && req.url === '/generate') {
        await this.handleGenerate(req, res)
      } else if (req.method === 'POST' && req.url === '/stream') {
        await this.handleStream(req, res)
      } else if (req.method === 'GET' && req.url === '/personality') {
        await this.handleGetPersonality(req, res)
      } else if (req.method === 'GET' && req.url === '/system-prompt') {
        await this.handleGetSystemPrompt(req, res)
      } else if (req.method === 'GET' && req.url === '/health') {
        await this.handleHealth(req, res)
      } else if (req.method === 'GET' && req.url === '/') {
        await this.handleRoot(req, res)
      } else {
        res.writeHead(404)
        res.end(JSON.stringify({ error: 'Not found' }))
      }
    })

    this.server.listen(port, () => {
      console.error(`Idiomark HTTP Server listening on port ${port}`)
      this.emitter.emit('serverStart', { port })
    })
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close()
      this.server = null
    }
    await this.dispose()
  }

  // ============================================================
  // Request Handlers
  // ============================================================

  /**
   * Generate a response with personality
   */
  private async handleGenerate(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk
    })

    req.on('end', async () => {
      try {
        const request = JSON.parse(body) as HTTPRequest
        const start = Date.now()

        // Apply personality
        const response = await this.applyPersonality(
          request.message,
          { mode: request.mode || 'balanced' }
        )

        const duration = Date.now() - start

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          content: response,
          mode: request.mode || 'balanced',
          duration
        } as HTTPResponse))

      } catch (error) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
      }
    })
  }

  /**
   * Stream a response (SSE)
   */
  private async handleStream(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk
    })

    req.on('end', async () => {
      try {
        const request = JSON.parse(body) as HTTPRequest

        // SSE headers
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        })

        // Send chunks (simulated for now - would use actual LLM streaming)
        const response = await this.applyPersonality(
          request.message,
          { mode: request.mode || 'balanced' }
        )

        const chunks = response.split('\n')
        for (const chunk of chunks) {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
        }

        res.write('data: [DONE]\n\n')
        res.end()

      } catch (error) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
      }
    })
  }

  /**
   * Return personality metadata
   */
  private async handleGetPersonality(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!this.personality) {
      res.writeHead(503)
      res.end(JSON.stringify({ error: 'Personality not loaded' }))
      return
    }

    const { personality, metadata } = this.personality

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      personality: {
        voice: personality?.voice,
        values: personality?.values,
        domains: personality?.domains,
        knowledge: personality?.knowledge
      },
      metadata: {
        version: metadata?.version,
        created: metadata?.created,
        source: metadata?.source
      }
    }, null, 2))
  }

  /**
   * Return system prompt
   */
  private async handleGetSystemPrompt(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!this.personality) {
      res.writeHead(503)
      res.end(JSON.stringify({ error: 'Personality not loaded' }))
      return
    }

    const { buildSystemPrompt } = await import('@idiomark/inference')
    const mode = req.url?.includes('mode=strict') ? 'strict'
      : req.url?.includes('mode=subtle') ? 'subtle'
      : 'balanced'

    const systemPrompt = buildSystemPrompt(this.personality, mode)

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(systemPrompt)
  }

  /**
   * Health check endpoint
   */
  private async handleHealth(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const health = await this.healthCheck()
    const metrics = this.getMetrics()

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      ...health,
      metrics: {
        requests: metrics.requests,
        successes: metrics.successes,
        failures: metrics.failures,
        avgLatency: metrics.avgLatency
      }
    }))
  }

  /**
   * Root endpoint with usage info
   */
  private async handleRoot(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Idiomark Projection Server</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 40px auto; }
    h1 { color: #333; }
    .endpoint { background: #f5f5f5; padding: 16px; margin: 8px 0; border-radius: 8px; }
    .method { color: #05a; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>🎭 Idiomark Projection Server</h1>
  <p>A Idiomark personality is being served with the following characteristics:</p>
  <div class="endpoint">
    <strong>Voice:</strong> ${this.personality?.personality?.voice?.tone?.primary || 'Unknown'}<br>
    <strong>Formality:</strong> ${this.personality?.personality?.voice?.formality?.toFixed(2) || 'N/A'}<br>
    <strong>Values:</strong> ${this.personality?.personality?.values?.map((v: any) => v.name).join(', ') || 'None specified'}
  </div>

  <h2>API Endpoints</h2>
  <table>
    <tr><td class="method">POST</td><td><code>/generate</code></td><td>Generate response with personality</td></tr>
    <tr><td class="method">POST</td><td><code>/stream</code></td><td>Stream response (SSE)</td></tr>
    <tr><td class="method">GET</td><td><code>/personality</code></td><td>View personality JSON</td></tr>
    <tr><td class="method">GET</td><td><code>/system-prompt</code></td><td>View system prompt</td></tr>
    <tr><td class="method">GET</td><td><code>/health</code></td><td>Health check</td></tr>
  </table>

  <h2>Example</h2>
  <pre style="background: #f5f5f5; padding: 12px; border-radius: 6px;">
curl -X POST http://localhost:${this.config.port || 3000}/generate \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello!"}'
  </pre>
</body>
</html>
    `

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(html)
  }

  // ============================================================
  // BaseAdapter Implementation
  // ============================================================

  async transform(input: { message: string }): Promise<{ content: string; format: string }> {
    // Apply personality to message
    const response = await this.applyPersonality(input.message)
    return {
      content: response,
      format: 'text'
    }
  }

  async send(output: { content: string }): Promise<{ success: boolean; content?: string; error?: string }> {
    // For HTTP, sending happens via response
    return {
      success: true,
      content: output.content
    }
  }

  /**
   * Apply personality using inference package
   */
  private async applyPersonality(
    message: string,
    options: { mode?: 'strict' | 'balanced' | 'subtle'; stream?: boolean }
  ): Promise<string> {
    if (!this.personality) {
      throw new Error('Personality not loaded')
    }

    const { buildSystemPrompt, generateResponse } = await import('@idiomark/inference')
    const mode = options?.mode || 'balanced'

    // Use actual LLM inference if provider/model configured
    if (this.config.provider && this.config.model) {
      return await generateResponse({
        prompt: buildSystemPrompt(this.personality, mode),
        input: message,
        provider: this.config.provider,
        model: this.config.model
      })
    }

    // Fallback to system prompt if no LLM configured
    const systemPrompt = buildSystemPrompt(this.personality, mode)
    return `${systemPrompt}\n\n${message}`
  }
}
