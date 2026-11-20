/**
 * Idiomark MCP Server Types
 *
 * Type definitions for MCP protocol, Idiomark file integration,
 * and server configuration.
 */

import type { IdiomarkFile } from '@idiomark/core'

// ============================================================================
// MCP Protocol Types (Model Context Protocol 2024-11-05)
// ============================================================================

export type MCPVersion = '2024-11-05'

export interface JSONRPCMessage {
  jsonrpc: '2.0'
  id?: string | number | null
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
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPCapabilities {
  tools?: Record<string, unknown>
  resources?: Record<string, unknown>
}

export interface MCPServerInfo {
  name: string
  version: string
}

export interface MCPInitializeResult {
  protocolVersion: MCPVersion
  capabilities: MCPCapabilities
  serverInfo: MCPServerInfo
}

// ============================================================================
// LLM Provider Types
// ============================================================================

export type LLMProviderType = 'ollama' | 'lmstudio' | 'localai' | 'jan' | 'anthropic' | 'openai'

export interface LocalLLMConfig {
  type: 'ollama' | 'lmstudio' | 'localai' | 'jan'
  model: string
  baseUrl?: string
}

export interface CloudLLMConfig {
  type: 'anthropic' | 'openai'
  apiKey: string
  model?: string
  baseUrl?: string
}

export type LLMConfig = LocalLLMConfig | CloudLLMConfig

export interface LLMResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

// ============================================================================
// Server Mode Types
// ============================================================================

export type ServerMode = 'context' | 'engine'

export interface ContextModeConfig {
  mode: 'context'
  // Context mode is read-only - no LLM config needed
}

export interface EngineModeConfig {
  mode: 'engine'
  llm: LLMConfig
  acceptDataUpload?: boolean // For cloud LLMs
}

export type ServerModeConfig = ContextModeConfig | EngineModeConfig

// ============================================================================
// Server Configuration
// ============================================================================

export interface IdiomarkMCPServerConfig {
  idiomarkFile: string | IdiomarkFile
  transport?: 'stdio' | 'http'
  port?: number // For HTTP transport
  mode?: ServerModeConfig
  keyProvider?: () => string | Promise<string> // For encrypted Idiomark files
}

export interface ToolContext {
  mode: ServerMode
  personality: IdiomarkFile | null
  llm?: LLMConfig
}

// ============================================================================
// Tool Input/Output Types
// ============================================================================

export interface QueryDomainInput {
  domain: string
}

export interface CheckValueConflictInput {
  text: string
}

export interface GetVoiceInput {
  // Empty input
}

export interface GetSystemPromptInput {
  mode?: 'strict' | 'balanced' | 'subtle'
  includeInstructions?: boolean
}

export interface GenerateResponseInput extends GetSystemPromptInput {
  message: string
  context?: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
}

export interface ApplyVoiceInput {
  text: string
  strength?: number // 0-1, default 1
}

export interface SuggestActionsInput {
  situation: string
  options?: string[]
}

export interface EvaluateAlignmentInput {
  text: string
  aspect?: 'voice' | 'values' | 'overall'
}

// ============================================================================
// Tool Result Types
// ============================================================================

export interface ToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    uri?: string
  }>
  isError?: boolean
}

// ============================================================================
// Encryption Types
// ============================================================================

export interface EncryptedIdiomarkFile {
  idiomark: string
  encrypted: true
  algorithm: 'aes-256-gcm'
  ciphertext: string
  metadata: {
    entity: {
      name?: string
      type: 'human' | 'brand' | 'bot' | 'fictional'
    }
    created: string
    updated: string
  }
}

export function isEncryptedIdiomarkFile(file: unknown): file is EncryptedIdiomarkFile {
  return (
    typeof file === 'object' &&
    file !== null &&
    'idiomark' in file &&
    'encrypted' in file &&
    (file as EncryptedIdiomarkFile).encrypted === true
  )
}
