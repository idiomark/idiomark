/**
 * MCP (Model Context Protocol) Adapter
 *
 * Exports MCP server implementation for projecting Idiomark personalities
 */

export { MCPServer } from './server'
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
} from './types'
