# Personality Analysis Engine

## Overview

The Idiomark Protocol includes a sophisticated personality analysis engine that extracts personality insights from text content using Large Language Models (LLMs). The engine analyzes writing patterns, voice characteristics, domain expertise, values, and knowledge graphs to build comprehensive personality profiles.

## Architecture

### Core Components

1. **`analyzer.ts`** - Main personality analysis class (`PersonalityAnalyzer`)
2. **`prompts.ts`** - LLM prompts for different analysis scenarios
3. **`extractor.ts`** - Integration layer for extracting from platforms
4. **`schema.ts`** - Zod schema validation

### Analysis Pipeline

```
Text Samples → [Text Preprocessing]
    ↓
[Chunking (if needed)]
    ↓
[LLM Analysis] → [Personality Data]
    ↓
[Validation & Normalization]
    ↓
[Idiomark File Generation]
```

## Voice Analysis

The engine analyzes the following voice characteristics:

| Characteristic | Range | Description |
|---------------|-------|-------------|
| **Tone** | categorical | Primary (casual, formal, humorous, professional, technical, friendly, sarcastic) + optional secondary |
| **Formality** | 0-1 | 0 = very casual/slang, 1 = very formal/academic |
| **Humor** | 0-1 | 0 = serious, 1 = frequent jokes/wit |
| **Sarcasm** | 0-1 | 0 = sincere, 1 = heavily sarcastic |
| **Enthusiasm** | 0-1 | 0 = flat/detached, 1 = very energetic |
| **Directness** | 0-1 | 0 = indirect/hedged, 1 = straightforward/assertive |

## Pattern Analysis

### Sentence/Paragraph Structure
- Mean and standard deviation of sentence length
- Mean and standard deviation of paragraph length
- Statistical analysis of writing complexity

### Emoji Usage
- **Frequency**: none (0%), low (<10%), medium (10-30%), high (>30%)
- **Top Emojis**: Most frequently used emojis
- **Position**: start, end, or mixed placement preference

### Punctuation Patterns
- Exclamation frequency (ratio of sentences with !)
- Question frequency (ratio of sentences with ?)
- Ellipsis usage categorization

### Capitalization
- All-caps frequency
- Random caps detection

## Domain Extraction

The engine identifies:
- **Technical domains**: Programming languages, frameworks, tools
- **Industry knowledge**: Finance, healthcare, design, etc.
- **Expertise areas**: Specialized knowledge with evidence

Each domain includes:
- Name
- Confidence score (0-1)
- Supporting evidence (specific quotes/references)

## Value Extraction

Identifies what the persona cares about:
- **Positive values**: Topics they express positive sentiment toward
- **Negative values**: Topics they criticize or dislike
- **Neutral values**: Topics mentioned without strong sentiment

Each value includes:
- Name
- Sentiment (positive/negative/neutral)
- Confidence score

## Knowledge Graph

### Frequent Terms
- Top 10-20 meaningful terms (excluding common words)
- TF-IDF style ranking

### Mentions
- **People**: @mentions on social platforms
- **Projects**: Project names, repositories, products
- **Organizations**: Companies, institutions

### Topics
- **Primary topics**: Most frequently discussed areas
- **Secondary topics**: Occasionally mentioned areas

## LLM Integration

### Supported Providers

| Provider | Model | Usage |
|----------|-------|-------|
| **Mock** | - | For testing, returns realistic mock data |
| **Anthropic** | Claude 3.5 Sonnet | Recommended for best results |
| **OpenAI** | GPT-4o | Alternative with good results |
| **Custom** | OpenAI-compatible | Self-hosted or alternative endpoints |

### API Keys

Set environment variables:
```bash
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
```

Or pass directly:
```typescript
const analyzer = new PersonalityAnalyzer({
  provider: 'anthropic',
  apiKey: 'your-key',
  model: 'claude-3-5-sonnet-20241022'
})
```

### Chunking Strategy

For large texts (>15KB by default), the engine:
1. Splits content into chunks at sentence/paragraph boundaries
2. Analyzes each chunk independently
3. Merges results with statistical aggregation
4. Re-calculates metrics across all chunks

