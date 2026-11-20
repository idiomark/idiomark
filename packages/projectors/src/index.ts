/**
 * Projection Adapters Package
 *
 * Exports adapters for applying Idiomark personalities to external systems
 */

// Base adapter
export { BaseProjectionAdapter } from './base'
export type {
  ProjectionAdapterConfig,
  ProjectionInput,
  ProjectionOutput,
  ProjectionOptions,
  ResponseResult,
  PersonalityMode,
  ProjectionHealth,
  ProjectionMetrics,
  ConversationContext,
  Message
} from './types'

// MCP adapter
export { MCPServer } from './mcp'
export type {
  MCPTransport,
  MCPMessage,
  MCPError,
  MCPTool,
  MCPResource,
  MCPServerConfig,
  MCPToolResult,
  GenerateResponseArgs,
  GetPersonalityArgs,
  GetSystemPromptArgs
} from './mcp/types'

// UCP adapter
export { UCPAdapter } from './ucp'
export type {
  UCPAdapterOptions,
  UCPProfile,
  UCPCapabilities,
  UCPPersonalityIntegration,
  UCPTaxCalculation,
  UCPShippingOptions,
  UCPServeResult
} from './ucp/types'

// HTTP adapter
export { HTTPServerAdapter } from './http'
export type {
  HTTPServerOptions,
  HTTPRequest,
  HTTPResponse
} from './types'

// Gaming adapters
export { GameAdapter } from './gaming/base'
export type {
  GameServerConfig,
  GamingAdapterOptions
} from './gaming/base'

export { MinecraftAdapter, type MinecraftAdapterOptions } from './gaming/minecraft'

export { RobloxAdapter } from './gaming/roblox'

export { VRChatAdapter } from './gaming/vrchat'

export { FortniteAdapter, type FortniteAdapterOptions } from './gaming/fortnite'
