/**
 * Idiomark MCP Server
 *
 * Main server implementation that detects mode (Context vs Engine)
 * and serves appropriate tools and resources.
 *
 * Like Context7 serves code context, this serves personality context.
 */

import { readFileSync } from 'node:fs'
import { createServer as createHttpServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'

import type {
  IdiomarkFile,
  IdiomarkFile as IdiomarkFileNS
} from '@idiomark/core'
import type { loadIdiomarkFile } from '@idiomark/core/loader'
import type {
  JSONRPCMessage,
  MCPTool,
  MCPResource,
  MCPInitializeResult,
  MCPCapabilities,
  IdiomarkMCPServerConfig,
  ServerMode,
  ToolResult,
  ToolContext
} from './types.js'
import { isEncryptedIdiomarkFile } from './types.js'
import * as ContextMode from './modes/context.js'
import * as EngineMode from './modes/engine.js'

// ============================================================================
// Idiomark MCP Server Class
// ============================================================================

export class IdiomarkMCPServer {
  private config: IdiomarkMCPServerConfig
  private personality: IdiomarkFile | null = null
  private mode: ServerMode = 'context'
  private server: any = null
  private messageId = 0

  constructor(config: IdiomarkMCPServerConfig) {
    this.config = config
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    // Load Idiomark file
    await this.loadIdiomarkFile()

    // Detect mode
    this.detectMode()

    // Start server
    const transport = this.config.transport || 'stdio'

    if (transport === 'stdio') {
      await this.startStdioServer()
    } else if (transport === 'http') {
      await this.startHTTPServer()
    } else {
      throw new Error(`Unknown transport: ${transport}`)
    }

    console.error(`Idiomark MCP Server started in ${this.mode} mode`)
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (this.server) {
      this.server.close()
      this.server = null
    }
  }

  /**
   * Get tools based on current mode
   */
  getTools(): MCPTool[] {
    if (!this.personality) {
      return []
    }

    if (this.mode === 'context') {
      return ContextMode.getContextTools(this.personality)
    } else {
      return EngineMode.getEngineTools(this.personality)
    }
  }

  /**
   * Get resources based on current mode
   */
  getResources(): MCPResource[] {
    if (!this.personality) {
      return []
    }

    // Resources are same for both modes
    return ContextMode.getContextResources(this.personality)
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  /**
   * Load Idiomark file from disk
   */
  private async loadIdiomarkFile(): Promise<void> {
    const { idiomarkFile } = this.config

    if (typeof idiomarkFile === 'string') {
      // Load from file path
      const content = readFileSync(idiomarkFile, 'utf-8')
      const data = JSON.parse(content)

      if (isEncryptedIdiomarkFile(data)) {
        // Handle encrypted file
        const key = this.config.keyProvider
          ? await this.config.keyProvider()
          : await this.promptForKey()

        // TODO: Implement decryption
        throw new Error('Encrypted Idiomark files not yet supported')
      } else {
        this.personality = data as IdiomarkFile
      }
    } else {
      // Use provided IdiomarkFile object
      this.personality = idiomarkFile as IdiomarkFile
    }
  }

  /**
   * Detect mode based on config
   */
  private detectMode(): void {
    if (this.config.mode) {
      // Explicit mode config
      this.mode = this.config.mode.mode
    } else {
      // Auto-detect: if llm config exists, use engine mode
      const modeConfig = this.config.mode as any
      if (modeConfig?.llm) {
        this.mode = 'engine'
      } else {
        this.mode = 'context'
      }
    }
  }

  /**
   * Start stdio-based MCP server (for Claude Desktop)
   */
  private async startStdioServer(): Promise<void> {
    const stdin = process.stdin
    const stdout = process.stdout

    stdin.setEncoding('utf-8')
    let buffer = ''

    for await (const chunk of stdin) {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line) as JSONRPCMessage
            const response = await this.handleMessage(message)
            stdout.write(JSON.stringify(response) + '\n')
          } catch (error) {
            const errorResponse: JSONRPCMessage = {
              jsonrpc: '2.0',
              id: null,
              error: {
                code: -32700,
                message: 'Parse error',
                data: String(error)
              }
            }
            stdout.write(JSON.stringify(errorResponse) + '\n')
          }
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
            const message = JSON.parse(body) as JSONRPCMessage
            const response = await this.handleMessage(message)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(response))
          } catch (error) {
            res.writeHead(400)
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              id: null,
              error: {
                code: -32700,
                message: 'Parse error'
              }
            }))
          }
        })
      } else if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          status: 'ok',
          server: 'idiomark-mcp',
          mode: this.mode
        }))
      } else {
        res.writeHead(404)
        res.end()
      }
    })

    server.listen(port, () => {
      console.error(`Idiomark MCP Server listening on port ${port}`)
    })

    this.server = server
  }

  /**
   * Handle incoming MCP message
   */
  private async handleMessage(message: JSONRPCMessage): Promise<JSONRPCMessage> {
    if (message.method === 'initialize') {
      return this.handleInitialize(message)
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
      return await this.handleToolCall(message)
    }

    if (message.method === 'resources/read') {
      return await this.handleResourceRead(message)
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

  /**
   * Handle initialize request
   */
  private handleInitialize(message: JSONRPCMessage): JSONRPCMessage {
    const serverInfo: MCPInitializeResult = {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {}
      },
      serverInfo: {
        name: 'idiomark-mcp',
        version: '1.0.0'
      }
    }

    return {
      jsonrpc: '2.0',
      id: message.id,
      result: serverInfo
    }
  }

  /**
   * Handle tool call
   */
  private async handleToolCall(message: JSONRPCMessage): Promise<JSONRPCMessage> {
    const { name, arguments: args } = message.params as { name: string; arguments: Record<string, unknown> }

    try {
      let result: ToolResult

      if (this.mode === 'context') {
        result = await this.handleContextTool(name, args)
      } else {
        result = await this.handleEngineTool(name, args)
      }

      return {
        jsonrpc: '2.0',
        id: message.id,
        result
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        result: {
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
  }

  /**
   * Handle Context mode tool call
   */
  private async handleContextTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!this.personality) {
      throw new Error('No personality loaded')
    }

    switch (name) {
      case 'query_domain':
        return await ContextMode.handleQueryDomain(this.personality, args as any)
      case 'check_value_conflict':
        return await ContextMode.handleCheckValueConflict(this.personality, args as any)
      case 'get_voice':
        return await ContextMode.handleGetVoice(this.personality)
      case 'get_system_prompt':
        return await ContextMode.handleGetSystemPrompt(this.personality, args as any)
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  }

  /**
   * Handle Engine mode tool call
   */
  private async handleEngineTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!this.personality) {
      throw new Error('No personality loaded')
    }

    const llmConfig = (this.config.mode as any)?.llm
    if (!llmConfig) {
      throw new Error('Engine mode requires LLM configuration')
    }

    switch (name) {
      case 'generate_response':
        return await EngineMode.handleGenerateResponse(this.personality, llmConfig, args as any)
      case 'apply_voice':
        return await EngineMode.handleApplyVoice(this.personality, llmConfig, args as any)
      case 'suggest_actions':
        return await EngineMode.handleSuggestActions(this.personality, llmConfig, args as any)
      case 'evaluate_alignment':
        return await EngineMode.handleEvaluateAlignment(this.personality, llmConfig, args as any)
      default:
        // Fall through to context tools
        return await this.handleContextTool(name, args)
    }
  }

  /**
   * Handle resource read
   */
  private async handleResourceRead(message: JSONRPCMessage): Promise<JSONRPCMessage> {
    const { uri } = message.params as { uri: string }

    if (!this.personality) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32602,
          message: 'No personality loaded'
        }
      }
    }

    let content: unknown

    switch (uri) {
      case 'idiomark:///personality':
        content = this.personality
        break
      case 'idiomark:///metadata':
        content = this.personality.metadata
        break
      case 'idiomark:///voice':
        content = this.personality.personality?.voice
        break
      case 'idiomark:///values':
        content = this.personality.personality?.values
        break
      case 'idiomark:///domains':
        content = this.personality.personality?.domains
        break
      case 'idiomark:///knowledge':
        content = this.personality.personality?.knowledge
        break
      case 'idiomark:///patterns':
        content = this.personality.personality?.patterns
        break
      default:
        return {
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32602,
            message: 'Resource not found',
            data: uri
          }
        }
    }

    return {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(content, null, 2)
          }
        ]
      }
    }
  }

  /**
   * Prompt user for encryption key (for encrypted Idiomark files)
   */
  private async promptForKey(): Promise<string> {
    // TODO: Implement key prompting
    throw new Error('Key prompting not yet implemented')
  }
}
