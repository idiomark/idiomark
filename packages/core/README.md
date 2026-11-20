# @idiomark/core

Core library for the Idiomark (Personality Characterization Protocol).

## Features

- **Extraction** - Pull personality from platforms (GitHub, Twitter, Reddit, raw text)
- **Validation** - Verify Idiomark files against schema
- **Consumption** - Generate AI responses with personality injection
- **Inference Server** - HTTP API for personality-powered responses
- **V2 Experimental** - Enhanced personality dimensions (Big Five, linguistic markers, etc.)

## Installation

```bash
npm install @idiomark/core
```

## Quick Start

### Extract a Personality

```typescript
import { IdiomarkExtractor, extractFromTextString } from '@idiomark/core'

// From text strings
const result = await extractFromTextString([
  "I love TypeScript!",
  "TypeScript makes my code so much better.",
  "The type system is incredible."
], {
  sources: ['text'],
  verbose: true
})

// Save to file
await result.save('./my-personality.idiomark.json')
```

### Consume a Personality (Generate Responses)

```typescript
import { IdiomarkReader, loadReader } from '@idiomark/core'

// Load a Idiomark file
const reader = await IdiomarkReader.fromFile('./my-personality.idiomark.json', {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Generate a response
const response = await reader.respond("What's your opinion on React?")
console.log(response.content)

// Interactive chat
await reader.chat(async (input) => input)
```

### V2 Enhanced Personality (Experimental)

```typescript
import { loadReader, buildResponsePromptFromIdiomarkFile } from '@idiomark/core'

// Load a Idiomark file with V2 data
const reader = await loadReader('./my-personality-v2.idiomark.json')

// V2 personality includes Big Five, linguistic markers, etc.
const response = await reader.respond("How do you approach problems?")
```

**See [V2_USAGE.md](../../docs/V2_USAGE.md) for complete V2 documentation.**

## Configuration

### Defaults (Optimized for GLM MAX / z.ai)

The library is optimized by default for **GLM MAX coding plan** with z.ai:

| Setting | Default | Notes |
|----------|----------|-------|
| `maxTokens` | 131,072 (both) | GLM-4.7 max output |
| `chunkSize` | 200,000 chars | Matches GLM context window |

These defaults maximize throughput when rate limited by **request count** rather than tokens.

### Optional Environment Variables

Override defaults if needed:

| Variable | Description |
|----------|-------------|
| `Idiomark_MAX_TOKENS` | Override default max output tokens |
| `Idiomark_CHUNK_SIZE` | Override default chunk size threshold |
| `ANTHROPIC_API_KEY` | API key for Anthropic Claude |
| `OPENAI_API_KEY` | API key for OpenAI GPT models |

**Only use env vars if you need different behavior than the optimized defaults.**

## API Reference

### Extraction

| Class/Function | Description |
|----------------|-------------|
| `IdiomarkExtractor` | Main extraction class |
| `extractFromTextString(text)` | Quick extraction from single text |
| `extractFromTextStrings(texts[])` | Extract from multiple texts |
| `extractFromPlatforms(config)` | Extract from platform adapters |

### Consumption

| Class/Function | Description |
|----------------|-------------|
| `IdiomarkReader` | Main personality consumer class |
| `loadReader(path)` | Load Idiomark file and create reader |
| `createReader(personality)` | Create reader from personality object |
| `generateResponse(personality, message)` | One-off response generation |

### Validation

| Class/Function | Description |
|----------------|-------------|
| `IdiomarkValidator` | Validate Idiomark files against schema |

### Prompt Building

| Function | Description |
|----------|-------------|
| `buildSystemPrompt(personality)` | Build system prompt from V1 personality |
| `buildSystemPromptV2(personalityV2)` | Build enhanced prompt with V2 dimensions |
| `buildResponsePromptFromIdiomarkFile(idiomarkFile, message)` | Auto-detects and uses V2 or V1 |

### File Operations

| Function | Description |
|----------|-------------|
| `loadIdiomarkFile(path)` | Load and validate a Idiomark file |
| `loadIdiomarkById(directory, id)` | Load Idiomark file by ID from directory |
| `listIdiomarkFiles(directory)` | List all Idiomark files in directory |
| `writeIdiomarkFile(path, file)` | Write Idiomark file to disk |
| `deleteIdiomarkFile(path)` | Delete a Idiomark file |

## Types

### Core Types

```typescript
interface IdiomarkFile {
  idiomark: string                     // Version: "1.0.0", "2.0.0-beta"
  id: string
  created: string
  updated: string
  metadata: IdiomarkMetadata
  personality: Personality          // V1 core (stable)
  personality_v2?: PersonalityV2  // V2 experimental (optional)
}

interface Personality {
  voice: Voice
  patterns: Patterns
  domains: Domain[]
  values: Value[]
  knowledge: Knowledge
}
```

### V2 Experimental Types

```typescript
interface PersonalityV2 {
  // V1 core (always included)
  voice: Voice
  patterns: Patterns
  domains: Domain[]
  values: Value[]
  knowledge: Knowledge

  // V2 experimental dimensions
  big_five?: BigFiveTraits
  linguistic_markers?: LinguisticMarkers
  communication_style?: CommunicationStyle
  cognitive_patterns?: CognitivePatterns
  emotional_patterns?: EmotionalPatterns
  social_dynamics?: SocialDynamics
}
```

**See [types-v2.ts](./src/types-v2.ts) for complete V2 type definitions.**

## Inference Server

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
// Server now running at http://localhost:3000
```

### Server Endpoints

| Endpoint | Method | Description |
|----------|----------|-------------|
| `POST /generate` | Generate response with personality |
| `POST /stream` | Stream response (SSE) |
| `GET /health` | Health check |
| `GET /personality` | View loaded personality |
| `GET /system-prompt` | View system prompt |

## Examples

See [examples/](./examples/) directory for:

- [consume-idiomark.ts](./examples/consume-idiomark.ts) - Personality consumption examples
- [analyze-text.example.ts](./examples/analyze-text.example.ts) - Text analysis examples

## License

MIT
