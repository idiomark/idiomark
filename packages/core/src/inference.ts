/**
 * Idiomark Inference Server
 *
 * HTTP server for serving AI responses with personality injection
 */

import type { IdiomarkFile } from './types'
import type { GenerationOptions, StreamCallback } from './generator'
import { IdiomarkGenerator } from './generator'
import { createServer, IncomingMessage, ServerResponse } from 'http'

export interface InferenceServerOptions {
  port: number
  model: string
  personality: IdiomarkFile
  generation?: GenerationOptions
}

export class IdiomarkInferenceServer {
  private options: InferenceServerOptions
  private server: ReturnType<typeof createServer> | null = null
  private generator: IdiomarkGenerator

  constructor(options: InferenceServerOptions) {
    this.options = options
    this.generator = new IdiomarkGenerator(
      options.personality.personality,
      {
        ...options.generation,
        model: options.model
      }
    )
  }

  async start(): Promise<void> {
    const { port } = this.options

    this.server = createServer((req, res) => {
      this.handleRequest(req, res)
    })

    return new Promise((resolve) => {
      this.server!.listen(port, () => {
        console.log(`Idiomark Inference Server running on port ${port}`)
        resolve()
      })
    })
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log('Idiomark Inference Server stopped')
          resolve()
        })
      })
    }
  }

  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    const url = req.url || '/'

    if (url === '/health') {
      this.handleHealth(req, res)
    } else if (url === '/personality') {
      this.handlePersonality(req, res)
    } else if (url === '/system-prompt') {
      this.handleSystemPrompt(req, res)
    } else if (url === '/generate') {
      await this.handleGenerate(req, res)
    } else if (url === '/stream') {
      await this.handleStream(req, res)
    } else {
      this.handleNotFound(req, res)
    }
  }

  private handleHealth(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'healthy',
      model: this.options.model,
      personality: this.options.personality.id,
      timestamp: new Date().toISOString()
    }))
  }

  private handlePersonality(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      id: this.options.personality.id,
      personality: this.options.personality.personality,
      metadata: this.options.personality.metadata
    }))
  }

  private handleSystemPrompt(req: IncomingMessage, res: ServerResponse): void {
    // Import here to avoid circular dependency
    const { buildSystemPrompt } = require('./personality-prompt')

    const systemPrompt = buildSystemPrompt(this.options.personality.personality, {
      task: 'You are an AI assistant responding to user messages.',
      additionalInstructions: 'Be helpful and natural in your responses.'
    })

    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end(systemPrompt)
  }

  private async handleGenerate(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Method not allowed' }))
      return
    }

    try {
      const body = await this.parseBody(req)
      const message = body?.message

      if (!message) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Missing message field' }))
        return
      }

      // Update history if provided
      if (body.history && Array.isArray(body.history)) {
        this.generator.clearHistory()
        for (const msg of body.history) {
          this.generator.addHistory(msg)
        }
      }

      // Generate response with real LLM
      const result = await this.generator.generate(message)

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        response: result.content,
        metadata: {
          model: result.model,
          provider: result.provider,
          tokens: result.tokens,
          timestamp: result.timestamp,
          personality: {
            id: this.options.personality.id,
            tone: this.options.personality.personality.voice.tone.primary,
            toneConfidence: this.options.personality.personality.voice.tone.confidence
          }
        }
      }))
    } catch (error) {
      console.error('Generate error:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      }))
    }
  }

  private async handleStream(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Method not allowed' }))
      return
    }

    try {
      const body = await this.parseBody(req)
      const message = body?.message

      if (!message) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Missing message field' }))
        return
      }

      // Set up SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      })

      // Update history if provided
      if (body.history && Array.isArray(body.history)) {
        this.generator.clearHistory()
        for (const msg of body.history) {
          this.generator.addHistory(msg)
        }
      }

      // Stream response
      await this.generator.generateStream(message, (chunk) => {
        if (chunk.type === 'content' && chunk.content) {
          res.write(`data: ${JSON.stringify({ type: 'content', content: chunk.content })}\n\n`)
        } else if (chunk.type === 'error') {
          res.write(`data: ${JSON.stringify({ type: 'error', error: chunk.error })}\n\n`)
        } else if (chunk.type === 'done') {
          res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        }
      })

      res.end()
    } catch (error) {
      console.error('Stream error:', error)
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : String(error)
        }))
      }
    }
  }

  private handleNotFound(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  }

  private parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk.toString()
      })
      req.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch {
          reject(new Error('Invalid JSON'))
        }
      })
      req.on('error', reject)
    })
  }
}
