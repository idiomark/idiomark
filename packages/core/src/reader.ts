/**
 * Idiomark Reader
 *
 * Main consumer class for loading Idiomark files and generating personality-based responses
 */

import type { IdiomarkFile, Personality } from './types'
import type { GenerationOptions, GenerationResult, StreamCallback } from './generator'
import { loadIdiomarkFile, type LoadResult } from './loader'
import { IdiomarkGenerator } from './generator'
import { buildSystemPrompt } from './personality-prompt'

export interface ReaderOptions extends GenerationOptions {
  /** Auto-load personality from file */
  personality?: Personality
}

/**
 * Idiomark Reader - Main entry point for consuming Idiomark files
 *
 * Example usage:
 * ```ts
 * const reader = await IdiomarkReader.fromFile('./my-personality.idiomark.json', {
 *   provider: 'anthropic',
 *   apiKey: process.env.ANTHROPIC_API_KEY
 * })
 *
 * const response = await reader.respond("What's your opinion on TypeScript?")
 * console.log(response.content)
 * ```
 */
export class IdiomarkReader {
  private generator: IdiomarkGenerator
  private loadResult: LoadResult | null = null

  private constructor(
    public readonly idiomarkFile: IdiomarkFile,
    options: ReaderOptions = {}
  ) {
    this.generator = new IdiomarkGenerator(idiomarkFile.personality, options)
  }

  /**
   * Create a IdiomarkReader from a file path
   */
  static async fromFile(
    path: string,
    options: ReaderOptions = {}
  ): Promise<IdiomarkReader> {
    const loadResult = await loadIdiomarkFile(path, { validate: true, throwOnNotFound: true })

    if (!loadResult) {
      throw new Error('Failed to load Idiomark file')
    }

    const reader = new IdiomarkReader(loadResult.file, options)
    reader.loadResult = loadResult

    return reader
  }

  /**
   * Create a IdiomarkReader from a IdiomarkFile object
   */
  static fromIdiomarkFile(
    file: IdiomarkFile,
    options: ReaderOptions = {}
  ): IdiomarkReader {
    return new IdiomarkReader(file, options)
  }

  /**
   * Create a IdiomarkReader from a personality object
   */
  static fromPersonality(
    personality: Personality,
    options: ReaderOptions = {}
  ): IdiomarkReader {
    // Create a minimal Idiomark file
    const file: IdiomarkFile = {
      idiomark: '1.0.0',
      id: `reader_${Date.now()}`,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      metadata: {
        entity: {
          type: 'human',
          sources: ['direct']
        },
        extraction: {
          date: new Date().toISOString(),
          sample_size: 0,
          timeframe: {
            from: new Date().toISOString(),
            to: new Date().toISOString()
          }
        }
      },
      personality
    }

    return new IdiomarkReader(file, options)
  }

  /**
   * Generate a response to a message
   */
  async respond(message: string): Promise<GenerationResult> {
    return this.generator.generate(message)
  }

  /**
   * Generate a streaming response
   */
  async respondStream(
    message: string,
    callback: StreamCallback
  ): Promise<void> {
    return this.generator.generateStream(message, callback)
  }

  /**
   * Start an interactive chat session
   */
  async chat(
    handler: (message: string) => string | Promise<string>,
    options: { exitCommand?: string; greeting?: string } = {}
  ): Promise<void> {
    const { exitCommand = 'exit', greeting } = options

    if (greeting) {
      console.log(greeting)
    }

    while (true) {
      // Get user input
      const userInput = await handler('You: ')
      if (userInput.trim() === exitCommand) {
        break
      }

      // Generate response
      const response = await this.respond(userInput)

      // Display response
      const output = await handler(`${this.idiomarkFile.metadata.entity?.name || 'AI'}: ${response.content}`)

      if (output) {
        console.log(output)
      }
    }
  }

  /**
   * Get the system prompt for the current personality
   */
  getSystemPrompt(): string {
    return buildSystemPrompt(this.idiomarkFile.personality, {
      userName: this.generator['options'].userName,
      task: this.generator['options'].task
    })
  }

  /**
   * Get metadata about the loaded Idiomark file
   */
  getMetadata() {
    return {
      id: this.idiomarkFile.id,
      version: this.idiomarkFile.idiomark,
      created: this.idiomarkFile.created,
      updated: this.idiomarkFile.updated,
      entity: this.idiomarkFile.metadata.entity,
      extraction: this.idiomarkFile.metadata.extraction,
      validator: this.idiomarkFile.metadata.validator,
      loadedFrom: this.loadResult?.path
    }
  }

  /**
   * Get personality summary
   */
  getPersonalitySummary() {
    const p = this.idiomarkFile.personality
    return {
      tone: p.voice.tone,
      attributes: {
        formality: p.voice.formality,
        humor: p.voice.humor,
        sarcasm: p.voice.sarcasm,
        enthusiasm: p.voice.enthusiasm,
        directness: p.voice.directness
      },
      domains: p.domains.map(d => ({ name: d.name, confidence: d.confidence })),
      values: p.values.map(v => ({ name: v.name, sentiment: v.sentiment })),
      topics: p.knowledge.topics
    }
  }

  /**
   * Update the personality
   */
  updatePersonality(personality: Personality): void {
    this.generator.updatePersonality(personality)
    this.idiomarkFile.personality = personality
  }

  /**
   * Update generation options
   */
  updateOptions(options: Partial<GenerationOptions>): void {
    // Update the generator options
    const currentOptions = this.generator['options']
    Object.assign(currentOptions, options)

    // Update system prompt if needed
    if (options.userName !== undefined || options.task !== undefined) {
      this.generator['systemPrompt'] = buildSystemPrompt(this.idiomarkFile.personality, {
        userName: options.userName ?? currentOptions.userName,
        task: options.task ?? currentOptions.task
      })
    }
  }

  /**
   * Add to conversation history
   */
  addHistory(message: { role: 'user' | 'assistant' | 'system'; content: string }): void {
    this.generator.addHistory(message)
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.generator.clearHistory()
  }

  /**
   * Export the Idiomark file as JSON
   */
  toJSON(): IdiomarkFile {
    return { ...this.idiomarkFile }
  }

  /**
   * String representation
   */
  toString(): string {
    const meta = this.getMetadata()
    const summary = this.getPersonalitySummary()
    return JSON.stringify({ metadata: meta, personality: summary }, null, 2)
  }
}

/**
 * Quick load a Idiomark file and create a reader
 */
export async function loadReader(
  path: string,
  options?: ReaderOptions
): Promise<IdiomarkReader> {
  return IdiomarkReader.fromFile(path, options)
}

/**
 * Quick create a reader from personality
 */
export function createReader(
  personality: Personality,
  options?: ReaderOptions
): IdiomarkReader {
  return IdiomarkReader.fromPersonality(personality, options)
}
