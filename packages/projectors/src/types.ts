/**
 * Projection Adapter Types
 *
 * Types for adapters that apply Idiomark personalities to external systems
 */

import type { IdiomarkFile } from '@idiomark/core'

// Re-exported from base.ts for convenience
export type {
  RateLimiterConfig,
  CacheConfig,
  RetryConfig
} from './base'

// ============================================================
// Core Projection Types
// ============================================================

export interface ProjectionInput {
  /** Incoming message or data to transform with personality */
  message: string
  /** Optional context for multi-turn conversations */
  context?: ConversationContext
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

export interface ConversationContext {
  /** Previous messages in conversation */
  history: Message[]
  /** Current conversation ID */
  conversationId?: string
  /** User identifier */
  userId?: string
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
}

export interface ProjectionOutput {
  /** Transformed output ready for target platform */
  content: string
  /** Format of the output (json, text, markdown, etc.) */
  format: 'text' | 'json' | 'markdown' | 'sse'
  /** Additional platform-specific data */
  metadata?: Record<string, unknown>
}

export interface ResponseResult {
  /** Whether the operation was successful */
  success: boolean
  /** Response content or error message */
  content?: string
  /** Error details if unsuccessful */
  error?: string
  /** Milliseconds taken to process */
  duration?: number
  /** Tokens used (if applicable) */
  tokens?: {
    input: number
    output: number
    total: number
  }
}

export interface ProjectionOptions {
  /** Idiomark personality to apply */
  personality: IdiomarkFile
  /** Target platform/adapter type */
  target: string
  /** Mode of operation */
  mode: 'server' | 'oneshot' | 'stream'
  /** Provider for LLM (if needed) */
  provider?: 'anthropic' | 'openai' | 'auto'
  /** Model to use */
  model?: string
  /** API key (fallback to env vars) */
  apiKey?: string
  /** Port for server mode */
  port?: number
  /** Transport type (for MCP) */
  transport?: 'stdio' | 'http'
}

// ============================================================
// Response Mode (how strongly to apply personality)
// ============================================================

export type PersonalityMode = 'strict' | 'balanced' | 'subtle'

export interface PersonalityTransformOptions {
  /** How strongly to apply personality */
  mode: PersonalityMode
  /** Include system prompt in output */
  includeSystemPrompt?: boolean
  /** Stream response if supported */
  stream?: boolean
  /** Callback for streaming chunks */
  onChunk?: (chunk: string) => void
}

// ============================================================
// Health & Metrics (mirrors BaseAdapter)
// ============================================================

export interface ProjectionHealth {
  healthy: boolean
  latency?: number
  error?: string
  uptime?: number
}

export interface ProjectionMetrics {
  requests: number
  successes: number
  failures: number
  avgLatency: number
  totalRequestsProcessed: number
}

export interface ProjectionAdapterConfig {
  name: string
  rateLimiter?: RateLimiterConfig
  cache?: CacheConfig
  retry?: RetryConfig
}


// ============================================================
// MCP Types
// ============================================================

export interface MCPTool {
  name: string
  description: string
  inputSchema: MCPInputSchema
}

export interface MCPInputSchema {
  type: 'object'
  properties: Record<string, MCPProperty>
  required?: string[]
}

export interface MCPProperty {
  type: string
  description?: string
}

export interface MCPServerOptions {
  /** Transport method */
  transport: 'stdio' | 'http'
  /** Port for HTTP transport */
  port?: number
  /** Personality to expose as tools */
  personality: IdiomarkFile
  /** Provider for generating responses */
  provider?: 'anthropic' | 'openai' | 'auto'
  /** Model to use */
  model?: string
}

// ============================================================
// UCP Types
// ============================================================

export interface UCPProfile {
  /** Merchant identifier */
  merchant_id: string
  /** Business name */
  business_name: string
  /** Standard UCP capabilities */
  capabilities: UCPCapabilities
  /** Idiomark-infused interaction style */
  interaction_style?: UCPInteractionStyle
  /** Product recommendation strategy using personality */
  product_recommendation_strategy?: UCPRecommendationStrategy
  /** Personality-infused response config */
  personality_infused_responses?: UCPPersonalityResponses
}

export interface UCPCapabilities {
  product_search: boolean
  checkout: boolean
  payment_tokenization: boolean
  inventory_check: boolean
}

export interface UCPInteractionStyle {
  tone?: string
  formality?: number
  directness?: number
  humor?: number
  enthusiasm?: number
}

export interface UCPRecommendationStrategy {
  /** User's values for product alignment */
  values_alignment: string[]
  /** Domain interests */
  domain_preferences: string[]
  /** Match products to user's expressed interests */
  voice_matching: boolean
}

export interface UCPPersonalityResponses {
  enabled: boolean
  system_prompt?: string
}

// ============================================================
// HTTP Server Types
// ============================================================

export interface HTTPServerOptions {
  /** Port to listen on */
  port: number
  /** Personality to apply */
  personality: IdiomarkFile
  /** Provider for generating responses */
  provider?: 'anthropic' | 'openai' | 'auto'
  /** Model to use */
  model?: string
  /** Enable CORS */
  cors?: boolean
}

export interface HTTPRequest {
  message: string
  context?: ConversationContext
  mode?: PersonalityMode
  stream?: boolean
}

export interface HTTPResponse {
  content: string
  mode: PersonalityMode
  tokens?: {
    input: number
    output: number
    total: number
  }
  duration?: number
}
