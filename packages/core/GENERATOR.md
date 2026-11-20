# IdiomarkGenerator - Complete Guide

**Last Updated:** 2026-02-12
**Component:** `@idiomark/core`
**Source:** [generator.ts](src/generator.ts)

---

## Overview

`IdiomarkGenerator` applies personality profiles to AI response generation. It supports:

- Multiple LLM providers (Anthropic Claude, OpenAI, compatible endpoints)
- Streaming responses (Server-Sent Events)
- Conversation history management
- Temperature control for response randomness
- Custom system prompts and tasks

---

## Quick Start

```typescript
import { IdiomarkGenerator, createGenerator } from '@idiomark/core'

const generator = new IdiomarkGenerator(personality, {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  maxTokens: 131072
})

// Generate a response
const result = await generator.generate('What is your opinion on React?')
console.log(result.content)
```

---

## Configuration

### GenerationOptions

```typescript
interface GenerationOptions {
  // LLM Provider
  provider?: 'anthropic' | 'openai' | 'openai-compatible'

  // API Credentials
  apiKey?: string

  // Model Selection
  model?: string
  // Default: claude-3-5-sonnet-20241022 (anthropic), gpt-4o (openai)

  // Token Management
  maxTokens?: number
  // Default: 131072 (optimized for GLM-4.7 context windows)

  // Response Characteristics
  temperature?: number   // 0.0 - 1.0 (default: 0.7)
  stream?: boolean        // Enable streaming (default: false)

  // Custom Endpoint (for OpenAI-compatible)
  endpoint?: string

  // Conversation
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>

  // Personalization
  userName?: string
  task?: string
}
```

### Environment Variables

| Variable | Default | Purpose |
|----------|-----------|---------|
| `Idiomark_MAX_TOKENS` | 131072 | Override max tokens per request |

---

## Core API

### generate()

Generate a single response to a user message.

```typescript
async generate(message: string): Promise<GenerationResult>
```

#### Behavior

**1. Build Prompt**
- Combines personality with user message
- Includes conversation history if provided
- Adds system prompt with task description

**2. Call LLM**
- Routes to appropriate provider (Anthropic/OpenAI)
- Sends request with temperature and max_tokens

**3. Return Result**
- Extracts content from response
- Captures token usage
- Records timestamp

#### Returns

```typescript
interface GenerationResult {
  content: string          // Generated response text
  model: string           // Model used
  provider: string       // Provider name
  tokens?: {              // Token usage (if available)
    input: number
    output: number
  }
  timestamp: string       // ISO 8601 timestamp
}
```

#### Example

```typescript
const generator = new IdiomarkGenerator(personality, {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
})

const result = await generator.generate('Explain async/await in simple terms.')

console.log('Response:', result.content)
console.log('Tokens used:', result.tokens)
```

---

## Streaming API

### generateStream()

Generate a streaming response using Server-Sent Events.

```typescript
async generateStream(
  message: string,
  callback: StreamCallback
): Promise<void>
```

### StreamCallback

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

### Stream Chunk Types

| Type | Description | Example |
|-------|-------------|---------|
| `content` | Text content from LLM | `{type: 'content', content: 'Hello'}` |
| `metadata` | Response metadata | `{type: 'metadata', metadata: {model: 'claude-3-5-sonnet-20241022'}}` |
| `error` | Error occurred | `{type: 'error', error: 'Rate limit exceeded'}` |
| `done` | Stream complete | `{type: 'done', done: true}` |

### Streaming Example

```typescript
await generator.generateStream('Tell me a story', (chunk) => {
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
      console.log('\n[Stream complete]')
      break
  }
})
```

### Streaming Behavior

**1. Request Format**
- Sets `stream: true` in request body
- Opens SSE stream for response parsing

**2. Chunk Processing**
- Parses Server-Sent events (`data: {...}`)
- Extracts delta content from content blocks
- Handles different event formats (Anthropic vs OpenAI)

**3. Anthropic Streaming**
```typescript
// Response format
{
  "type": "content_block_delta",
  "delta": { "text": "partial word here" }
}

// Converted to chunk
{type: 'content', content: 'partial word'}
```

**4. OpenAI Streaming**
```typescript
// Response format
{
  "choices": [{
    "delta": { "content": "partial word here" }
  }]
}

// Converted to chunk
{type: 'content', content: 'partial word'}
```

---

## Conversation History

### addHistory()

Add a message to conversation history.

```typescript
generator.addHistory({
  role: 'user',
  content: 'Previous user message'
})

generator.addHistory({
  role: 'assistant',
  content: 'Previous assistant response'
})
```

**History Format:**
- Most recent messages first
- System prompt automatically included by generate()
- Passed to LLM as messages array

### clearHistory()

Clear all conversation history.

```typescript
generator.clearHistory()
```

**Use case:**
- Start new conversation
- Reset context for different topic
- Clear accumulated tokens

---

## Personality Updates

### updatePersonality()

Update the personality after initial creation or modifications.

```typescript
const newPersonality = await analyzeText('...')
generator.updatePersonality(newPersonality)
```

**What updates:**
- Internal personality object
- System prompt (rebuilt on next call)

---

## LLM Integration

### Provider Support

| Provider | Default Model | Notes |
|-----------|--------------|-------|
| `anthropic` | claude-3-5-sonnet-20241022 | Official API |
| `openai` | gpt-4o | Official API |
| `openai-compatible` | User-specified | For local/compatible endpoints |

### Anthropic Integration

```typescript
private async generateAnthropic(prompt: string): Promise<GenerationResult>
```

**Request Headers:**
```typescript
{
  'Content-Type': 'application/json',
  'x-api-key': apiKey,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true'
}
```

