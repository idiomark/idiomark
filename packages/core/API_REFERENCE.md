# Idiomark Core API Reference

**Last Updated:** 2026-02-12
**Package:** `@idiomark/core`
**Version:** 1.0.0

---

## Overview

The `@idiomark/core` package provides the complete API for:
- **Extraction** - Pull personality data from platforms or raw text
- **Analysis** - Analyze text content using LLM providers
- **Validation** - Verify Idiomark files against schema
- **Storage** - Load, save, and manage Idiomark files
- **Generation** - Generate AI responses with applied personality
- **Consumption** - High-level API for using Idiomark files

---

## Table of Contents

- [Extraction API](#extraction-api)
  - [IdiomarkExtractor](#idiomarkextractor)
  - [extractFromTextString](#extractfromtextstring)
  - [extractFromTextStrings](#extractfromtextstrings)
  - [extractFromPlatforms](#extractfromplatforms)
- [Analysis API](#analysis-api)
  - [PersonalityAnalyzer](#personalityanalyzer)
  - [analyzeText](#analyzetext)
  - [createTextSamples](#createtextsamples)
- [Validation API](#validation-api)
  - [IdiomarkValidator](#idiomarkvalidator)
- [Storage API](#storage-api)
  - [loadIdiomarkFile](#loadidiomarkfile)
  - [loadIdiomarkById](#loadidiomarkbyid)
  - [listIdiomarkFiles](#listidiomarkfiles)
  - [loadAllIdiomarkFiles](#loadallidiomarkfiles)
  - [writeIdiomarkFile](#writeidiomarkfile)
  - [deleteIdiomarkFile](#deleteidiomarkfile)
- [Generation API](#generation-api)
  - [IdiomarkGenerator](#idiomarkgenerator)
  - [createGenerator](#creategenerator)
  - [generateResponse](#generateresponse)
- [Consumption API](#consumption-api)
  - [IdiomarkReader](#idiomarkreader)
  - [loadReader](#loadreader)
  - [createReader](#createreader)
- [Personality Prompts](#personality-prompts)
  - [buildSystemPrompt](#buildsystemprompt)
  - [buildResponsePrompt](#buildresponseprompt)
  - [buildChatHistoryPrompt](#buildchathistoryprompt)
- [Inference Server](#inference-server)
  - [IdiomarkInferenceServer](#idiomarkinferenceserver)
- [Adapter Framework](#adapter-framework)
  - [PlatformAdapter Interface](#platformadapter-interface)
  - [getSupportedPlatforms](#getsupportedplatforms)

---

## Extraction API

### IdiomarkExtractor

Main class for orchestrating personality extraction from multiple platforms.

```typescript
import { IdiomarkExtractor } from '@idiomark/core'

const extractor = new IdiomarkExtractor(
  {
    sources: ['github', 'twitter'],
    sampleSize: 1000,
    verbose: true,
    auth: {
      github: { token: process.env.GITHUB_TOKEN },
      twitter: { bearerToken: process.env.TWITTER_TOKEN }
    }
  },
  {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022'
  }
)
```

#### Constructor

```typescript
constructor(
  options: ExtractionOptions,
  analysisOptions?: AnalysisOptions
)
```

**Parameters:**
- `options` - Configuration for extraction behavior
- `analysisOptions` - LLM provider configuration (defaults to mock)

#### Methods

##### extractFromContent()

Extract personality from pre-normalized content.

```typescript
const content: NormalizedContent[] = [
  {
    id: '1',
    platform: 'github',
    type: 'post',
    text: 'Check out this project!',
    timestamp: '2024-01-15T10:00:00Z',
    author: { id: 'user1', username: 'dev', name: 'Dev User' }
  }
]

const result = await extractor.extractFromContent(content)
console.log(result.confidence) // 0.0 - 1.0
```

##### extractFromText()

Extract personality from raw text strings.

```typescript
const texts = [
  'I love building software with TypeScript!',
  'Open source is the future of development.'
]

const result = await extractor.extractFromText(texts, {
  platform: 'blog',
  timestamps: ['2024-01-15T10:00:00Z', '2024-01-16T10:00:00Z']
})
```

##### extract()

Main extraction method - fetches from platform adapters and analyzes.

```typescript
const result = await extractor.extract()
await result.save('./my-personality.idiomark.json')
```

**Behavior:**
- Iterates through configured sources
- Authenticates with each platform
- Fetches content using adapter's `extract()` method (includes caching/retry)
- Falls back to mock data if no content fetched
- Returns `IdiomarkResult` with `save()` method

---

### extractFromTextString()

Convenience function for single text string analysis.

```typescript
import { extractFromTextString } from '@idiomark/core'

const result = await extractFromTextString(
  'I write code and occasionally make mistakes. That\'s how I learn!'
)
```

**Returns:** `IdiomarkResult`

---

### extractFromTextStrings()

Convenience function for multiple text strings.

```typescript
const texts = [
  'First post about coding.',
  'Second post about debugging.',
  'Third post about deployment.'
]

const result = await extractFromTextStrings(texts, {
  sources: ['forum'],
  timestamps: [
    '2024-01-01T00:00:00Z',
    '2024-01-02T00:00:00Z',
    '2024-01-03T00:00:00Z'
  ]
})
```

---

### extractFromPlatforms()

Extract personality from multiple platforms with authentication.

```typescript
import { extractFromPlatforms } from '@idiomark/core'

const result = await extractFromPlatforms({
  sources: ['github', 'twitter', 'reddit'],
  auth: {
    github: { token: 'ghp_xxx' },
    twitter: { bearerToken: 'xxx' },
    reddit: { clientId: 'xxx', clientSecret: 'xxx', userAgent: 'MyApp/1.0' }
  },
  sampleSize: 500,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-03-31'),
  verbose: true,
  analysisOptions: {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY
  }
})
```

**Options:**
- `sources` - Platform names to extract from
- `auth` - Platform-specific credentials
- `sampleSize` - Total posts to fetch (distributed across sources)
- `startDate` / `endDate` - Time range filter
- `verbose` - Enable logging
- `analysisOptions` - LLM configuration (see [PersonalityAnalyzer](#personalityanalyzer))

---

### getSupportedPlatforms()

Get list of all supported platforms and their adapter packages.

```typescript
import { getSupportedPlatforms } from '@idiomark/core'

const platforms = getSupportedPlatforms()
console.log(platforms)
// {
//   github: '@idiomark/adapter-github',
//   twitter: '@idiomark/adapter-twitter',
//   reddit: '@idiomark/adapter-reddit',
//   discord: '@idiomark/adapter-discord',
//   ...
// }
```

---

### isPlatformSupported()

Check if a platform is supported.

```typescript
import { isPlatformSupported } from '@idiomark/core'

if (isPlatformSupported('github')) {
  console.log('GitHub is supported')
}
```

---

### getAdapterPackage()

Get the npm package name for a platform's adapter.

```typescript
import { getAdapterPackage } from '@idiomark/core'

const packageName = getAdapterPackage('github')
console.log(packageName) // '@idiomark/adapter-github'
```

---

## Analysis API

### PersonalityAnalyzer

Analyzes text samples to extract personality traits using LLM providers.

```typescript
import { PersonalityAnalyzer } from '@idiomark/core'

const analyzer = new PersonalityAnalyzer({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 131072,
  chunkSize: 200000,
  cache: true,
  endpoint: 'https://custom-endpoint.com' // For OpenAI-compatible APIs
})
```

#### Constructor Options

```typescript
interface AnalysisOptions {
  provider?: 'anthropic' | 'openai' | 'mock'
  apiKey?: string
  model?: string
  maxTokens?: number
  chunkSize?: number      // Characters before chunking (default: 200000)
  cache?: boolean         // Enable result caching (default: true)
  endpoint?: string       // Custom API endpoint
}
```

**Environment Variables:**
- `Idiomark_MAX_TOKENS` - Override maxTokens (default: 131072)
- `Idiomark_CHUNK_SIZE` - Override chunkSize (default: 200000)

#### Methods

##### analyze()

Main analysis method - processes text samples and returns personality.

```typescript
const samples = createTextSamples([
  { text: 'I love TypeScript!', platform: 'twitter', timestamp: '...' },
  { text: 'Debugging is fun.', platform: 'github', timestamp: '...' }
])

const result = await analyzer.analyze(samples)

console.log(result.personality.voice.tone)
console.log(result.confidence)
console.log(result.metadata)
```

**Returns:** `AnalysisResult`

```typescript
interface AnalysisResult {
  personality: Personality
  confidence: number      // 0.0 - 1.0
  metadata: {
    samplesAnalyzed: number
    totalWords: number
    chunksProcessed: number  // If chunked
    provider: string
    model: string
    timestamp: string
  }
}
```

**Behavior:**
- Checks cache for existing analysis
- Chunks text if total characters > `chunkSize`
- Analyzes each chunk, then merges results
- Calculates confidence based on sample size and analysis quality

##### refine()

Refine existing analysis with additional context.

```typescript
const currentPersonality = result.personality
const refined = await analyzer.refine(currentPersonality, 'User is also a tech lead.')
```

##### validate()

Validate analysis quality and get recommendations.

```typescript
const validation = await analyzer.validate(result.personality)

console.log(validation.valid)
console.log(validation.issues)        // Array of issue descriptions
console.log(validation.recommendations) // Array of suggestions
```

##### clearCache()

Clear the analysis cache.

```typescript
analyzer.clearCache()
```

---

### analyzeText()

Convenience function for direct text analysis.

```typescript
import { analyzeText } from '@idiomark/core'

const result = await analyzeText('Your text here...', {
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY
})
```

---

### createTextSamples()

Helper to create TextSample arrays from raw content.

```typescript
import { createTextSamples } from '@idiomark/core'

const samples = createTextSamples([
  { text: 'Post content', timestamp: '2024-01-01', platform: 'twitter' },
  { text: 'Another post', timestamp: '2024-01-02', platform: 'github' }
])
```

---

## Validation API

### IdiomarkValidator

Validates Idiomark files against the schema.

```typescript
import { IdiomarkValidator } from '@idiomark/core'

const validator = new IdiomarkValidator()
```

#### Methods

##### validate()

Validate a Idiomark file object.

```typescript
import { loadIdiomarkFile } from '@idiomark/core'

const loadResult = await loadIdiomarkFile('./profile.idiomark.json')
const result = validator.validate(loadResult.file)

console.log(result.valid)
console.log(result.errors)  // Array of validation errors
```

**Returns:** `ValidationResult`

```typescript
interface ValidationResult {
  valid: boolean
  version: string
  id: string
  created: string
  sources: string[]
  errors: ValidationError[]
}

interface ValidationError {
  field?: string
  message: string
  code: string
}
```

---

## Storage API

### loadIdiomarkFile()

Load a Idiomark file from disk with optional validation.

```typescript
import { loadIdiomarkFile } from '@idiomark/core'

const result = await loadIdiomarkFile('./my-personality.idiomark.json', {
  validate: true,
  throwOnNotFound: true
})

if (result) {
  console.log(result.file)      // The IdiomarkFile object
  console.log(result.path)      // Absolute path to file
  console.log(result.validated)  // Whether validation passed
}
```

**Returns:** `LoadResult | null`

**Options:**
```typescript
interface LoadOptions {
  validate?: boolean          // Validate against schema (default: true)
  throwOnNotFound?: boolean  // Throw error if file missing (default: false)
}
```

---

### loadIdiomarkById()

Load a Idiomark file by ID from a directory.

```typescript
const result = await loadIdiomarkById('./personalities', 'idiomark_abc123')
```

**Searches for:**
- `{id}.idiomark.json`
- `{id}.idiomark`
- `{id}.json`

---

### listIdiomarkFiles()

List all Idiomark files in a directory.

```typescript
const files = await listIdiomarkFiles('./personalities')
console.log(files) // ['profile1.idiomark.json', 'profile2.idiomark.json']
```

---

### loadAllIdiomarkFiles()

Load all Idiomark files from a directory.

```typescript
const results = await loadAllIdiomarkFiles('./personalities', {
  validate: true
})
```

---

### writeIdiomarkFile()

Write a Idiomark file to disk.

```typescript
import { writeIdiomarkFile } from '@idiomark/core'

await writeIdiomarkFile('./output/profile.idiomark.json', idiomarkFile, {
  format: true  // Pretty-print JSON
})
```

---

### deleteIdiomarkFile()

Delete a Idiomark file from disk.

```typescript
const deleted = await deleteIdiomarkFile('./old-profile.idiomark.json')
console.log(deleted) // true if deleted, false if didn't exist
```

---

## Generation API

### IdiomarkGenerator

Generates AI responses with applied personality.

```typescript
import { IdiomarkGenerator } from '@idiomark/core'

const generator = new IdiomarkGenerator(personality, {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 131072,
  temperature: 0.7,
  stream: false,
  history: [],
  userName: 'User',
  task: 'You are a helpful assistant'
})
```

#### Constructor Options

```typescript
interface GenerationOptions {
  provider?: 'anthropic' | 'openai' | 'openai-compatible'
  apiKey?: string
  model?: string
  maxTokens?: number
  temperature?: number    // 0.0 - 1.0 (default: 0.7)
  stream?: boolean       // Enable streaming (default: false)
  endpoint?: string     // For OpenAI-compatible APIs
  history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  userName?: string
  task?: string
}
```

**Environment Variables:**
- `Idiomark_MAX_TOKENS` - Override maxTokens (default: 131072)

#### Methods

##### generate()

Generate a single response.

```typescript
const result = await generator.generate('What is your opinion on TypeScript?')

console.log(result.content)
console.log(result.tokens)      // { input: number, output: number }
console.log(result.timestamp)
```

**Returns:** `GenerationResult`

```typescript
interface GenerationResult {
  content: string
  model: string
  provider: string
  tokens?: {
    input: number
    output: number
  }
  timestamp: string
}
```

##### generateStream()

Generate a streaming response.

```typescript
await generator.generateStream('Tell me a joke', (chunk) => {
  if (chunk.type === 'content') {
    process.stdout.write(chunk.content)
  } else if (chunk.type === 'error') {
    console.error(chunk.error)
  } else if (chunk.type === 'done') {
    console.log('\n[Stream complete]')
  }
})
```

**Chunk Types:**
- `{ type: 'content', content: string }` - Text content
- `{ type: 'metadata', metadata: any }` - Response metadata
- `{ type: 'error', error: string }` - Error occurred
- `{ type: 'done', done: true }` - Stream complete

##### addHistory()

Add a message to conversation history.

```typescript
generator.addHistory({
  role: 'user',
  content: 'Previous message'
})
```

##### clearHistory()

Clear conversation history.

```typescript
generator.clearHistory()
```

##### updatePersonality()

Update the personality after creation/modification.

```typescript
const newPersonality = await analyzeText('...')
generator.updatePersonality(newPersonality)
```

---

### createGenerator()

Convenience function to create a generator from a Idiomark file.

```typescript
import { createGenerator } from '@idiomark/core'

const generator = createGenerator(idiomarkFile, {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
})
```

---

### generateResponse()

Convenience function for single response generation.

```typescript
import { generateResponse } from '@idiomark/core'

const result = await generateResponse(personality, 'Hello!', {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
})
```

---

## Consumption API

### IdiomarkReader

High-level API for consuming Idiomark files and generating responses.

```typescript
import { IdiomarkReader } from '@idiomark/core'

const reader = await IdiomarkReader.fromFile('./my-personality.idiomark.json', {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
})
```

#### Factory Methods

##### fromFile()

Create reader from file path.

```typescript
const reader = await IdiomarkReader.fromFile('./profile.idiomark.json', {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
})
```

##### fromIdiomarkFile()

Create reader from IdiomarkFile object.

```typescript
const reader = IdiomarkReader.fromIdiomarkFile(idiomarkFile, {
  provider: 'anthropic'
})
```

##### fromPersonality()

Create reader from Personality object.

```typescript
const reader = IdiomarkReader.fromPersonality(personality, {
  provider: 'anthropic'
})
```

**Note:** Creates a minimal Idiomark file wrapper around the personality.

---

#### Instance Methods

##### respond()

Generate a response to a message.

```typescript
const result = await reader.respond('What do you think about React?')
console.log(result.content)
```

##### respondStream()

Generate a streaming response.

```typescript
await reader.respondStream('Tell me a story', (chunk) => {
  if (chunk.type === 'content') {
    process.stdout.write(chunk.content)
  }
})
```

##### chat()

Start an interactive chat session.

```typescript
await reader.chat(async (input) => {
  // Display user message
  console.log('You:', input)

  // Get next input
  const nextInput = await readline.question('Personality: ')

  return nextInput
}, {
  exitCommand: 'exit',
  greeting: 'Chat started! Type "exit" to quit.'
})
```

**Options:**
- `exitCommand` - Command to exit chat (default: 'exit')
- `greeting` - Optional greeting message

##### getSystemPrompt()

Get the system prompt for the current personality.

```typescript
const prompt = reader.getSystemPrompt()
console.log(prompt)
```

##### getMetadata()

Get metadata about the loaded Idiomark file.

```typescript
const meta = reader.getMetadata()
console.log(meta)
// {
//   id: string
//   version: string
//   created: string
//   updated: string
//   entity: { name, type, sources }
//   extraction: { date, sampleSize, timeframe }
//   validator: string
//   loadedFrom: string
// }
```

##### getPersonalitySummary()

Get a summary of personality traits.

```typescript
const summary = reader.getPersonalitySummary()
console.log(summary)
// {
//   tone: { primary, secondary, confidence }
//   attributes: { formality, humor, sarcasm, enthusiasm, directness }
//   domains: [{ name, confidence }]
//   values: [{ name, sentiment }]
//   topics: { primary: secondary }
// }
```

##### updatePersonality()

Update the personality.

```typescript
reader.updatePersonality(newPersonality)
```

##### updateOptions()

Update generation options.

```typescript
reader.updateOptions({
  temperature: 0.5,
  model: 'claude-3-opus-20240229'
})
```

---

### loadReader()

Convenience function to load reader from file.

```typescript
import { loadReader } from '@idiomark/core'

const reader = await loadReader('./profile.idiomark.json', {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
})
```

---

### createReader()

Convenience function to create reader from personality.

```typescript
import { createReader } from '@idiomark/core'

const reader = createReader(personality, {
  provider: 'anthropic'
})
```

---

## Personality Prompts

### buildSystemPrompt()

Build a system prompt for response generation.

```typescript
import { buildSystemPrompt } from '@idiomark/core'

const prompt = buildSystemPrompt(personality, {
  userName: 'Alice',
  task: 'You are a helpful coding assistant'
})
```

---

### buildResponsePrompt()

Build a response prompt for a user message.

```typescript
const prompt = buildResponsePrompt(personality, userMessage, {
  history: conversationHistory,
  userName: 'Bob',
  task: 'Help with technical questions'
})
```

---

### buildChatHistoryPrompt()

Build a prompt including conversation history.

```typescript
const prompt = buildChatHistoryPrompt(personality, messages, {
  userName: 'Charlie'
})
```

---

### V2 Prompt Builders

For V2 experimental features, use:

```typescript
import { buildSystemPromptV2, buildResponsePromptV2 } from '@idiomark/core'

const v2Prompt = buildSystemPromptV2(personalityV2)
```

---

## Inference Server

### IdiomarkInferenceServer

HTTP server for serving personality-powered responses.

```typescript
import { IdiomarkInferenceServer } from '@idiomark/core'

const server = new IdiomarkInferenceServer({
  port: 3000,
  model: 'claude-3-5-sonnet-20241022',
  personality: idiomarkFile,
  generation: {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY
  }
})

await server.start()
```

#### Endpoints

| Method | Endpoint | Request | Response |
|---------|-----------|----------|----------|
| GET | `/health` | - | Health status |
| GET | `/personality` | - | Full Idiomark file JSON |
| GET | `/system-prompt` | - | System prompt text |
| POST | `/generate` | `{message, history?}` | `{response, metadata}` |
| POST | `/stream` | `{message, history?}` | SSE stream |

#### POST /generate Request

```json
{
  "message": "What is your opinion on TypeScript?",
  "history": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

#### POST /generate Response

```json
{
  "response": "I think TypeScript is great!",
  "metadata": {
    "model": "claude-3-5-sonnet-20241022",
    "provider": "anthropic",
    "tokens": { "input": 50, "output": 100 },
    "timestamp": "2024-02-12T10:00:00Z",
    "personality": {
      "id": "idiomark_abc123",
      "tone": "casual",
      "toneConfidence": 0.82
    }
  }
}
```

#### POST /stream Response (SSE)

Server-Sent Events stream:

```
data: {"type":"content","content":"I think"}
data: {"type":"metadata","metadata":{...}}
data: {"type":"done"}
```

---

## Adapter Framework

### PlatformAdapter Interface

All platform adapters must implement this interface.

```typescript
interface PlatformAdapter {
  readonly name: string

  // Authentication
  authenticate(): Promise<boolean>

  // Data fetching
  fetchContent(options: FetchOptions): Promise<RawContent[]>
  fetchContent?(options: FetchOptions): Promise<RawContent[]>

  // Normalization
  normalize(raw: RawContent): NormalizedContent

  // Optional methods
  extract?(options: FetchOptions): Promise<NormalizedContent[]>
  healthCheck?(): Promise<{healthy: boolean; latency?: number; error?: string}>
  reset?(): Promise<void>
  dispose?(): Promise<void>

  // Metrics (optional)
  getMetrics?(): {
    requests: number
    cacheHits: number
    cacheMisses: number
    retries: number
    errors: number
    avgLatency: number
  }
}
```

#### NormalizedContent Format

```typescript
interface NormalizedContent {
  id: string
  platform: string
  type: 'post' | 'comment' | 'reply'
  text: string
  timestamp: string
  author: {
    id: string
    username: string
    name: string
  }
  metrics?: {
    likes?: number
    shares?: number
    replies?: number
  }
  metadata?: Record<string, any>
  raw: any
}
```

#### FetchOptions

```typescript
interface FetchOptions {
  limit?: number
  startDate?: Date
  endDate?: Date
  includeReplies?: boolean
  includeReactions?: boolean
}
```

---

## Type Definitions

### IdiomarkFile

Main Idiomark file structure.

```typescript
interface IdiomarkFile {
  idiomark: string                      // Version: "1.0.0", "2.0.0-beta"
  id: string
  created: string
  updated: string
  metadata: IdiomarkMetadata
  personality: Personality          // V1 core (stable)
  personality_v2?: PersonalityV2   // V2 experimental (optional)
  signature?: string
}
```

### Personality

```typescript
interface Personality {
  voice: Voice
  patterns: Patterns
  domains: Domain[]
  values: Value[]
  knowledge: Knowledge
}
```

### Voice

```typescript
interface Voice {
  tone: {
    primary: string
    secondary?: string
    confidence: number  // 0.0 - 1.0
  }
  // Core communication style (0.0 - 1.0)
  formality: number
  humor: number
  sarcasm: number
  enthusiasm: number
  directness: number

  // Optional Big Five traits
  openness?: number
  conscientiousness?: number
  extraversion?: number
  agreeableness?: number
  neuroticism?: number
}
```

---

## Common Patterns

### Error Handling

All APIs may throw errors. Handle appropriately:

```typescript
try {
  const result = await extractor.extract()
} catch (error) {
  if (error.message.includes('Idiomark file not found')) {
    // Handle missing file
  } else if (error.message.includes('validation failed')) {
    // Handle invalid data
  } else {
    // Handle unexpected errors
  }
}
```

### Provider Selection

```typescript
// Anthropic Claude
{ provider: 'anthropic', apiKey: '...', model: 'claude-3-5-sonnet-20241022' }

// OpenAI GPT
{ provider: 'openai', apiKey: '...', model: 'gpt-4o' }

// OpenAI-compatible (local/other)
{ provider: 'openai-compatible', endpoint: 'http://localhost:11434/v1', apiKey: '...' }

// Mock (for testing)
{ provider: 'mock' }  // Uses cached mock data
```

### Streaming Responses

For real-time responses, use streaming methods:

```typescript
// IdiomarkReader streaming
await reader.respondStream(message, (chunk) => {
  if (chunk.type === 'content') {
    // Stream to user
  }
})

// IdiomarkGenerator streaming
await generator.generateStream(message, (chunk) => {
  // Handle chunks
})
```

---

## See Also

- [Analyzer Documentation](ANALYZER.md) - Deep dive into PersonalityAnalyzer
- [Generator Documentation](GENERATOR.md) - Deep dive into IdiomarkGenerator
- [Reader Documentation](READER.md) - Deep dive into IdiomarkReader
- [Adapter Base Guide](ADAPTER_BASE.md) - Complete BaseAdapter reference
- [Environment Variables](ENVIRONMENT.md) - All environment variables
