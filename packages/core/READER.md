# IdiomarkReader - Complete Guide

**Last Updated:** 2026-02-12
**Component:** `@idiomark/core`
**Source:** [reader.ts](src/reader.ts)

---

## Overview

`IdiomarkReader` is the main entry point for consuming Idiomark files. It combines file loading, validation, and response generation into a simple API.

**Key capabilities:**
- Load Idiomark files from disk or objects
- Generate responses with personality
- Interactive chat sessions
- Personality inspection and summaries
- Conversation history management

---

## Quick Start

```typescript
import { IdiomarkReader } from '@idiomark/core'

// Option 1: Load from file
const reader = await IdiomarkReader.fromFile('./my-personality.idiomark.json', {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Option 2: Load from object
const reader = IdiomarkReader.fromIdiomarkFile(idiomarkFile, {
  provider: 'anthropic'
})

// Option 3: Load from personality
const reader = IdiomarkReader.fromPersonality(personality, {
  provider: 'anthropic'
})

// Generate response
const result = await reader.respond('What is your opinion on TypeScript?')
console.log(result.content)
```

---

## Factory Methods

### fromFile()

Create a reader from a Idiomark file on disk.

```typescript
static async fromFile(
  path: string,
  options?: ReaderOptions
): Promise<IdiomarkReader>
```

**Parameters:**
- `path` - File path to `.idiomark.json` or `.idiomark` file
- `options` - Generation options (provider, apiKey, model, etc.)

**Behavior:**
1. Reads file from disk
2. Validates against schema (if validate: true)
3. Throws error if file not found or invalid
4. Creates IdiomarkReader instance with loaded personality

**Returns:** `IdiomarkReader` instance

**Example:**
```typescript
const reader = await IdiomarkReader.fromFile('./profile.idiomark.json', {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
})

const result = await reader.respond('Hello!')
```

---

### fromIdiomarkFile()

Create a reader from an existing IdiomarkFile object.

```typescript
static fromIdiomarkFile(
  file: IdiomarkFile,
  options?: ReaderOptions
): IdiomarkReader
```

**Use case:**
- You already have a IdiomarkFile object (e.g., from extraction)
- Want to start generating responses without saving/loading

**Example:**
```typescript
const idiomarkFile = await extractFromPlatforms({ sources: ['github'] })
const reader = IdiomarkReader.fromIdiomarkFile(idiomarkFile, {
  provider: 'anthropic'
})
```

---

### fromPersonality()

Create a reader from a Personality object directly.

```typescript
static fromPersonality(
  personality: Personality,
  options?: ReaderOptions
): IdiomarkReader
```

**Behavior:**
- Wraps personality in minimal Idiomark file structure
- Creates default metadata (type: 'human', sources: ['direct'])

**Example:**
```typescript
const customPersonality = {
  voice: { tone: { primary: 'professional', confidence: 0.9 } },
  patterns: { sentence_length: { mean: 10, stddev: 2 } },
  domains: [{ name: 'finance', confidence: 0.95 }]
}

const reader = IdiomarkReader.fromPersonality(customPersonality, {
  provider: 'anthropic'
})
```

---

## Instance Methods

### respond()

Generate a response to a user message.

```typescript
async respond(message: string): Promise<GenerationResult>
```

**Parameters:**
- `message` - User message to respond to

**Returns:** `GenerationResult`
```typescript
interface GenerationResult {
  content: string       // Generated response
  model: string        // Model used
  provider: string     // Provider name
  tokens?: {            // Token usage (if available)
    input: number
    output: number
  }
  timestamp: string    // ISO 8601 timestamp
}
```

**Example:**
```typescript
const result = await reader.respond('Explain the concept of closures in JavaScript.')

console.log('Response:', result.content)
console.log('Tokens:', result.tokens)
```

---

### respondStream()

Generate a streaming response using Server-Sent Events.

```typescript
async respondStream(
  message: string,
  callback: StreamCallback
): Promise<void>
```

