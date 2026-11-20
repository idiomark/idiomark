/**
 * Context Mode (Read-Only)
 *
 * Like Context7 serves code documentation, Context mode serves
 * personality "documentation" - raw Idiomark data as MCP resources and query tools.
 *
 * Privacy: No external API calls, all data stays local.
 */

import type { IdiomarkFile } from '@idiomark/core'
import type {
  MCPTool,
  MCPResource,
  ToolResult,
  QueryDomainInput,
  CheckValueConflictInput,
  GetVoiceInput,
  GetSystemPromptInput
} from '../types.js'

/**
 * Get all tools available in Context mode
 */
export function getContextTools(_personality: IdiomarkFile): MCPTool[] {
  return [
    {
      name: 'query_domain',
      description: 'Query domain expertise from personality. Returns confidence score and evidence.',
      inputSchema: {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            description: 'Domain name to query (e.g., "rust", "web-development")'
          }
        },
        required: ['domain']
      }
    },
    {
      name: 'check_value_conflict',
      description: 'Check if text conflicts with personality values. Returns analysis of alignment.',
      inputSchema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Text to check against personality values'
          }
        },
        required: ['text']
      }
    },
    {
      name: 'get_voice',
      description: 'Get voice parameters (tone, formality, humor, sarcasm, enthusiasm, directness)',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'get_system_prompt',
      description: 'Get system prompt for this personality with configurable mode',
      inputSchema: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['strict', 'balanced', 'subtle'],
            default: 'balanced',
            description: 'How strongly to apply personality'
          },
          includeInstructions: {
            type: 'boolean',
            default: true,
            description: 'Include personality instructions in the prompt'
          }
        }
      }
    }
  ]
}

/**
 * Get all resources available in Context mode
 */
export function getContextResources(personality: IdiomarkFile): MCPResource[] {
  return [
    {
      uri: 'idiomark:///personality',
      name: 'Personality',
      description: 'Full Idiomark personality file',
      mimeType: 'application/json'
    },
    {
      uri: 'idiomark:///metadata',
      name: 'Metadata',
      description: 'Idiomark file metadata (entity info, extraction details)',
      mimeType: 'application/json'
    },
    {
      uri: 'idiomark:///voice',
      name: 'Voice Profile',
      description: 'Voice characteristics (tone, formality, humor, sarcasm, enthusiasm, directness)',
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
      description: 'Areas of expertise and interest with confidence scores',
      mimeType: 'application/json'
    },
    {
      uri: 'idiomark:///knowledge',
      name: 'Knowledge Graph',
      description: 'Frequent terms, mentions (people, projects, organizations), and topics',
      mimeType: 'application/json'
    },
    {
      uri: 'idiomark:///patterns',
      name: 'Communication Patterns',
      description: 'Writing patterns (sentence length, emoji usage, punctuation)',
      mimeType: 'application/json'
    }
  ]
}

/**
 * Handle query_domain tool call
 */
export async function handleQueryDomain(
  personality: IdiomarkFile,
  args: QueryDomainInput
): Promise<ToolResult> {
  const { domain } = args
  const { personality: profile } = personality

  const domainData = profile.domains?.find((d: IdiomarkFile['personality']['domains'][number]) =>
    d.name.toLowerCase() === domain.toLowerCase()
  )

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          found: !!domainData,
          domain: domainData || null,
          message: domainData
            ? `Domain "${domain}" found with ${Math.round(domainData.confidence * 100)}% confidence`
            : `Domain "${domain}" not found in personality`
        }, null, 2)
      }
    ]
  }
}

/**
 * Handle check_value_conflict tool call
 */
export async function handleCheckValueConflict(
  personality: IdiomarkFile,
  args: CheckValueConflictInput
): Promise<ToolResult> {
  const { text } = args
  const { personality: profile } = personality

  // Simple value matching based on sentiment and keywords
  const values = profile.values || []
  const textLower = text.toLowerCase()

  const conflicts = values.filter((v: IdiomarkFile['personality']['values'][number]) => {
    if (v.sentiment === 'positive') {
      // Check if text contains negative sentiment indicators
      const negativeWords = ['hate', 'terrible', 'awful', 'worst', 'bad', 'suck']
      return negativeWords.some(word => textLower.includes(word))
    }
    if (v.sentiment === 'negative') {
      // Check if text contains positive sentiment indicators
      const positiveWords = ['love', 'great', 'awesome', 'best', 'good', 'excellent']
      return positiveWords.some(word => textLower.includes(word))
    }
    return false
  })

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          hasConflict: conflicts.length > 0,
          conflicts: conflicts.map((c: IdiomarkFile['personality']['values'][number]) => ({ name: c.name, sentiment: c.sentiment })),
          message: conflicts.length > 0
            ? `Found ${conflicts.length} potential value conflicts`
            : 'No value conflicts detected'
        }, null, 2)
      }
    ]
  }
}

/**
 * Handle get_voice tool call
 */
export async function handleGetVoice(
  personality: IdiomarkFile
): Promise<ToolResult> {
  const { personality: profile } = personality
  const voice = profile.voice

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          tone: voice?.tone || { primary: 'neutral', confidence: 0.5 },
          formality: voice?.formality ?? 0.5,
          humor: voice?.humor ?? 0.5,
          sarcasm: voice?.sarcasm ?? 0.5,
          enthusiasm: voice?.enthusiasm ?? 0.5,
          directness: voice?.directness ?? 0.5
        }, null, 2)
      }
    ]
  }
}

/**
 * Handle get_system_prompt tool call
 */
export async function handleGetSystemPrompt(
  personality: IdiomarkFile,
  args: GetSystemPromptInput
): Promise<ToolResult> {
  const mode = args.mode || 'balanced'
  const { personality: profile } = personality

  // Build system prompt based on mode
  const prompt = buildSystemPrompt(profile, mode, args.includeInstructions ?? true)

  return {
    content: [
      {
        type: 'text',
        text: prompt
      }
    ]
  }
}

/**
 * Build system prompt from personality data
 */
function buildSystemPrompt(
  personality: IdiomarkFile['personality'],
  mode: 'strict' | 'balanced' | 'subtle',
  includeInstructions: boolean
): string {
  const voice = personality.voice
  const values = personality.values || []
  const domains = personality.domains || []

  let prompt = `You are an AI assistant with a specific personality.\n\n`

  if (includeInstructions) {
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
  }

  return prompt
}