## Usage Examples

### Basic Usage

```typescript
import { extractFromPlatforms } from '@idiomark/core'

// New simplified API with auth support
const result = await extractFromPlatforms({
  sources: ['twitter', 'github'],
  sampleSize: 100,
  verbose: true,
  auth: {
    github: { token: process.env.GITHUB_TOKEN },
    twitter: { bearerToken: process.env.TWITTER_BEARER_TOKEN }
  },
  analysisOptions: {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY
  }
})

console.log(result.file.personality)
```

### Advanced Usage

```typescript
import { PersonalityAnalyzer, createTextSamples } from '@idiomark/core'
const analyzer = new PersonalityAnalyzer({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 8192,
  cache: true,
  chunkSize: 15000
})

const samples = createTextSamples([
  { text: "First post...", platform: 'twitter' },
  { text: "Second post...", platform: 'twitter' }
])

const result = await analyzer.analyze(samples)
console.log(`Confidence: ${result.confidence}`)
```

## Confidence Scoring

The overall confidence score is calculated from:
1. **Sample count**: More samples = higher confidence (logarithmic)
2. **Tone confidence**: How clear the voice analysis is
3. **Domain confidence**: Average confidence of extracted domains

Formula:
```
confidence = (sampleConfidence * 0.4) + (toneConfidence * 0.3) + (domainConfidence * 0.3)
```

## Caching

Results are cached by default (1-hour TTL) based on:
- Text content hash
- Analysis options

Clear cache:
```typescript
analyzer.clearCache()
```

Disable caching:
```typescript
const analyzer = new PersonalityAnalyzer({ cache: false })
```

## Validation

Validate analysis quality:
```typescript
const validation = await analyzer.validate(personality)
if (!validation.valid) {
  console.log('Issues:', validation.issues)
  console.log('Recommendations:', validation.recommendations)
}
```

## Refinement

Refine existing analysis with additional context:
```typescript
const refined = await analyzer.refine(
  currentPersonality,
  "Additional context about the individual..."
)
```

## Output Format

```json
{
  "voice": {
    "tone": { "primary": "casual", "secondary": "technical", "confidence": 0.82 },
    "formality": 0.35,
    "humor": 0.58,
    "sarcasm": 0.42,
    "enthusiasm": 0.71,
    "directness": 0.63
  },
  "patterns": {
    "sentence_length": { "mean": 14.2, "stddev": 5.8 },
    "emoji_usage": { "frequency": "medium", "top_emojis": ["🚀", "💻"] },
    "punctuation": { "exclamation_frequency": 0.18, "question_frequency": 0.12 }
  },
  "domains": [
    { "name": "software_development", "confidence": 0.91, "evidence": ["..."] }
  ],
  "values": [
    { "name": "open_source", "sentiment": "positive", "confidence": 0.92 }
  ],
  "knowledge": {
    "frequent_terms": ["react", "typescript", "api"],
    "mentions": { "people": ["@user"], "projects": ["idiomark-protocol"] },
    "topics": { "primary": ["web_development"], "secondary": ["ai"] }
  }
}
```

## Performance Considerations

- **Mock provider**: ~500-1500ms per analysis
- **Anthropic Claude**: ~2-5 seconds depending on text size
- **OpenAI GPT-4**: ~3-7 seconds depending on text size
- **Chunking**: Adds ~10% overhead per chunk

## Limitations

1. **Sample Size**: Requires at least 5-10 samples for reliable results
2. **Platform Bias**: Twitter's character limit affects writing patterns
3. **Temporal Changes**: Personality may evolve over time
4. **Context**: Lacks context about audience/purpose of writing
5. **Multilingual**: Optimized for English; other languages may vary

## Future Enhancements

- [ ] Multilingual support
- [ ] Temporal personality tracking
- [ ] Comparative analysis (persona A vs B)
- [ ] Personality matching/scoring
- [ ] Integration with more platforms
- [ ] Fine-tuned models for personality extraction
