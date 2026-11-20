# IdiomarkExtractor - Complete Guide

**Last Updated:** 2026-02-12
**Component:** `@idiomark/core`
**Source:** [extractor.ts](src/extractor.ts)

---

## Overview

`IdiomarkExtractor` orchestrates personality extraction from platform data or raw text. It manages:

- **Adapter Discovery** - Dynamic loading of platform adapters
- **Authentication** - Per-platform auth management
- **Data Fetching** - With automatic retry and caching
- **Normalization** - Converting platform-specific data to Idiomark format
- **Analysis** - Integration with PersonalityAnalyzer for LLM-based extraction
- **Mock Fallback** - Returns sensible defaults when no data available
- **File I/O** - Saving generated Idiomark files

---

## Quick Start

```typescript
import { IdiomarkExtractor, extractFromPlatforms } from '@idiomark/core'

const result = await extractFromPlatforms({
  sources: ['github', 'twitter'],
  auth: {
    github: { token: process.env.GITHUB_TOKEN },
    twitter: { bearerToken: process.env.TWITTER_BEARER_TOKEN }
  },
  sampleSize: 500,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-03-31'),
  verbose: true,
  analysisOptions: {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-sonnet-20241022'
  }
})

// Save to file
await result.save('./my-personality.idiomark.json')
```

---

## Configuration

### ExtractionOptions

```typescript
interface ExtractionOptions {
  // Data Sources
  sources: string[]

  // Sample Control
  sampleSize: number        // Total posts to fetch (default: 1000)

  // Logging
  verbose: boolean          // Enable detailed logging (default: false)

  // Authentication (platform-specific)
  auth?: Record<string, any>

  // Time Range (optional)
  startDate?: Date
  endDate?: Date

  // LLM Configuration
  analysisOptions?: AnalysisOptions
}
```

### AnalysisOptions

