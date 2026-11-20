import { IdiomarkExtractor } from '@idiomark/core'
import type { IdiomarkResult } from '@idiomark/core'
import type { QuickExtractOptions } from './types'

/**
 * Quick extract personality from text samples
 *
 * @example
 * ```ts
 * import { extractPersonality } from '@idiomark/sdk'
 *
 * const result = await extractPersonality({
 *   texts: [
 *     "I love building things! 🚀",
 *     "Just shipped a new feature.",
 *     "Open source is the future."
 *   ]
 * })
 *
 * console.log(result.personality.voice.formality) // 0.3
 * console.log(result.confidence) // 0.75
 * ```
 */
export async function extractPersonality(options: QuickExtractOptions): Promise<IdiomarkResult> {
  const { texts, source = 'text', timestamps, verbose = false } = options

  const extractor = new IdiomarkExtractor({
    sources: [source],
    sampleSize: texts.length,
    verbose
  })

  return extractor.extractFromText(texts, {
    platform: source,
    timestamps
  })
}

/**
 * Extract personality from a single text string
 */
export async function extractFromText(text: string): Promise<IdiomarkResult> {
  return extractPersonality({ texts: [text] })
}

/**
 * Extract personality from multiple text strings
 */
export async function extractFromTexts(
  texts: string[],
  options?: { source?: string; timestamps?: string[] }
): Promise<IdiomarkResult> {
  return extractPersonality({ texts, ...options })
}
