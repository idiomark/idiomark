# PersonalityAnalyzer - Complete Guide

**Last Updated:** 2026-02-12
**Component:** `@idiomark/core`
**Source:** [analyzer.ts](src/analyzer.ts)

---

## Overview

`PersonalityAnalyzer` uses LLM providers to analyze text samples and extract structured personality profiles. It handles:

- Single-shot and chunked analysis for large texts
- Multiple LLM providers (Anthropic, OpenAI, compatible endpoints)
- Response caching with TTL
- Analysis refinement and validation
- Mock mode for testing

---

## Quick Start

```typescript
import { PersonalityAnalyzer, analyzeText } from '@idiomark/core'

// Option 1: Direct function
const result = await analyzeText('Your text samples here...', {
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Option 2: Class usage
const analyzer = new PersonalityAnalyzer({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 131072,
  chunkSize: 200000,
  cache: true
})

const samples = createTextSamples([/* ... */])
const analysis = await analyzer.analyze(samples)
```

---

## Configuration

### AnalysisOptions

```typescript
interface AnalysisOptions {
  // LLM Provider
  provider?: 'anthropic' | 'openai' | 'mock'

  // API Credentials
  apiKey?: string

  // Model Selection
  model?: string  // Default: claude-3-5-sonnet-20241022 (anthropic), gpt-4o (openai)

  // Token Management
  maxTokens?: number  // Default: 131072 (optimized for GLM-4.7 context windows)

  // Chunking Strategy
  chunkSize?: number  // Characters before chunking (default: 200000)

  // Caching
  cache?: boolean  // Default: true

  // Custom Endpoint
  endpoint?: string  // For OpenAI-compatible APIs
}
```

### Environment Variables

| Variable | Default | Purpose |
|----------|-----------|---------|
| `Idiomark_MAX_TOKENS` | 131072 | Override max tokens per request |
| `Idiomark_CHUNK_SIZE` | 200000 | Override chunking threshold |

### Provider Defaults

| Provider | Default Model | Context Window |
|----------|--------------|---------------|
| `anthropic` | claude-3-5-sonnet-20241022 | 200K tokens |
| `openai` | gpt-4o | 128K tokens |
| `mock` | - | Returns realistic mock data |

---

## Core API

### analyze()

Main entry point for personality analysis.

```typescript
async analyze(samples: TextSample[]): Promise<AnalysisResult>
```

#### Parameters

```typescript
interface TextSample {
  id: string
  text: string
  timestamp?: string
  platform?: string
}
```

#### Behavior

**1. Cache Check**
- Generates cache key from sample content hash
- Returns cached result if available and not expired

**2. Context Building**
- Calculates total word count
- Determines date range from timestamps
- Identifies unique platforms

**3. Chunking Decision**
- If total characters > `chunkSize`, uses chunked analysis
- Otherwise uses direct analysis

**4. Analysis Execution**
- Calls LLM with system prompt
- Parses JSON response from markdown/code blocks
- Validates and normalizes all personality fields

**5. Confidence Calculation**
- Base confidence from sample count (logarithmic scale)
- Adjusted by tone confidence and domain confidence
- Returns weighted average

#### Returns

```typescript
interface AnalysisResult {
  personality: Personality
  confidence: number      // 0.0 - 1.0
  metadata: {
    samplesAnalyzed: number
    totalWords: number
    chunksProcessed: number
    provider: string
    model: string
    timestamp: string
  }
}
```

---

## Chunking Strategy

For large texts (>200,000 characters by default), the analyzer uses automatic chunking.

### How It Works

```typescript
// Text is split at sentence boundaries
const chunks = chunkText(combinedText, chunkSize)

// Each chunk analyzed separately
for (let i = 0; i < chunks.length; i++) {
  const chunkAnalysis = await analyzeChunk(chunks[i], i, chunks.length)
  chunkAnalyses.push(chunkAnalysis)
}

// Results merged
const mergedAnalysis = await mergeAnalyses(chunkAnalyses)
```

