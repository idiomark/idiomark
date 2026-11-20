/**
 * MCP Server Implementation
 *
 * Creates an MCP server that exposes Idiomark personality as tools and resources.
 * Supports both stdio (Claude Desktop) and HTTP transports.
 *
 * Key insight: UCP supports MCP as transport, so this enables UCP too!
 */

import { Readable } from 'stream'
import { createServer as createHttpServer } from 'http'
import type { IncomingMessage, ServerResponse } from 'http'

import type {
  MCPTransport,
  MCPMessage,
  MCPTool,
  MCPResource,
  MCPServerConfig,
  MCPToolResult,
  GenerateResponseArgs,
  GetPersonalityArgs,
  GetSystemPromptArgs
} from './types'
import type { IdiomarkFile } from '@idiomark/core'
import { BaseProjectionAdapter } from '../base'

// ============================================================
// MCP Server Implementation
// ============================================================

export class MCPServer extends BaseProjectionAdapter {
  private server: any = null
  private config: MCPServerConfig
  private messageId = 0
  private pendingRequests: Map<string | number, {
    resolve: (result: MCPMessage) => void
    reject: (error: Error) => void
  }> = new Map()

  constructor(config: MCPServerConfig) {
    super('mcp-server', { name: 'mcp-server' })
    this.config = config
    this.personality = config.personality
  }

  // ============================================================
  // MCP Tools Definition
  // ============================================================