**Parameters:**
- `message` - User message to respond to
- `callback` - Function called for each stream chunk

**StreamCallback Signature:**
```typescript
type StreamCallback = (chunk: StreamChunk) => void

interface StreamChunk {
  type: 'content' | 'metadata' | 'error' | 'done'
  content?: string       // For type='content'
  metadata?: Record<string, any>  // For type='metadata'
  error?: string         // For type='error'
  done?: boolean        // For type='done'
}
```

**Example:**
```typescript
await reader.respondStream('Tell me a story', (chunk) => {
  switch (chunk.type) {
    case 'content':
      process.stdout.write(chunk.content)
      break
    case 'metadata':
      console.log('Model:', chunk.metadata.model)
      break
    case 'error':
      console.error('Error:', chunk.error)
      break
    case 'done':
      console.log('\n[Complete]')
      break
  }
})
```

---

### chat()

Start an interactive chat session with the personality.

```typescript
async chat(
  handler: (message: string) => string | Promise<string>,
  options?: {
    exitCommand?: string
    greeting?: string
  }
): Promise<void>
```

**Parameters:**
- `handler` - Function to get user input (can be async)
- `exitCommand` - Command to exit chat (default: 'exit')
- `greeting` - Optional greeting message to display

**handler Function:**
- Receives current prompt as parameter (e.g., "You: ")
- Should return next user input as string or Promise<string>
- Can display output by side effect (console.log)

**Example:**
```typescript
import * as readline from 'node:readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

await reader.chat(async (prompt) => {
  // Display the AI's prompt
  console.log('\n' + prompt)

  // Get user input
  const answer = await new Promise<string>((resolve) => {
    rl.question('', (input) => {
      resolve(input)
    })
  })

  return answer
}, {
  exitCommand: 'quit',
  greeting: 'Chat started! Type "quit" to exit.'
})
```

**Behavior:**
1. Displays greeting (if provided)
2. Enters loop: generate prompt → get input → generate response
3. Exits when user types exit command
4. Maintains conversation history throughout session

---

### getSystemPrompt()

Get the system prompt for the current personality.

```typescript
getSystemPrompt(): string
```

**Returns:** The complete system prompt string used for LLM calls.

**Use case:**
- Debug prompt generation
- Custom prompt modification
- Understanding personality injection

**Example:**
```typescript
const prompt = reader.getSystemPrompt()
console.log('Current system prompt:', prompt)
```

---

### getMetadata()

Get metadata about the loaded Idiomark file.

```typescript
getMetadata(): {
  id: string
  version: string
  created: string
  updated: string
  entity: {
    name?: string
    type: 'human' | 'brand' | 'bot' | 'fictional'
    sources: string[]
  }
  extraction: {
    date: string
    sampleSize: number
    timeframe: { from: string; to: string }
  }
  validator?: string
  loadedFrom?: string
}
```

**Example:**
```typescript
const meta = reader.getMetadata()

console.log('Idiomark ID:', meta.id)
console.log('Version:', meta.version)
console.log('Sources:', meta.entity.sources)
console.log('Created:', meta.created)
```

---

### getPersonalitySummary()

Get a concise summary of personality traits.

```typescript
getPersonalitySummary(): {
  tone: {
    primary: string
    secondary?: string
    confidence: number
  }
  attributes: {
    formality: number
    humor: number
    sarcasm: number
    enthusiasm: number
    directness: number
  }
  domains: Array<{
    name: string
    confidence: number
  }>
  values: Array<{
    name: string
    sentiment: 'positive' | 'negative' | 'neutral'
  }>
  topics: {
    primary: string[]
    secondary?: string[]
  }
}
```

**Example:**
```typescript
const summary = reader.getPersonalitySummary()

console.log('Primary tone:', summary.tone.primary)
console.log('Formality:', summary.attributes.formality)
console.log('Domains:', summary.domains.map(d => d.name))
```

---

## State Management

### updatePersonality()

Update the personality after initial creation or modifications.