See [ANALYZER.md](ANALYZER.md#configuration) for complete LLM configuration.

---

## Core API

### Constructor

```typescript
class IdiomarkExtractor {
  constructor(
    options: ExtractionOptions,
    analysisOptions?: AnalysisOptions
  )
}
```

**Behavior:**
- Initializes adapter registry
- Creates PersonalityAnalyzer with options
- Validates options are provided

---

### Main Extraction Methods

#### extract()

Primary method - fetches from all configured sources and analyzes.

```typescript
const extractor = new IdiomarkExtractor({
  sources: ['github', 'twitter'],
  sampleSize: 1000
})

const result = await extractor.extract()
```

**Process:**
1. **Initialize Adapters** - For each source in `sources`
2. **Authenticate** - Call `adapter.authenticate()`
3. **Fetch Content** - Use `adapter.extract()` (includes caching, retry)
4. **Accumulate Results** - Collect all normalized content
5. **Fallback to Mock** - If no content, return mock personality
6. **Analyze** - Pass to PersonalityAnalyzer
7. **Build Idiomark File** - Create Idiomark format with metadata

**Events Emitted (via adapter's EventEmitter):**
- `fetch:start` - Platform fetch starting
- `fetch:complete` - Platform fetch complete
- `cache:hit` - Content served from cache
- `cache:miss` - Cache lookup failed
- `retry` - Retry attempt made

---

#### extractFromContent()

Extract personality from pre-normalized content.

```typescript
const content: NormalizedContent[] = [
  {
    id: '1',
    platform: 'github',
    type: 'post',
    text: 'Check out this repo!',
    timestamp: '2024-01-15T10:00:00Z',
    author: { id: 'user1', username: 'dev', name: 'Dev User' }
  }
]

const result = await extractor.extractFromContent(content)
```

**Use case:** You have data from sources other than platforms (e.g., database, RSS feeds).

---

#### extractFromText()

Extract personality from raw text strings.

```typescript
const texts = [
  'I love building software with TypeScript!',
  'TypeScript makes large projects more manageable.'
]

const result = await extractor.extractFromText(texts, {
  platform: 'blog',
  timestamps: [
    '2024-01-01T00:00:00Z',
    '2024-01-02T00:00:00Z'
  ]
})
```

**Features:**
- Converts to TextSample format
- Passes to PersonalityAnalyzer
- Creates Idiomark file with appropriate metadata

---

## Mock Fallback

When no platform adapters are available or all fail, `IdiomarkExtractor` returns a mock personality:

```typescript
// Mock personality traits
{
  voice: {
    tone: { primary: 'casual', secondary: 'technical', confidence: 0.75 },
    formality: 0.35,
    humor: 0.6,
    sarcasm: 0.4,
    enthusiasm: 0.7,
    directness: 0.5
  },
  patterns: {
    sentence_length: { mean: 12.5, stddev: 4.2 },
    emoji_usage: { frequency: 'medium', top_emojis: ['🚀', '💻', '🔥'] },
    punctuation: { exclamation_frequency: 0.15, question_frequency: 0.08 }
  },
  domains: [
    { name: 'technology', confidence: 0.85 },
    { name: 'programming', confidence: 0.78 }
  ],
  values: [
    { name: 'open_source', sentiment: 'positive', confidence: 0.9 },
    { name: 'privacy', sentiment: 'positive', confidence: 0.82 }
  ]
}
```

**Use case:** Testing without API keys, or when platform data is unavailable.

---

## Adapter Integration

### Supported Platforms

```typescript
import { getSupportedPlatforms, isPlatformSupported, getAdapterPackage } from '@idiomark/core'

// Check all platforms
const platforms = getSupportedPlatforms()
// { github: '@idiomark/adapter-github', twitter: '@idiomark/adapter-twitter', ... }

// Check if supported
if (isPlatformSupported('github')) {
  console.log('GitHub adapter is available')
}

// Get adapter package name
const packageName = getAdapterPackage('github')
console.log(packageName) // '@idiomark/adapter-github'
```

### Adapter Loading

`IdiomarkExtractor` dynamically imports adapter packages:

```typescript
private async getAdapter(platform: string, auth?: any): Promise<PlatformAdapter | null>
```

**Process:**
1. Check if already cached (per-instance)
2. Dynamic `import()` of adapter package
3. Get adapter class (default or named export)
4. Instantiate with auth credentials
5. Cache for reuse

**Error Handling:**
- `MODULE_NOT_FOUND` - Adapter package not installed
- Missing adapter class - Provide helpful error message
- Invalid auth format - Adapter-specific validation

---

## File I/O

### IdiomarkResult.save()

Save the generated Idiomark file to disk.

```typescript
const result = await extractor.extract()

await result.save('./output/profile.idiomark.json')
console.log('Saved to:', result.path)
```

**Features:**
- Creates directory if needed
- Pretty-prints JSON (2-space indent)
- Uses `.idiomark.json` extension

---

## Timeframe Handling

The extractor calculates timeframe from content timestamps:

```typescript
interface IdiomarkMetadata {
  extraction: {
    date: string
    sampleSize: number
    timeframe: {
      from: string  // ISO 8601 date
      to: string   // ISO 8601 date
    }
  }
}
```

**Automatic Calculation:**
- Finds earliest timestamp across all samples
- Finds latest timestamp across all samples
- Formats as "X days" string

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|--------|--------|----------|
| Adapter load failed | Package not installed | Install adapter package |
| No content fetched | All adapters failed | Check authentication tokens |
| Invalid Idiomark file | LLM returned invalid data | Check LLM response |

### Try-Catch Pattern

```typescript
try {
  const result = await extractor.extract()
  await result.save('./profile.idiomark.json')
} catch (error) {
  if (error.message.includes('Idiomark file validation failed')) {
    console.error('Invalid personality:', error.message)
  } else {
    console.error('Extraction failed:', error.message)
  }
}
```

---

## Best Practices

### 1. Sample Size

```typescript
// Good balance between quality and speed
const extractor = new IdiomarkExtractor({
  sampleSize: 1000,  // 1000 posts
  verbose: true
})
```

**Recommendations:**
- Minimum 500 samples for reliable personality
- 1000-2000 for comprehensive profiles
- More samples = higher accuracy but slower

### 2. Time Range Filtering

```typescript
const extractor = new IdiomarkExtractor({
  sources: ['github'],
  startDate: new Date('2024-01-01'),  // Only recent data
  endDate: new Date('2024-03-31'),
  verbose: true
})
```

**Use case:** Analyze specific time periods, exclude outdated context.

### 3. Verbose Logging

```typescript
const extractor = new IdiomarkExtractor({
  verbose: true  // See all operations
})
```

**Logs:**
- Adapter initialization
- Authentication status
- Fetch progress (X of Y posts)
- Analysis progress
- Confidence scores

### 4. Authentication Management

```typescript
// Store tokens securely
const extractor = new IdiomarkExtractor({
  auth: {
    github: { token: process.env.GITHUB_TOKEN },        // From environment
    twitter: { bearerToken: await getOAuthToken() }  // Dynamic OAuth flow
  }
})
```

**Security Best Practices:**
- Never hardcode tokens
- Use environment variables
- Rotate tokens regularly
- Use `.env.example` for templates

### 5. Error Recovery

The extractor has built-in fallback:
- Continues on adapter failures
- Returns mock personality instead of throwing
- Logs warnings for debugging

```typescript
// Even if GitHub fails, Twitter succeeds
const result = await extractor.extract({
  sources: ['github', 'twitter']
})
// Result includes Twitter data, not empty
```

---

## Examples

### Basic Platform Extraction

```typescript
import { IdiomarkExtractor } from '@idiomark/core'

async function extractGitHubProfile(username: string) {
  const extractor = new IdiomarkExtractor({
    sources: ['github'],
    sampleSize: 500,
    auth: {
      github: { token: process.env.GITHUB_TOKEN }
    },
    analysisOptions: {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY
    }
  })

  const result = await extractor.extract()
  await result.save(`./profiles/${username}.idiomark.json`)

  return result.file
}
```

### Multi-Platform Extraction

```typescript
import { IdiomarkExtractor } from '@idiomark/core'

async function extractMultiPlatform() {
  const extractor = new IdiomarkExtractor({
    sources: ['github', 'twitter', 'reddit'],
    sampleSize: 1000,  // Distributed across platforms
    auth: {
      github: { token: process.env.GITHUB_TOKEN },
      twitter: { bearerToken: process.env.TWITTER_TOKEN },
      reddit: {
        clientId: process.env.REDDIT_CLIENT_ID,
        clientSecret: process.env.REDDIT_CLIENT_SECRET,
        userAgent: 'MyApp/1.0'
      }
    },
    analysisOptions: {
      provider: 'anthropic',
      chunkSize: 200000  // Force chunking
      cache: true
    }
  })

  const result = await extractor.extract()
  console.log('Confidence:', result.confidence)
  console.log('Samples:', result.metadata.sampleSize)

  return result.file
}
```

### Text-Only Extraction

```typescript
import { extractFromTextString } from '@idiomark/core'

const blogPost = `I've been programming for 10 years and I still learn something new every day.`

const result = await extractFromTextString(blogPost, {
  sources: ['blog']
})
```

---

## See Also

- [PlatformAdapter Interface](API_REFERENCE.md#platformadapter-interface) - Interface definition
- [Adapter Base Guide](ADAPTER_BASE.md) - Complete adapter implementation
- [Analyzer Guide](ANALYZER.md) - LLM integration details
- [API Reference](API_REFERENCE.md) - All exported APIs