### Chunk Analysis Prompt

Each chunk receives focused instructions:

```
Analyze this text chunk 2 of 5 and extract personality insights.

Focus on:
1. Voice characteristics visible in this chunk
2. Writing patterns in this chunk
3. Any domains mentioned
4. Any values expressed
5. Knowledge elements (terms, mentions, topics)

Return ONLY valid JSON.
```

### Merge Strategy

When merging chunk analyses:

1. **Average numerical scores** - formality, humor, sarcasm, etc.
2. **Combine and deduplicate arrays** - emojis, domains, values, terms
3. **Recalculate statistics** - sentence length, emoji counts
4. **Resolve conflicts** - Primary/secondary tone synthesis
5. **Sum evidence arrays** - Combine all evidence from chunks

---

## LLM Integration

### Anthropic Claude

```typescript
private async callAnthropic(prompt: string): Promise<LLMResponse>
```

**Request Format:**
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 131072,
  "system": PERSONALITY_ANALYSIS_SYSTEM,
  "messages": [{
    "role": "user",
    "content": prompt
  }]
}
```

**Headers:**
- `x-api-key`: API key
- `anthropic-version`: 2023-06-01
- `anthropic-dangerous-direct-browser-access`: true

### OpenAI / Compatible

```typescript
private async callOpenAI(prompt: string): Promise<LLMResponse>
```

**Request Format:**
```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": PERSONALITY_ANALYSIS_SYSTEM },
    { "role": "user", "content": prompt }
  ],
  "max_tokens": 131072,
  "temperature": 0.3
}
```

**Custom Endpoint Support:**
```typescript
const analyzer = new PersonalityAnalyzer({
  endpoint: 'https://my-custom-endpoint.com/v1/chat/completions',
  provider: 'openai-compatible'
})
```

### Mock Mode

For testing without API calls:

```typescript
const analyzer = new PersonalityAnalyzer({ provider: 'mock' })

const result = await analyzer.analyze(samples)
// Returns realistic mock personality with:
// - Casual tone, medium humor
// - Technical domains (software_development, ai)
// - Open source values
// - Programming frequent terms
```

---

## Advanced Features

### refine()

Refine an existing personality with additional context.

```typescript
const currentPersonality = result.personality
const refined = await analyzer.refine(
  currentPersonality,
  'This person is also a tech lead with 5 years experience.'
)
```

**Use cases:**
- Add context from external sources
- Update confidence with new evidence
- Correct misidentified traits

### validate()

Validate analysis quality and get improvement recommendations.

```typescript
const validation = await validator.validate(personality)

console.log(validation.valid)
console.log(validation.issues)
// [
//   "Domains lack supporting evidence",
//   "Tone confidence seems high for sample size"
// ]
console.log(validation.recommendations)
// [
//   "Add more samples to increase confidence",
//   "Include specific quotes for domain claims"
// ]
```

**Checks performed:**
- Consistency: Numerical scores match qualitative descriptions?
- Completeness: All required fields populated?
- Evidence: Domains have supporting evidence? Is it specific?
- Plausibility: Are confidence scores reasonable?
- Coherence: Do different sections align?

---

## Caching

### Cache Implementation

- In-memory `Map` storage
- TTL-based expiration (1 hour default)
- Base64 content hash for cache key

### Cache Control

```typescript
// Clear cache
analyzer.clearCache()

// Bypass cache for one call
const result = await analyzer.analyze(samples, { cache: false })
```

---

## Response Parsing

### JSON Extraction

LLMs may return JSON in markdown code blocks. The analyzer handles:

```typescript
// Removes markdown wrappers
if (jsonContent.startsWith('```')) {
  // Detect code block language
  const startIdx = lines[0].includes('json') ? 1 : 1
  const endIdx = lines.findIndex(l => l.trim() === '```')
  jsonContent = lines.slice(startIdx, endIdx === -1 ? undefined : endIdx).join('\n')
}
```

### Normalization

All personality fields are normalized to valid ranges:

```typescript
// Voice scores clamped to 0-1
formality: this.clamp(data.formality ?? 0.5, 0, 1)

