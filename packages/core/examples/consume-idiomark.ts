/**
 * Idiomark Consumption Example
 *
 * Demonstrates how to load a Idiomark file and generate personality-based responses
 */

import { IdiomarkReader, loadIdiomarkFile, generateResponse, buildSystemPrompt } from '@idiomark/core'

/**
 * Example 1: Load a Idiomark file and generate a response
 */
async function example1_basicResponse() {
  console.log('=== Example 1: Basic Response ===\n')

  // Load a Idiomark file
  const loadResult = await loadIdiomarkFile('./examples/demo.idiomark.json', {
    validate: true
  })

  if (!loadResult) {
    console.error('Failed to load Idiomark file')
    return
  }

  // Create a reader
  const reader = await IdiomarkReader.fromFile('./examples/demo.idiomark.json', {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY
  })

  // Generate a response
  const response = await reader.respond("What's your opinion on TypeScript?")

  console.log('Response:', response.content)
  console.log('Tokens:', response.tokens)
}

/**
 * Example 2: Streaming responses
 */
async function example2_streamingResponse() {
  console.log('\n=== Example 2: Streaming Response ===\n')

  const reader = await IdiomarkReader.fromFile('./examples/demo.idiomark.json', {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY
  })

  console.log('AI: ')

  // Stream the response
  await reader.respondStream("Tell me about React hooks", (chunk) => {
    if (chunk.type === 'content' && chunk.content) {
      process.stdout.write(chunk.content)
    } else if (chunk.type === 'error') {
      console.error('\nError:', chunk.error)
    } else if (chunk.type === 'done') {
      console.log('\n\n[Stream complete]')
    }
  })
}

/**
 * Example 3: Conversation with history
 */
async function example3_conversationWithHistory() {
  console.log('\n=== Example 3: Conversation with History ===\n')

  const reader = await IdiomarkReader.fromFile('./examples/demo.idiomark.json', {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY
  })

  const questions = [
    "What's your favorite programming language?",
    "Why do you like it?",
    "What frameworks do you use with it?"
  ]

  for (const question of questions) {
    console.log(`User: ${question}`)

    const response = await reader.respond(question)
    console.log(`AI: ${response.content}\n`)

    // Add to history for context
    reader.addHistory({ role: 'user', content: question })
    reader.addHistory({ role: 'assistant', content: response.content })
  }
}

/**
 * Example 4: Get system prompt
 */
async function example4_systemPrompt() {
  console.log('\n=== Example 4: System Prompt ===\n')

  const loadResult = await loadIdiomarkFile('./examples/demo.idiomark.json')

  if (loadResult) {
    const systemPrompt = buildSystemPrompt(loadResult.file.personality, {
      userName: 'Developer',
      task: 'Answer technical questions'
    })

    console.log(systemPrompt)
  }
}

/**
 * Example 5: Quick one-off response
 */
async function example5_quickResponse() {
  console.log('\n=== Example 5: Quick Response ===\n')

  const loadResult = await loadIdiomarkFile('./examples/demo.idiomark.json')

  if (loadResult) {
    const response = await generateResponse(
      loadResult.file.personality,
      "What's the best way to learn a new framework?",
      {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY
      }
    )

    console.log(response.content)
  }
}

/**
 * Example 6: Personality inspection
 */
async function example6_inspectPersonality() {
  console.log('\n=== Example 6: Personality Inspection ===\n')

  const reader = await IdiomarkReader.fromFile('./examples/demo.idiomark.json')

  // Get metadata
  const metadata = reader.getMetadata()
  console.log('Idiomark File Metadata:')
  console.log('  ID:', metadata.id)
  console.log('  Version:', metadata.version)
  console.log('  Entity:', metadata.entity.name || 'Unknown')
  console.log('  Sources:', metadata.entity.sources)
  console.log('  Created:', metadata.created)

  // Get personality summary
  const summary = reader.getPersonalitySummary()
  console.log('\nPersonality Summary:')
  console.log('  Tone:', summary.tone.primary, `(confidence: ${summary.tone.confidence})`)
  console.log('  Attributes:', summary.attributes)
  console.log('  Domains:', summary.domains.map(d => `${d.name} (${d.confidence})`))
  console.log('  Values:', summary.values.map(v => `${v.name} (${v.sentiment})`))
  console.log('  Topics:', summary.topics.primary)
}

/**
 * Example 7: Create reader from personality object
 */
async function example7_readerFromPersonality() {
  console.log('\n=== Example 7: Reader from Personality ===\n')

  // Create a custom personality
  const customPersonality = {
    voice: {
      tone: { primary: 'professional', confidence: 0.9 },
      formality: 0.8,
      humor: 0.2,
      sarcasm: 0.1,
      enthusiasm: 0.5,
      directness: 0.7
    },
    patterns: {
      sentence_length: { mean: 15, stddev: 4 },
      emoji_usage: { frequency: 'low' as const, top_emojis: [] },
      punctuation: {
        exclamation_frequency: 0.05,
        question_frequency: 0.1,
        ellipsis_usage: 'low' as const
      }
    },
    domains: [{ name: 'customer-service', confidence: 0.95 }],
    values: [{ name: 'helpfulness', sentiment: 'positive' as const, confidence: 0.9 }],
    knowledge: {
      frequent_terms: ['thank', 'help', 'assist'],
      mentions: { organizations: [] },
      topics: { primary: ['support'] }
    }
  }

  const reader = IdiomarkReader.fromPersonality(customPersonality, {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY
  })

  const response = await reader.respond("I'm having trouble with my account")
  console.log('Response:', response.content)
}

// Run examples
async function main() {
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error('Please set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable')
    process.exit(1)
  }

  try {
    // Uncomment the example you want to run:
    await example1_basicResponse()
    // await example2_streamingResponse()
    // await example3_conversationWithHistory()
    // await example4_systemPrompt()
    // await example5_quickResponse()
    // await example6_inspectPersonality()
    // await example7_readerFromPersonality()
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
