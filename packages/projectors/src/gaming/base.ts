/**
 * Gaming/Virtual World Adapter Template
 *
 * Base template for game integrations
 * Can be extended for specific games (Minecraft, Roblox, VR, etc.)
 */

import type { IdiomarkFile } from '@idiomark/core'
import { BaseProjectionAdapter } from '../base'
import type {
  ProjectionInput,
  ProjectionOutput,
  ResponseResult
} from '../types'

// ============================================================
// Game Server Configuration
// ============================================================

export interface GameServerConfig {
  /** Game server host */
  host: string
  /** Server port (default: 25565) */
  port?: number
  /** RCON port for remote commands */
  rconPort?: number
  /** RCON password */
  rconPassword?: string
  /** WebSocket port */
  wsPort?: number
  /** API key for game APIs */
  apiKey?: string
  /** Bot token */
  botToken?: string
}

export interface GamingAdapterOptions {
  serverConfig: GameServerConfig
  /** Idiomark personality to apply */
  personality: IdiomarkFile
}

// ============================================================
// Base Gaming Adapter
// ============================================================

/**
 * Base adapter for gaming platforms and virtual worlds
 *
 * Supports:
 * - In-game chat/NPC personality injection
 * - Player chat responses with personality
 * - Server command handling
 * - Character avatar customization
 * - Virtual world social interactions
 */
export abstract class GameAdapter extends BaseProjectionAdapter {
  protected personality: IdiomarkFile | null = null

  constructor(options: GamingAdapterOptions) {
    super(`${options.game}-adapter`, { name: options.name })
    this.personality = options.personality
  }

  // ============================================================
  // Abstract Methods (game-specific)
  // ============================================================

  /**
   * Connect to game server
   */
  abstract connect(): Promise<void>

  /**
   * Disconnect from game server
   */
  abstract disconnect(): Promise<void>

  /**
   * Send message/commands to game
   */
  abstract sendToGame(message: string): Promise<void>

  // ============================================================
  // Personality Application for Gaming
  // ============================================================

  /**
   * Apply personality to in-game chat message
   */
  protected async applyPersonalityToChat(input: string): Promise<string> {
    if (!this.personality) {
      throw new Error('Personality not loaded')
    }

    const { buildSystemPrompt } = await import('@idiomark/inference')
    const systemPrompt = buildSystemPrompt(this.personality, 'balanced')

    // Format for game chat
    const personality = this.personality.personality
    const voice = personality?.voice
    const tone = voice?.tone?.primary || 'neutral'

    let response = `[${tone} tone] ` + input

    // Add personality markers
    if (voice?.emoji_usage?.frequency && voice.emoji_usage.frequency > 0.3) {
      response += this.getRandomEmoji(personality)
    }

    return response
  }

  /**
   * Get personality prefix based on traits
   */
  protected buildPersonalityPrefix(): string {
    const personality = this.personality?.personality
    const voice = personality?.voice
    const values = personality?.values || []

    const prefixes: string[] = []

    // Add value-based prefixes
    for (const value of values) {
      if (value.name === 'humor') {
        prefixes.push('😄', '😂', '🤭')
      } else if (value.name === 'formality') {
        prefixes.push('Good day,', 'Greetings,')
      } else if (value.name === 'enthusiasm') {
        prefixes.push('Hey there!', 'Woohoo!')
      }
    }

    // Add tone-based prefixes
    if (voice?.tone?.primary === 'casual') {
      prefixes.push('Yo,', 'Hey,', 'Sup,')
    } else if (voice?.tone?.primary === 'formal') {
      prefixes.push('Greetings,', 'Welcome,')
      }

    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)] || ''
    return randomPrefix
  }

  /**
   * Get random emoji from personality
   */
  protected getRandomEmoji(personality: any): string {
    const emojis = personality?.knowledge?.frequent_terms || []
    const emojiEmojis = emojis.filter((e: string) =>
      /^[\u{1F300}-\u{1F9FF}]$/.test(e) ||
      /^[\u2600-\u26FF]$/.test(e) ||
      /^[\u2700-\u27BF]$/.test(e)
    )

    if (emojiEmojis.length > 0) {
      return emojiEmojis[Math.floor(Math.random() * emojiEmojis.length)]
    }
    return ''
  }

  // ============================================================
  // BaseAdapter Implementation
  // ============================================================

  async transform(input: ProjectionInput): Promise<ProjectionOutput> {
    const response = await this.applyPersonalityToChat(input.message)
    return {
      content: response,
      format: 'text'
    }
  }

  async send(output: ProjectionOutput): Promise<ResponseResult> {
    // Game adapters override this with specific game logic
    try {
      await this.sendToGame(output.content)
      return {
        success: true,
        content: output.content
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}
