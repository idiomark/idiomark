/**
 * Engine Mode (Generative)
 *
 * Unlike Context mode (read-only), Engine mode generates responses with
 * personality applied using local or cloud LLMs.
 *
 * Privacy: Local LLMs keep data on-device. Cloud LLMs require explicit consent.
 */

import type { IdiomarkFile } from '@idiomark/core'
import type {
  MCPTool,
  ToolResult,
  LLMConfig,
  LocalLLMConfig,
  CloudLLMConfig,
  GenerateResponseInput,
  ApplyVoiceInput,
  SuggestActionsInput,
  EvaluateAlignmentInput
} from '../types.js'

/**
 * Get all tools available in Engine mode (includes Context tools + generative tools)
 */
export function getEngineTools(personality: IdiomarkFile): MCPTool[] {
  const { voice } = personality.personality || {}

  return [
    // Generative tools (require LLM)
    {
      name: 'generate_response',
      description: `Generate AI response with personality applied. Uses ${voice?.tone?.primary || 'neutral'} tone, ${voice?.formality ? Math.round(voice.formality * 100) : 50}% formality, ${voice?.directness ? Math.round(voice.directness * 100) : 50}% directness.`,
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The input message to respond to'
          },
          mode: {
            type: 'string',
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
      name: 'apply_voice',
      description: 'Transform text to match personality voice. Rewrites input while preserving meaning.',
      inputSchema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Text to transform'
          },
          strength: {
            type: 'number',
            description: 'How strongly to apply voice (0-1, default 1)',
            minimum: 0,
            maximum: 1
          }
        },
        required: ['text']
      }
    },
    {
      name: 'suggest_actions',
      description: 'Suggest actions based on personality values and domains',
      inputSchema: {
        type: 'object',
        properties: {
          situation: {
            type: 'string',
            description: 'Describe the situation requiring action'
          },
          options: {
            type: 'array',
            description: 'Optional predefined options to consider',
            items: { type: 'string' }
          }
        },
        required: ['situation']
      }
    },
    {
      name: 'evaluate_alignment',
      description: 'Evaluate how well text aligns with personality (voice, values, overall)',
      inputSchema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Text to evaluate'
          },
          aspect: {
            type: 'string',
            enum: ['voice', 'values', 'overall'],
            default: 'overall'
          }
        },
        required: ['text']
      }
    }
  ]
}

/**
 * Handle generate_response tool call
 */