**Request Body:**
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 131072,
  "temperature": 0.7,
  "system": systemPrompt,
  "messages": buildMessages(prompt)
}
```

**Response Parsing:**
```typescript
const data = await response.json()
return {
  content: data.content[0].text,
  tokens: {
    input: data.usage?.input_tokens || 0,
    output: data.usage?.output_tokens || 0
  }
}
```

### OpenAI Integration

```typescript
private async generateOpenAI(prompt: string): Promise<GenerationResult>
```

**Request Headers:**
```typescript
{
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiKey}`
}
```

**Request Body:**
```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": systemPrompt },
    ...buildMessages(prompt)
  ],
  "max_tokens": 131072,
  "temperature": 0.7
}
```

**Response Parsing:**
```typescript
const data = await response.json()
return {
  content: data.choices[0].message.content,
  tokens: {
    input: data.usage?.prompt_tokens || 0,
    output: data.usage?.completion_tokens || 0
  }
}
```

### Custom Endpoints

For OpenAI-compatible APIs (local models, other providers):

```typescript
const generator = new IdiomarkGenerator(personality, {
  provider: 'openai-compatible',
  endpoint: 'http://localhost:11434/v1/chat/completions',
  apiKey: 'any-key-here'
})
```

**Uses:** `OPENAI` request format with custom endpoint URL.

---

## System Prompts

### buildSystemPrompt() Usage

The generator uses `buildSystemPrompt()` internally from `personality-prompt.ts`:

```typescript
// System prompt includes:
- Voice description (tone, formality, humor, etc.)
- Communication patterns
- Domain expertise
- Values and beliefs
- Knowledge areas
```

### Custom Task Description

```typescript
const generator = new IdiomarkGenerator(personality, {
  task: 'You are a code reviewer. Focus on security and performance.'
})
```

This task is included in the system prompt.

---

## Temperature Control

### Temperature Ranges

| Value | Effect |
|--------|--------|
| 0.0 - 0.3 | More focused, deterministic |
| 0.4 - 0.7 | Balanced (default) |
| 0.8 - 1.0 | More creative, random |

### Use Cases

```typescript
// Creative writing
const creative = new IdiomarkGenerator(personality, { temperature: 0.9 })

// Technical documentation
const technical = new IdiomarkGenerator(personality, { temperature: 0.3 })

// Conversational
const conversational = new IdiomarkGenerator(personality, { temperature: 0.7 })
```

---

## Message Building

### buildMessages() Method

Constructs messages array from history and current prompt.

```typescript
private buildMessages(prompt: string): Array<{
  role: 'user' | 'assistant'
  content: string
}>
```

**Process:**
1. Add all history messages (user and assistant)
2. Append current prompt as user message
3. Maintain chronological order

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|--------|--------|----------|
| `API key is required` | Missing apiKey | Check environment variable |
| `Unknown provider` | Invalid provider name | Use 'anthropic', 'openai', or 'mock' |
| `Rate limit exceeded` | Too many requests | Wait or increase limits |
| `Internal server error` | LLM issue | Retry or check status |

### Error Pattern

```typescript
try {
  const result = await generator.generate(message)
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

### 1. Token Management

```typescript
// For cost optimization
const costConscious = new IdiomarkGenerator(personality, {
  maxTokens: 4096,  // Lower for frequent calls
  temperature: 0.5      // More deterministic
})

// For quality
const qualityFocused = new IdiomarkGenerator(personality, {
  maxTokens: 131072,  // Full context
  temperature: 0.7       // Balanced creativity
})
```

### 2. Conversation Management

```typescript
// Limit history to reduce tokens
const recentHistory = fullHistory.slice(-10)  // Last 10 messages

generator.addHistory({ role: 'system', content: 'Focus on recent context.' })
```

### 3. Streaming for UX

```typescript
// Use streaming for real-time responses
await generator.generateStream(message, (chunk) => {
  // Display to user immediately
  process.stdout.write(chunk.content)

  // Don't buffer - show as it arrives
})
```

### 4. Personality Consistency

```typescript
// Validate personality before using
const validator = new IdiomarkValidator()
if (!validator.validate(personalityFile).valid) {
  console.warn('Personality may be invalid')
}

// Update when personality changes
generator.updatePersonality(refinedPersonality)
```

---

## Examples

### Basic Generation

```typescript
import { createGenerator } from '@idiomark/core'

const personality = { /* ... */ }

const generator = createGenerator(personality, {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  temperature: 0.8
})

const response = await generator.generate('Write a haiku about coding.')
console.log(response.content)
```

### With Conversation History

```typescript
const generator = createGenerator(personality, {
  history: [
    { role: 'user', content: 'I love TypeScript' },
    { role: 'assistant', content: 'Me too!' }
  ]
})

const response = await generator.generate('What do you think about Vue?')
// Response considers previous conversation
```

### Streaming Response

```typescript
const generator = createGenerator(personality, {
  stream: true
})

console.log('Streaming response...')

await generator.generateStream('Tell me a long story', (chunk) => {
  if (chunk.type === 'content') {
    process.stdout.write(chunk.content)
  } else if (chunk.type === 'done') {
    process.stdout.write('\n')
  }
})
```

### Custom Endpoint

```typescript
const generator = createGenerator(personality, {
  provider: 'openai-compatible',
  endpoint: 'http://localhost:1234/v1',
  apiKey: 'custom-key',
  model: 'custom-model-name'
})
```

---

## See Also

- [API Reference](API_REFERENCE.md) - All exported APIs
- [Analyzer Guide](ANALYZER.md) - Personality analysis
- [Reader Guide](READER.md) - Idiomark file consumption
- [Inference Server](INFERENCE_SERVER.md) - HTTP API endpoints