```typescript
updatePersonality(personality: Personality): void
```

**Use case:**
- Personality was refined with additional analysis
- User wants to modify personality
- Merge multiple personalities

**Example:**
```typescript
// After refinement
const refinedPersonality = await analyzer.refine(originalPersonality, 'More context...')
reader.updatePersonality(refinedPersonality)
```

---

### updateOptions()

Update generation options after creation.

```typescript
updateOptions(options: Partial<GenerationOptions>): void
```

**Updatable Options:**
- `temperature` - Adjust creativity
- `model` - Switch models
- `task` - Update system task description
- `userName` - Change user name in prompts

**Example:**
```typescript
// Make responses more creative
reader.updateOptions({ temperature: 0.9 })

// Switch to different model
reader.updateOptions({ model: 'claude-3-opus-20240229' })

// Add custom task
reader.updateOptions({ task: 'You are a creative writing assistant.' })
```

---

## Conversation History

### addHistory()

Add a message to conversation history.

```typescript
addHistory(message: {
  role: 'user' | 'assistant' | 'system'
  content: string
}): void
```

**Example:**
```typescript
reader.addHistory({
  role: 'user',
  content: 'My favorite programming language is TypeScript.'
})

// Add assistant response (automatically done by generate())
reader.addHistory({
  role: 'assistant',
  content: 'That\'s a great choice! TypeScript offers strong typing.'
})
```

---

### clearHistory()

Clear all conversation history.

```typescript
clearHistory(): void
```

**Use case:**
- Start new conversation topic
- Reset token usage
- Clear accumulated context

**Example:**
```typescript
// Start fresh
reader.clearHistory()
```

---

## Convenience Functions

### loadReader()

Load a Idiomark file and create a reader.

```typescript
import { loadReader } from '@idiomark/core'

const reader = await loadReader('./profile.idiomark.json', {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
})
```

**Equivalent to:**
```typescript
const reader = await IdiomarkReader.fromFile('./profile.idiomark.json', {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
})
```

---

### createReader()

Create a reader from a personality object.

```typescript
import { createReader } from '@idiomark/core'

const reader = createReader(personality, {
  provider: 'anthropic'
})
```

**Equivalent to:**
```typescript
const reader = IdiomarkReader.fromPersonality(personality, {
  provider: 'anthropic'
})
```

---

## ReaderOptions

```typescript
interface ReaderOptions extends GenerationOptions {
  personality?: Personality  // Override loaded personality
}
```

**Additional Option:**
- `personality` - Provide custom personality instead of loading from file

**Example:**
```typescript
const customPersonality = { /* ... */ }

const reader = await IdiomarkReader.fromFile('./file.idiomark.json', {
  personality: customPersonality  // Override file's personality
})
```

---

## Common Patterns

### Response Generation Flow

```
User Message
    ↓
IdiomarkReader.respond()
    ↓
Build Prompt (personality + message + history)
    ↓
Call LLM API
    ↓
Parse Response
    ↓
Return GenerationResult
```

### Chat Session Flow

```
IdiomarkReader.chat()
    ↓
[Loop]
    ↓
Display AI prompt with history
    ↓
Get user input via handler()
    ↓
Call respond(message)
    ↓
Display response
    ↓
Add to history
    ↓
Repeat until exit command
```

### Streaming Flow

```
IdiomarkReader.respondStream()
    ↓
[Loop]
    ↓
Call LLM with stream: true
    ↓
Read SSE stream
    ↓
For each chunk:
    - Call callback(content)
    - Call callback(metadata)
    ↓
On chunk.done: End stream
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|--------|--------|----------|
| `Idiomark file not found` | Invalid path | Check file exists |
| `Validation failed` | Invalid Idiomark file | Fix schema violations |
| `API key required` | Missing credentials | Set environment variable |
| `Unknown provider` | Invalid provider name | Use 'anthropic', 'openai', or 'mock' |

### Try-Catch Pattern

```typescript
try {
  const result = await reader.respond('Hello!')
  console.log(result.content)
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('Check ANTHROPIC_API_KEY environment variable')
  } else {
    console.error('Generation failed:', error)
  }
}
```

---

## Best Practices

### 1. Validate Before Use

```typescript
import { IdiomarkValidator } from '@idiomark/core'