export async function handleGenerateResponse(
  personality: IdiomarkFile,
  llmConfig: LLMConfig,
  args: GenerateResponseInput
): Promise<ToolResult> {
  const { message, mode = 'balanced', context = [] } = args

  try {
    // Build system prompt from personality
    const systemPrompt = buildSystemPrompt(personality.personality, mode)

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...context,
      { role: 'user', content: message }
    ]

    // Call LLM
    const response = await callLLM(llmConfig, messages)

    return {
      content: [
        {
          type: 'text',
          text: response.content
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
 * Handle apply_voice tool call
 */
export async function handleApplyVoice(
  personality: IdiomarkFile,
  llmConfig: LLMConfig,
  args: ApplyVoiceInput
): Promise<ToolResult> {
  const { text, strength = 1 } = args

  try {
    const systemPrompt = `You are a text transformation specialist. Rewrite the given text to match the provided personality voice while preserving the original meaning. Use strength level: ${Math.round(strength * 100)}%.`

    const personalityPrompt = buildSystemPrompt(personality.personality, 'balanced')

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: personalityPrompt },
      {
        role: 'user',
        content: `Rewrite this text: ${text}`
      }
    ]

    const response = await callLLM(llmConfig, messages)

    return {
      content: [
        {
          type: 'text',
          text: response.content
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
 * Handle suggest_actions tool call
 */
export async function handleSuggestActions(
  personality: IdiomarkFile,
  llmConfig: LLMConfig,
  args: SuggestActionsInput
): Promise<ToolResult> {
  const { situation, options = [] } = args

  try {
    const { personality: profile } = personality
    const values = profile.values || []

    const systemPrompt = `You are an action advisor. Suggest appropriate actions based on the provided personality's core values and the current situation.`

    let personalityContext = 'Personality Values:\n'
    if (values.length > 0) {
      personalityContext += values.map(v => `- ${v.name} (${v.sentiment})`).join('\n')
    } else {
      personalityContext += '- No specific values defined'
    }

    let userPrompt = `Situation: ${situation}`
    if (options.length > 0) {
      userPrompt += `\n\nConsider these options:\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`
    }
    userPrompt += '\n\nSuggest the best action and explain why based on the personality values.'

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: personalityContext },
      { role: 'user', content: userPrompt }
    ]

    const response = await callLLM(llmConfig, messages)

    return {
      content: [
        {
          type: 'text',
          text: response.content
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
 * Handle evaluate_alignment tool call
 */
export async function handleEvaluateAlignment(
  personality: IdiomarkFile,
  llmConfig: LLMConfig,
  args: EvaluateAlignmentInput
): Promise<ToolResult> {
  const { text, aspect = 'overall' } = args

  try {
    const { personality: profile } = personality
    const voice = profile.voice
    const values = profile.values || []

    const systemPrompt = `You are a text analyst. Evaluate how well the given text aligns with a personality profile. Provide a score (0-100) and detailed explanation.`

    let personalityContext = 'Personality Profile:\n\n'
    personalityContext += `Voice:\n`
    personalityContext += `- Tone: ${voice?.tone?.primary || 'neutral'}\n`
    personalityContext += `- Formality: ${voice?.formality ? Math.round(voice.formality * 100) : 50}%\n`
    personalityContext += `- Directness: ${voice?.directness ? Math.round(voice.directness * 100) : 50}%\n`

    if (values.length > 0) {
      personalityContext += `\nCore Values:\n`
      personalityContext += values.map(v => `- ${v.name} (${v.sentiment})`).join('\n')
    }

    const userPrompt = `Evaluate the alignment of this text with the personality above. Focus on: ${aspect}.\n\nText: ${text}\n\nProvide:\n1. Alignment score (0-100)\n2. Strengths\n3. Weaknesses\n4. Suggestions for improvement`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: personalityContext },
      { role: 'user', content: userPrompt }
    ]

    const response = await callLLM(llmConfig, messages)

    return {
      content: [
        {
          type: 'text',
          text: response.content
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
 * Call LLM based on config type
 */
async function callLLM(
  config: LLMConfig,
  messages: Array<{ role: string; content: string }>
): Promise<{ content: string; model: string; usage?: { promptTokens: number; completionTokens: number } }> {
  if (config.type === 'ollama') {
    return await callOllama(config, messages)
  } else if (config.type === 'anthropic') {
    return await callAnthropic(config, messages)
  } else if (config.type === 'openai') {
    return await callOpenAI(config, messages)
  } else {
    throw new Error(`Unsupported LLM type: ${(config as LLMConfig).type}`)
  }
}

/**
 * LLM provider response wire shapes.
 *
 * Response bodies come from external HTTP APIs, so they are parsed as
 * `unknown` and narrowed with the runtime guards below. Only the fields
 * this module reads are modelled, and all of them are optional because
 * providers may omit them (call sites fall back defensively).
 */
interface OllamaChatResponse {
  model?: string
  message?: { content?: string }
}

interface AnthropicMessagesResponse {
  model?: string
  content?: Array<{ text?: string }>
  usage?: { input_tokens?: number; output_tokens?: number }
}

interface OpenAIChatCompletionResponse {
  model?: string
  choices?: Array<{ message?: { content?: string | null } }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || typeof value === 'number'
}

function isOllamaChatResponse(value: unknown): value is OllamaChatResponse {
  if (!isRecord(value)) return false
  if (!isOptionalString(value.model)) return false
  if (value.message !== undefined) {
    if (!isRecord(value.message)) return false
    if (!isOptionalString(value.message.content)) return false
  }
  return true
}

function isAnthropicMessagesResponse(value: unknown): value is AnthropicMessagesResponse {
  if (!isRecord(value)) return false
  if (!isOptionalString(value.model)) return false
  if (value.content !== undefined) {
    if (!Array.isArray(value.content)) return false
    for (const block of value.content) {
      if (!isRecord(block) || !isOptionalString(block.text)) return false
    }
  }
  if (value.usage !== undefined) {
    if (!isRecord(value.usage)) return false
    if (!isOptionalNumber(value.usage.input_tokens)) return false
    if (!isOptionalNumber(value.usage.output_tokens)) return false
  }
  return true
}

function isOpenAIChatCompletionResponse(value: unknown): value is OpenAIChatCompletionResponse {
  if (!isRecord(value)) return false
  if (!isOptionalString(value.model)) return false
  if (value.choices !== undefined) {
    if (!Array.isArray(value.choices)) return false
    for (const choice of value.choices) {
      if (!isRecord(choice)) return false
      if (choice.message !== undefined) {
        if (!isRecord(choice.message)) return false
        if (!isOptionalString(choice.message.content) && choice.message.content !== null) {
          return false
        }
      }
    }
  }
  if (value.usage !== undefined) {
    if (!isRecord(value.usage)) return false
    if (!isOptionalNumber(value.usage.prompt_tokens)) return false
    if (!isOptionalNumber(value.usage.completion_tokens)) return false
  }
  return true
}

/**
 * Call Ollama (local LLM)
 */
async function callOllama(
  config: LocalLLMConfig,
  messages: Array<{ role: string; content: string }>
): Promise<{ content: string; model: string; usage?: { promptTokens: number; completionTokens: number } }> {
  const baseUrl = config.baseUrl || 'http://localhost:11434'
  const model = config.model

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'system' : m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      })),
      stream: false
    })
  })

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`)
  }

  const json: unknown = await response.json()
  const data: OllamaChatResponse = isOllamaChatResponse(json) ? json : {}
  return {
    content: data.message?.content || '',
    model: data.model || model
  }
}

/**
 * Call Anthropic (cloud LLM)
 */
async function callAnthropic(
  config: CloudLLMConfig,
  messages: Array<{ role: string; content: string }>
): Promise<{ content: string; model: string; usage?: { promptTokens: number; completionTokens: number } }> {
  const baseUrl = config.baseUrl || 'https://api.anthropic.com/v1/messages'
  const model = config.model || 'claude-3-5-sonnet-20241022'

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: messages
    })
  })

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.statusText}`)
  }

  const json: unknown = await response.json()
  const data: AnthropicMessagesResponse = isAnthropicMessagesResponse(json) ? json : {}
  return {
    content: data.content?.[0]?.text || '',
    model: data.model || model,
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0
    }
  }
}

/**
 * Call OpenAI (cloud LLM)
 */
async function callOpenAI(
  config: CloudLLMConfig,
  messages: Array<{ role: string; content: string }>
): Promise<{ content: string; model: string; usage?: { promptTokens: number; completionTokens: number } }> {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1/chat/completions'
  const model = config.model || 'gpt-4o-mini'

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 4096
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const json: unknown = await response.json()
  const data: OpenAIChatCompletionResponse = isOpenAIChatCompletionResponse(json) ? json : {}
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || model,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0
    }
  }
}

/**
 * Build system prompt from personality data (reused from Context mode)
 */
function buildSystemPrompt(
  personality: IdiomarkFile['personality'],
  mode: 'strict' | 'balanced' | 'subtle'
): string {
  const voice = personality.voice
  const values = personality.values || []
  const domains = personality.domains || []

  let prompt = `You are an AI assistant with a specific personality.\n\n`

  const strength = mode === 'strict' ? 1 : mode === 'subtle' ? 0.3 : 0.6

  prompt += `## Voice Characteristics\n\n`
  prompt += `- Tone: ${voice?.tone?.primary || 'neutral'}`
  if (voice?.tone?.secondary) {
    prompt += ` with ${voice.tone.secondary} undertones`
  }
  prompt += `\n`
  prompt += `- Formality: ${voice?.formality ? Math.round(voice.formality * 100) : 50}%\n`
  prompt += `- Directness: ${voice?.directness ? Math.round(voice.directness * 100) : 50}%\n`
  prompt += `- Enthusiasm: ${voice?.enthusiasm ? Math.round(voice.enthusiasm * 100) : 50}%\n`

  if (values.length > 0) {
    prompt += `\n## Core Values\n\n`
    prompt += values.map(v => `- ${v.name} (${v.sentiment})`).join('\n') + '\n'
  }

  if (domains.length > 0) {
    prompt += `\n## Domain Expertise\n\n`
    prompt += domains.map(d => `- ${d.name} (${Math.round(d.confidence * 100)}% confidence)`).join('\n') + '\n'
  }

  prompt += `\n## Application Strength\n\n`
  prompt += `Apply this personality at ${Math.round(strength * 100)}% strength in your responses.\n`

  return prompt
}
