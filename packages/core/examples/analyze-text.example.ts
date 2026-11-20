/**
 * Example: Analyzing Text for Personality
 *
 * This example demonstrates how to use the Idiomark Protocol
 * to analyze personality from text content.
 */

import { PersonalityAnalyzer, analyzeText, extractFromTextString } from '@idiomark/core'

/**
 * Example 1: Using the convenience function
 */
async function example1() {
  const text = `Just shipped a new feature! The user feedback has been incredible.
  I love building tools that actually help people. Open source is amazing because
  we can all learn from each other. The React community is so welcoming!`

  const result = await extractFromTextString(text, {
    sources: ['twitter'],
    verbose: true,
    analysisOptions: {
      provider: 'mock' // Use 'anthropic' or 'openai' with API keys for real analysis
    }
  })

  console.log('Personality Analysis Result:')
  console.log(JSON.stringify(result.file.personality, null, 2))
  console.log(`Confidence: ${result.confidence.toFixed(2)}`)
}

/**
 * Example 2: Using the analyzer directly with multiple samples
 */
async function example2() {
  const texts = [
    `TypeScript is a game changer for frontend development.
    The type safety catches so many bugs before runtime!`,

    `I've been experimenting with Claude API lately. The quality
    of responses is impressive. Building AI-powered tools is the future.`,

    `Does anyone else find Redux overwhelming? Sometimes I think
    simple state management is better than complex solutions...`
  ]

  const analyzer = new PersonalityAnalyzer({
    provider: 'mock',
    cache: true
  })

  const samples = texts.map((text, i) => ({
    id: `sample_${i}`,
    text,
    timestamp: new Date(Date.now() - i * 86400000).toISOString(),
    platform: 'twitter'
  }))

  const result = await analyzer.analyze(samples)

  console.log('Voice Analysis:')
  console.log(`  Tone: ${result.personality.voice.tone.primary} (${result.personality.voice.tone.secondary || 'none'} secondary)`)
  console.log(`  Formality: ${result.personality.voice.formality.toFixed(2)}`)
  console.log(`  Humor: ${result.personality.voice.humor.toFixed(2)}`)
  console.log(`  Enthusiasm: ${result.personality.voice.enthusiasm.toFixed(2)}`)

  console.log('\nDomain Knowledge:')
  result.personality.domains.forEach(domain => {
    console.log(`  - ${domain.name} (${(domain.confidence * 100).toFixed(0)}% confidence)`)
  })

  console.log('\nValues:')
  result.personality.values.forEach(value => {
    console.log(`  - ${value.name}: ${value.sentiment} (${(value.confidence * 100).toFixed(0)}% confidence)`)
  })
}

/**
 * Example 3: Using with real LLM (Anthropic Claude)
 */
async function example3() {
  const text = `Your sample text here...`

  const result = await extractFromTextString(text, {
    sources: ['blog'],
    analysisOptions: {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 8192
    }
  })

  console.log('Analysis from Claude:')
  console.log(JSON.stringify(result.file.personality, null, 2))
}

/**
 * Example 4: Analyzing large content (chunked)
 */
async function example4() {
  // Simulate large content
  const largeText = Array(100).fill(
    `This is a sample piece of content. It contains various topics and writing patterns.
    The author tends to be casual but can also be technical when discussing programming.
    They use emojis occasionally and seem enthusiastic about their work!`
  ).join('\n\n')

  const result = await analyzeText(largeText, {
    provider: 'mock',
    chunkSize: 5000 // Small chunk size to demonstrate chunking
  })

  console.log(`Analyzed ${result.metadata.totalWords} words`)
  console.log(`Processed ${result.metadata.chunksProcessed} chunks`)
  console.log(`Confidence: ${result.confidence.toFixed(2)}`)
}

// Run examples
async function main() {
  console.log('=== Example 1: Convenience Function ===\n')
  await example1()

  console.log('\n=== Example 2: Direct Analyzer Usage ===\n')
  await example2()

  // Uncomment to run with real API
  // console.log('\n=== Example 3: Real LLM Analysis ===\n')
  // await example3()

  console.log('\n=== Example 4: Large Content Chunking ===\n')
  await example4()
}

main().catch(console.error)
