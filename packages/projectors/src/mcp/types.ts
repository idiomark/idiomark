/**
 * MCP (Model Context Protocol) Types
 *
 * Types for implementing MCP servers and clients
 * that expose Idiomark personalities as tools/resources
 */

import type { IdiomarkFile } from '@idiomark/core'

// ============================================================
// Protocol Types
// ============================================================

export type MCPTransport = 'stdio' | 'http'

export interface MCPMessage {
  jsonrpc: '2.0'
  id: string | number
  method?: string
  params?: unknown
  result?: unknown
  error?: MCPError
}

export interface MCPError {
  code: number
  message: string
  data?: unknown
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, MCPProperty>
    required?: string[]
  }
}

export interface MCPProperty {
  type: string
  description?: string
  enum?: string[]
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPCapabilities {
  tools: boolean
  resources: boolean
  prompts?: boolean
  logging?: boolean
}

// ============================================================
// Server Types
// ============================================================

export interface MCPServerConfig {
  transport: MCPTransport
  port?: number
  personality: IdiomarkFile
  provider?: 'anthropic' | 'openai' | 'auto'
  model?: string
  onToolCall?: (toolName: string, args: Record<string, unknown>) => Promise<unknown>
  onResourceRead?: (uri: string) => Promise<unknown>
}

export interface MCPServerInstance {
  start(): Promise<void>
  stop(): Promise<void>
  sendMessage(message: MCPMessage): Promise<MCPMessage>
}

// ============================================================
// Tool Call Results
// ============================================================

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: unknown
  }>
  isError?: boolean
}

export interface GenerateResponseArgs {
  message: string
  mode?: 'strict' | 'balanced' | 'subtle'
  context?: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
}

export interface GetPersonalityArgs {
  section?: 'voice' | 'values' | 'domains' | 'knowledge' | 'all'
}

export interface GetSystemPromptArgs {
  mode?: 'strict' | 'balanced' | 'subtle'
  includeInstructions?: boolean
}
