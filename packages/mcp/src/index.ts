/**
 * Idiomark MCP Server - Main Exports
 *
 * Context7 for personality. Single package with Context (read-only)
 * and Engine (generative) modes.
 *
 * @example
 * ```typescript
 * import { IdiomarkMCPServer } from '@idiomark/mcp'
 *
 * // Context mode (automatic, no LLM)
 * const contextServer = new IdiomarkMCPServer({
 *   idiomarkFile: './me.idiomark'
 * })
 *
 * // Engine mode (local LLM)
 * const engineServer = new IdiomarkMCPServer({
 *   idiomarkFile: './me.idiomark',
 *   mode: {
 *     mode: 'engine',
 *     llm: {
 *       type: 'ollama',
 *       model: 'llama3.2'
 *     }
 *   }
 * })
 *
 * // Engine mode (user's API key)
 * const apiServer = new IdiomarkMCPServer({
 *   idiomarkFile: './me.idiomark',
 *   mode: {
 *     mode: 'engine',
 *     llm: {
 *       type: 'anthropic',
 *       apiKey: process.env.ANTHROPIC_API_KEY
 *     }
 *   }
 * })
 *
 * await server.start()
 * ```
 */

// Re-export server class
export { IdiomarkMCPServer } from './server.js'

// Re-export types
export type {
  IdiomarkMCPServerConfig,
  ServerMode,
  ServerModeConfig,
  ContextModeConfig,
  EngineModeConfig,
  LLMConfig,
  LLMProviderType,
  LocalLLMConfig,
  CloudLLMConfig,
  MCPTool,
  MCPResource,
  ToolResult,
  QueryDomainInput,
  CheckValueConflictInput,
  GetVoiceInput,
  GetSystemPromptInput,
  GenerateResponseInput,
  ApplyVoiceInput,
  SuggestActionsInput,
  EvaluateAlignmentInput
} from './types.js'

// Re-export mode functions (for advanced usage)
export {
  getContextTools,
  getContextResources,
  handleQueryDomain,
  handleCheckValueConflict,
  handleGetVoice,
  handleGetSystemPrompt
} from './modes/context.js'

export {
  getEngineTools,
  handleGenerateResponse,
  handleApplyVoice,
  handleSuggestActions,
  handleEvaluateAlignment
} from './modes/engine.js'
