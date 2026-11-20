/**
 * Example: Extract personality from text using Idiomark SDK
 *
 * Run with: npx tsx examples/extract-personality.ts
 */

import { extractPersonality, validateIdiomarkFile } from '@idiomark/sdk'

async function main() {
  console.log('Idiomark Protocol - Personality Extraction Example\n')

  // Sample texts (e.g., from social media posts)
  const texts = [
    'Just shipped a new feature! 🚀 So excited to see people use it.',
    'The key to good software is listening to users. Always be learning.',
    'Hot take: TypeScript is worth the learning curve. The type safety is amazing.',
    'Working on something cool today. Can\'t wait to share more soon!',
    'Remember: done is better than perfect. Ship it, iterate, improve.',
    'Coffee count: 3. Productivity level: questionable. ☕',
    'Open source is not just code. It\'s community, trust, and shared purpose.',
    'Testing in production is just live debugging with extra steps.'
  ]

  console.log(`Analyzing ${texts.length} text samples...\n`)

  // Extract personality
  const result = await extractPersonality({
    texts,
    source: 'example',
    verbose: true
  })

  // Validate the result
  const validation = validateIdiomarkFile(result.file)

  console.log('\n=== Results ===\n')
  console.log(`Valid: ${validation.valid}`)
  console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`)
  console.log(`Sample size: ${result.metadata.sampleSize}`)
  console.log(`Timeframe: ${result.metadata.timeframe}`)

  console.log('\n=== Personality ===\n')
  console.log('Voice:')
  console.log(`  Formality: ${result.file.personality.voice.formality.toFixed(2)}`)
  console.log(`  Humor: ${result.file.personality.voice.humor.toFixed(2)}`)
  console.log(`  Enthusiasm: ${result.file.personality.voice.enthusiasm.toFixed(2)}`)
  console.log(`  Directness: ${result.file.personality.voice.directness.toFixed(2)}`)

  console.log('\nPatterns:')
  console.log(`  Sentence length (mean): ${result.file.personality.patterns.sentence_length.mean}`)
  console.log(`  Emoji frequency: ${result.file.personality.patterns.emoji_usage.frequency}`)
  console.log(`  Top emojis: ${result.file.personality.patterns.emoji_usage.top_emojis.join(', ')}`)

  if (validation.warnings.length > 0) {
    console.log('\nWarnings:')
    validation.warnings.forEach(w => console.log(`  - ${w}`))
  }

  // Save to file (optional)
  // await result.save('./output')
}

main().catch(console.error)