// Arrays with defaults
domains: data.domains || []
top_emojis: data.emoji_usage?.top_emojis || []
```

---

## Confidence Calculation

```typescript
private calculateConfidence(personality: Personality, sampleCount: number): number
```

**Formula:**
```
confidence = (sampleConfidence * 0.4) +
             (toneConfidence * 0.3) +
             (avgDomainConfidence * 0.3)
```

**Components:**
- `sampleConfidence`: Based on sample count (logarithmic scale, caps at 0.95)
- `toneConfidence`: From personality.voice.tone.confidence
- `avgDomainConfidence`: Mean of all domain confidences

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|--------|--------|----------|
| `Anthropic API error: 401` | Invalid API key | Check `ANTHROPIC_API_KEY` |
| `Anthropic API error: 400` | Invalid request | Check prompt formatting |
| `Failed to parse personality` | Invalid JSON | LLM returned malformed response |
| `Idiomark file validation failed` | Schema mismatch | Check output format |

### Try-Catch Pattern

```typescript
try {
  const result = await analyzer.analyze(samples)
  // Process result
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('API key missing or invalid')
  } else {
    console.error('Analysis failed:', error)
  }
}
```

---

## Best Practices

### 1. Sample Quality

**Aim for:**
- Minimum 1000 words across all samples
- Diverse platforms (GitHub, Twitter, blog posts)
- Recent content (last 3-6 months)
- Avoid single-source bias

### 2. Token Optimization

The analyzer is optimized for GLM-4.7 / z.ai:
- Large context windows (200K tokens)
- High output token limits (131K)
- Minimize requests by maximizing per-request throughput

### 3. Cost Management

```typescript
// For cost-sensitive applications
const analyzer = new PersonalityAnalyzer({
  maxTokens: 4096,      // Lower for cost savings
  chunkSize: 100000,    // Smaller chunks
  cache: true            // Reuse analyses
})
```

### 4. Testing

```typescript
// Use mock mode for development/tests
const devAnalyzer = new PersonalityAnalyzer({ provider: 'mock' })

// Switch to real API for production
const prodAnalyzer = new PersonalityAnalyzer({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
})
```

---

## Examples

### Basic Usage

```typescript
import { PersonalityAnalyzer, createTextSamples } from '@idiomark/core'

async function extractPersonalityFromPosts(posts: string[]) {
  const analyzer = new PersonalityAnalyzer({
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY
  })

  const samples = createTextSamples(
    posts.map((text, i) => ({
      id: `sample_${i}`,
      text,
      timestamp: new Date().toISOString()
    }))
  )

  const result = await analyzer.analyze(samples)

  console.log('Confidence:', result.confidence)
  console.log('Primary tone:', result.personality.voice.tone.primary)

  return result.personality
}
```

### With Chunking

```typescript
// Large text automatically chunks
const largeText = '...'.repeat(300000) // 300K characters

const samples = [{ id: '1', text: largeText }]

const analyzer = new PersonalityAnalyzer({
  chunkSize: 50000  // Force chunking at 50K
})

const result = await analyzer.analyze(samples)

console.log('Chunks processed:', result.metadata.chunksProcessed)
// Will be >1 for large text
```

### With Refinement

```typescript
// Initial extraction
const initialResult = await analyzer.analyze(initialSamples)

// Add more context
const refinedPersonality = await analyzer.refine(
  initialResult.personality,
  'User also speaks German and English fluently.'
)

// Validate improvement
const validation = await analyzer.validate(refinedPersonality)
console.log('Validation:', validation.valid)
console.log('Recommendations:', validation.recommendations)
```

---

## See Also

- [API Reference](API_REFERENCE.md) - All exported APIs
- [Generator Guide](GENERATOR.md) - Response generation
- [Reader Guide](READER.md) - Idiomark file consumption