  /**
   * Get tools exposed by this MCP server
   */
  getTools(): MCPTool[] {
    const personality = this.personality
    if (!personality) return []

    const { voice } = personality.personality || {}

    return [
      {
        name: 'generate_response',
        description: `Generate a response in ${voice?.tone?.primary || 'neutral'} tone${voice?.tone?.secondary ? ` with ${voice.tone.secondary} undertones` : ''}. Formality: ${voice?.formality ? Math.round(voice.formality * 100) + '%' : 'N/A'}. Directness: ${voice?.directness ? Math.round(voice.directness * 100) + '%' : 'N/A'}.`,
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'The input message to respond to'
            },
            mode: {
              type: 'string',
              description: 'How strongly to apply the personality',
              enum: ['strict', 'balanced', 'subtle'],
              default: 'balanced'
            },
            context: {
              type: 'array',
              description: 'Optional conversation history for context',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                  content: { type: 'string' }
                }
              }
            }
          },
          required: ['message']
        }
      },
      {
        name: 'get_personality',
        description: 'Get the loaded personality metadata (voice, values, domains, knowledge)',
        inputSchema: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              description: 'Which section to retrieve',
              enum: ['voice', 'values', 'domains', 'knowledge', 'all'],
              default: 'all'
            }
          }
        }
      },
      {
        name: 'get_system_prompt',
        description: 'Get the system prompt that encodes this personality',
        inputSchema: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['strict', 'balanced', 'subtle'],
              default: 'balanced'
            },
            includeInstructions: {
              type: 'boolean',
              default: true,
              description: 'Include personality instructions in the prompt'
            }
          }
        }
      },
      {
        name: 'get_health',
        description: 'Check the health and status of the MCP server',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  }

  /**
   * Get resources exposed by this MCP server
   */
  getResources(): MCPResource[] {
    const personality = this.personality
    if (!personality) return []

    const { metadata } = personality

    return [
      {
        uri: 'idiomark:///personality',
        name: 'Personality',
        description: 'Full Idiomark personality file',
        mimeType: 'application/json'
      },
      {
        uri: 'idiomark:///voice',
        name: 'Voice Profile',
        description: 'Voice characteristics (tone, formality, humor, etc.)',
        mimeType: 'application/json'
      },
      {
        uri: 'idiomark:///values',
        name: 'Core Values',
        description: 'Values and principles that guide responses',
        mimeType: 'application/json'
      },
      {
        uri: 'idiomark:///domains',
        name: 'Domain Knowledge',
        description: 'Areas of expertise and interest',
        mimeType: 'application/json'
      }
    ]
  }

  // ============================================================
  // Tool Handlers
  // ============================================================

  /**
   * Handle generate_response tool call
   */
  private async handleGenerateResponse(args: GenerateResponseArgs): Promise<MCPToolResult> {
    try {
      // Import inference utilities
      const { buildSystemPrompt } = await import('@idiomark/inference')

      const mode = args.mode || 'balanced'
      const systemPrompt = buildSystemPrompt(this.personality!, mode)

      // Build conversation context
      const context = args.context || []

      // For now, return the system prompt + formatted response
      // In production, this would call the actual LLM
      const response = this.formatResponse(systemPrompt, args.message, context)

      return {
        content: [
          {
            type: 'text',
            text: response
          }
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      }
    }
  }

  /**
   * Handle get_personality tool call
   */
  private async handleGetPersonality(args: GetPersonalityArgs): Promise<MCPToolResult> {
    const section = args.section || 'all'
    const personality = this.personality!

    let data: unknown

    switch (section) {
      case 'voice':
        data = personality.personality?.voice || null
        break
      case 'values':
        data = personality.personality?.values || []
        break
      case 'domains':
        data = personality.personality?.domains || []
        break
      case 'knowledge':
        data = personality.personality?.knowledge || null
        break
      case 'all':
      default:
        data = personality
        break
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }
      ]
    }
  }

  /**
   * Handle get_system_prompt tool call
   */
  private async handleGetSystemPrompt(args: GetSystemPromptArgs): Promise<MCPToolResult> {
    const { buildSystemPrompt } = await import('@idiomark/inference')
    const mode = args.mode || 'balanced'

    const systemPrompt = buildSystemPrompt(this.personality!, mode)

    return {
      content: [
        {
          type: 'text',
          text: systemPrompt
        }
      ]
    }
  }

  /**
   * Handle get_health tool call
   */
  private async handleGetHealth(): Promise<MCPToolResult> {
    const health = await this.healthCheck()
    const metrics = this.getMetrics()

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: health.healthy ? 'healthy' : 'unhealthy',
            latency: health.latency,
            metrics: {
              requests: metrics.requests,
              successes: metrics.successes,
              failures: metrics.failures,
              avgLatency: metrics.avgLatency
            }
          }, null, 2)
        }
      ]
    }
  }

  /**
   * Route tool call to appropriate handler
   */
  private async handleToolCall(toolName: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    this.metrics.increment('toolCalls')

    switch (toolName) {
      case 'generate_response':
        return await this.handleGenerateResponse(args as GenerateResponseArgs)
      case 'get_personality':
        return await this.handleGetPersonality(args as GetPersonalityArgs)
      case 'get_system_prompt':
        return await this.handleGetSystemPrompt(args as GetSystemPromptArgs)
      case 'get_health':
        return await this.handleGetHealth()
      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${toolName}`
            }
          ],
          isError: true
        }
    }
  }

  /**
   * Format a response with the system prompt and message
   * TODO: Replace with actual LLM call via inference package
   */
  private formatResponse(systemPrompt: string, userMessage: string, context: Array<{ role: string; content: string }>): string {
    const voice = this.personality?.personality?.voice
    const tone = voice?.tone?.primary || 'neutral'

    let response = `[$tone tone]\n${userMessage}\n\n`

    if (context && context.length > 0) {
      response += `[Context: ${context.length} previous messages]\n`
    }

    response += `[Response would be generated using: ${systemPrompt.slice(0, 100)}...]\n`

    return response
  }

  // ============================================================
  // MCP Protocol Implementation
  // ============================================================

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const { transport } = this.config

    if (transport === 'stdio') {
      await this.startStdioServer()
    } else if (transport === 'http') {
      await this.startHTTPServer()
    } else {
      throw new Error(`Unknown transport: ${transport}`)
    }

    this.emitter.emit('serverStart', { transport })
  }

  /**
   * Start stdio-based MCP server (for Claude Desktop)
   */
  private async startStdioServer(): Promise<void> {
    const stdin = process.stdin
    const stdout = process.stdout

    // Handle incoming messages from stdin
    stdin.setEncoding('utf-8')
    let buffer = ''

    for await (const chunk of stdin) {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim()) {
          await this.handleMessage(JSON.parse(line))
        }
      }
    }
  }

  /**
   * Start HTTP-based MCP server
   */
  private async startHTTPServer(): Promise<void> {
    const port = this.config.port || 3000

    const server = createHttpServer(async (req, res) => {
      if (req.method === 'POST' && req.url === '/') {
        let body = ''

        req.on('data', (chunk) => {
          body += chunk
        })

        req.on('end', async () => {
          try {
            const message = JSON.parse(body) as MCPMessage
            const response = await this.handleMessage(message)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(response))
          } catch (error) {
            res.writeHead(400)
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              id: body?.id,
              error: {
                code: -32700,
                message: 'Parse error'
              }
            }))
          }
        })
      } else if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok', server: 'mcp' }))
      } else {
        res.writeHead(404)
        res.end()
      }
    })

    server.listen(port, () => {
      console.error(`MCP server listening on port ${port}`)
    })

    this.server = server
  }

  /**
   * Handle incoming MCP message
   */
  private async handleMessage(message: MCPMessage): Promise<MCPMessage> {
    // Handle method requests
    if (message.method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {}
          },
          serverInfo: {
            name: 'idiomark-projection',
            version: '1.0.0'
          }
        }
      }
    }

    if (message.method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          tools: this.getTools()
        }
      }
    }

    if (message.method === 'resources/list') {
      return {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          resources: this.getResources()
        }
      }
    }

    if (message.method === 'tools/call') {
      const { name, arguments: args } = message.params as { name: string; arguments: Record<string, unknown> }
      const result = await this.handleToolCall(name, args)
      return {
        jsonrpc: '2.0',
        id: message.id,
        result
      }
    }

    // Unknown method
    return {
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32601,
        message: 'Method not found',
        data: message.method
      }
    }
  }

  // ============================================================
  // BaseAdapter Implementation
  // ============================================================

  async transform(input: { message: string }): Promise<{ content: string; format: string; metadata?: Record<string, unknown> }> {
    // Apply personality to message
    const response = await this.applyPersonality(input.message)
    return {
      content: response,
      format: 'text'
    }
  }

  async send(output: { content: string; format: string }): Promise<{ success: boolean; content?: string; error?: string; duration?: number }> {
    // For MCP, "sending" means responding to tool calls
    // The actual send is handled by the MCP protocol layer
    return {
      success: true,
      content: output.content
    }
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close()
      this.server = null
    }
    await this.dispose()
  }
}