const validator = new IdiomarkValidator()
const reader = await IdiomarkReader.fromFile('./profile.idiomark.json')
const isValid = validator.validate(reader.idiomarkFile).valid

if (!isValid) {
  console.warn('Idiomark file may be invalid')
}
```

### 2. Use Appropriate Temperature

```typescript
// Technical documentation (lower temperature)
const docs = createReader(technicalPersonality, {
  temperature: 0.3  // More focused, deterministic
})

// Creative writing (higher temperature)
const creative = createReader(writerPersonality, {
  temperature: 0.9  // More creative, varied
})
```

### 3. Manage Conversation History

```typescript
// Keep history focused
if (reader.idiomarkFile.metadata.extraction.sampleSize > 100) {
  // Consider keeping last 20 messages
  const focusedHistory = history.slice(-20)
  reader.updateOptions({ history: focusedHistory })
}

// Clear when switching topics
reader.clearHistory()
```

### 4. Use Streaming for Long Responses

```typescript
// For responses that might take time
await reader.respondStream('Write a comprehensive guide on API design', (chunk) => {
  if (chunk.type === 'content') {
    // Show partial response as it arrives
    process.stdout.write(chunk.content)
  }
})
```

---

## Examples

### Basic Usage

```typescript
import { IdiomarkReader } from '@idiomark/core'

async function main() {
  const reader = await IdiomarkReader.fromFile('./my-personality.idiomark.json', {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY
  })

  // Generate response
  const result = await reader.respond('What is your opinion on React?')
  console.log(result.content)
}
```

### Interactive Chat

```typescript
import * as readline from 'node:readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const reader = await IdiomarkReader.fromFile('./personality.idiomark.json')

await reader.chat(async (prompt) => {
  rl.question(prompt, async (input) => {
    const result = await reader.respond(input)
    console.log('Personality:', result.content)
    return input
  }), {
  exitCommand: 'exit',
  greeting: 'Chat started! Type "exit" to quit.'
})

rl.close()
```

### Streaming Response

```typescript
const reader = await IdiomarkReader.fromFile('./personality.idiomark.json')

console.log('Ask me anything (streaming)...')

await reader.respondStream('Tell me an interesting fact', (chunk) => {
  if (chunk.type === 'content') {
    process.stdout.write(chunk.content)
  } else if (chunk.type === 'done') {
    process.stdout.write('\n')
  }
})
```

### Personality Inspection

```typescript
const reader = await IdiomarkReader.fromFile('./personality.idiomark.json')

// Get system prompt
const prompt = reader.getSystemPrompt()
console.log('System Prompt:', prompt)

// Get metadata
const meta = reader.getMetadata()
console.log('Sources:', meta.entity.sources)
console.log('Sample Size:', meta.extraction.sampleSize)

// Get personality summary
const summary = reader.getPersonalitySummary()
console.log('Primary Tone:', summary.tone.primary)
console.log('Domains:', summary.domains.map(d => `${d.name} (${d.confidence})`).join(', '))
```

### History Management

```typescript
const reader = await IdiomarkReader.fromFile('./personality.idiomark.json')

// Add context
reader.addHistory({
  role: 'user',
  content: 'I previously asked about JavaScript.'
})

// Clear for new topic
reader.clearHistory()

// Update options
reader.updateOptions({ temperature: 0.5 })
```

---

## See Also

- [API Reference](API_REFERENCE.md) - All exported APIs
- [Generator Guide](GENERATOR.md) - Response generation details
- [Analyzer Guide](ANALYZER.md) - Personality analysis details
- [Inference Server](INFERENCE_SERVER.md) - HTTP endpoints
