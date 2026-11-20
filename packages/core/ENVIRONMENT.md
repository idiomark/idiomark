# Environment Variables Reference

**Last Updated:** 2026-02-12
**Package:** `@idiomark/core`

---

## Overview

Several components use environment variables for configuration. This document provides a complete reference of all environment variables used across the Idiomark Protocol codebase.

---

## Quick Reference

| Variable | Package | Default | Purpose |
|----------|-----------|---------|
| `ANTHROPIC_API_KEY` | core | Anthropic API key for analysis |
| `OPENAI_API_KEY` | core | OpenAI API key for analysis |
| `Idiomark_MAX_TOKENS` | core | Max tokens per LLM request |
| `Idiomark_CHUNK_SIZE` | core | Character threshold for text chunking |
| `GITHUB_TOKEN` | cli | GitHub authentication token |
| `TWITTER_BEARER_TOKEN` | cli | Twitter Bearer token |
| `REDDIT_CLIENT_ID` | cli | Reddit client ID |
| `REDDIT_CLIENT_SECRET` | cli | Reddit client secret |
| `REDDIT_USER_AGENT` | cli | Reddit user agent string |

---

## Core Package Variables

### ANTHROPIC_API_KEY

**Used by:** [PersonalityAnalyzer](ANALYZER.md), [IdiomarkGenerator](GENERATOR.md)

**Description:** API key for Anthropic Claude models.

**Example:**
```bash
export ANTHROPIC_API_KEY=sk-ant-YOUR-KEY-HERE
```

**Default:** Empty string (must be set)

---

### OPENAI_API_KEY

**Used by:** [PersonalityAnalyzer](ANALYZER.md), [IdiomarkGenerator](GENERATOR.md)

**Description:** API key for OpenAI GPT models.

**Example:**
```bash
export OPENAI_API_KEY=sk-proj-YOUR-KEY-HERE
```

**Default:** Empty string (must be set)

---

### Idiomark_MAX_TOKENS

**Used by:** [PersonalityAnalyzer](ANALYZER.md), [IdiomarkGenerator](GENERATOR.md)

**Description:** Override default max tokens per LLM request.

**Default:** `131072` (optimized for GLM-4.7 / z.ai)

**Example:**
```bash
# Set higher limit for complex analysis
export Idiomark_MAX_TOKENS=200000

# Set lower limit for cost savings
export Idiomark_MAX_TOKENS=4096
```

**Purpose:** Balance between request size and API costs.

---

### Idiomark_CHUNK_SIZE

**Used by:** [PersonalityAnalyzer](ANALYZER.md)

**Description:** Character threshold for text chunking.

**Default:** `200000` characters

**Example:**
```bash
# Force chunking at smaller size
export Idiomark_CHUNK_SIZE=100000

# Disable chunking for single request
export Idiomark_CHUNK_SIZE=0
```

**Purpose:** Control when large texts are split into chunks for analysis.

---

## CLI Variables

### GITHUB_TOKEN

**Used by:** [IdiomarkExtractor](EXTRACTOR.md) via adapter dynamic loading

**Description:** Personal access token for GitHub API.

**Example:**
```bash
# Set token for GitHub access
export GITHUB_TOKEN=ghp_YOUR-TOKEN-HERE

# Use in extraction
idiomark extract --github -o my-profile.idiomark.json
```

**Scopes:** For public repositories, `public_repo` scope is sufficient.

---

### TWITTER_BEARER_TOKEN

**Used by:** [IdiomarkExtractor](EXTRACTOR.md) via Twitter adapter

**Description:** Bearer token for Twitter API v2.

**Example:**
```bash
export TWITTER_BEARER_TOKEN=BearerTokenHere

# Use in extraction
idiomark extract --twitter -o my-profile.idiomark.json
```

**Note:** Twitter API v1.1 requires OAuth, not just bearer token.

---

### REDDIT_CLIENT_ID

**Used by:** [IdiomarkExtractor](EXTRACTOR.md) via Reddit adapter

**Description:** Reddit client ID for OAuth.

**Example:**
```bash
export REDDIT_CLIENT_ID=my-reddit-app-id

# Use with client secret
idiomark extract --reddit -o my-profile.idiomark.json
```

**Note:** Requires `REDDIT_CLIENT_SECRET` also.

---

### REDDIT_CLIENT_SECRET

**Used by:** [IdiomarkExtractor](EXTRACTOR.md) via Reddit adapter

**Description:** Reddit client secret for OAuth.

**Example:**
```bash
export REDDIT_CLIENT_SECRET=my-reddit-app-secret

# Use with client ID
idiomark extract --reddit -o my-profile.idiomark.json
```

**Security:** Never commit to version control.

---

### REDDIT_USER_AGENT

**Used by:** [IdiomarkExtractor](EXTRACTOR.md) via Reddit adapter

**Description:** User agent string for Reddit API.

**Example:**
```bash
export REDDIT_USER_AGENT="my-app/1.0"

# Use in extraction
idiomark extract --reddit -o my-profile.idiomark.json
```

**Default:** `"Idiomark-Protocol/1.0"`

---

## Inference Server Variables

The inference server ([INFERENCE_SERVER.md](INFERENCE_SERVER.md)) uses these variables indirectly through the GenerationOptions:

- `ANTHROPIC_API_KEY` - For Anthropic provider
- `OPENAI_API_KEY` - For OpenAI provider

---

## Usage Patterns

### Setting Variables

**Bash (Unix/Linux/macOS):**
```bash
# Set for current session
export ANTHROPIC_API_KEY=sk-xxx
idiomark chat profile.idiomark.json

# Run with variable
idiomark chat profile.idiomark.json
```

**Windows PowerShell:**
```powershell
# Set for current session
$env:ANTHROPIC_API_KEY=sk-xxx
idiomark chat profile.idiomark.json

# Run with variable
idiomark chat profile.idiomark.json
```

**Windows CMD:**
```cmd
# Set for current session
set ANTHROPIC_API_KEY=sk-xxx && idiomark chat profile.idiomark.json

# Run with variable
idiomark chat profile.idiomark.json
```

### Verifying Variables

```bash
# Check if variable is set
echo $ANTHROPIC_API_KEY

# Check in Node.js
node -e "console.log(process.env.ANTHROPIC_API_KEY)"

# Use in application
import dotenv from 'dotenv'
dotenv.config()
const apiKey = process.env.ANTHROPIC_API_KEY
```

### .env Files

Create `.env.example` files to document required variables:

```bash
# Core
cat > .env.example << EOF
# Anthropic API Key (required for analysis/generation)
ANTHROPIC_API_KEY=your_api_key_here

# OpenAI API Key (alternative)
OPENAI_API_KEY=your_openai_key_here

# Optional: Max tokens override
Idiomark_MAX_TOKENS=131072
EOF
```

**Never commit `.env` files!**

---

## Best Practices

### 1. Required vs Optional

| Variable | Required? | Default | Action |
|----------|-----------|--------|--------|
| `ANTHROPIC_API_KEY` | Yes | - | Must be set for Anthropic provider |
| `OPENAI_API_KEY` | Yes | - | Must be set for OpenAI provider |
| `Idiomark_MAX_TOKENS` | No | 131072 | Optional override |
| `Idiomark_CHUNK_SIZE` | No | 200000 | Optional override |

### 2. Validation

Check if required variables are set before starting operations:

```typescript
function checkEnvironment() {
  const requiredVars = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY']

  for (const var of requiredVars) {
    if (!process.env[var]) {
      throw new Error(`${var} is not set`)
    }
  }

  return true
}
```

### 3. Security

```bash
# Never export keys with history
# ❌ BAD
export ANTHROPIC_API_KEY=sk-xxx && git commit -am "Add key"

# ✅ GOOD
echo "$ANTHROPIC_API_KEY=sk-xxx" >> .gitignore
git add .gitignore
git commit -m "Add API key"
```

### 4. Provider Defaults

When no provider is specified, the system checks these variables in order:

1. `process.env.ANTHROPIC_API_KEY` - Anthropic (default)
2. `process.env.OPENAI_API_KEY` - OpenAI fallback
3. Neither set → Uses mock mode

---

## Complete Variable List

### Core Analysis & Generation

| Variable | Type | Used By | Default |
|----------|-----------|---------|--------|
| `ANTHROPIC_API_KEY` | string | Analyzer, Generator | - |
| `OPENAI_API_KEY` | string | Analyzer, Generator | - |
| `Idiomark_MAX_TOKENS` | number | Analyzer, Generator | 131072 |
| `Idiomark_CHUNK_SIZE` | number | Analyzer | 200000 |

### Platform Adapters

| Variable | Type | Used By | Default |
|----------|-----------|---------|--------|
| `GITHUB_TOKEN` | string | Extractor | - |
| `TWITTER_BEARER_TOKEN` | string | Extractor | - |
| `REDDIT_CLIENT_ID` | string | Extractor | - |
| `REDDIT_CLIENT_SECRET` | string | Extractor | - |
| `REDDIT_USER_AGENT` | string | Extractor | "Idiomark-Protocol/1.0" |

---

## CLI Configuration

When using the CLI, you can pass credentials via options or environment variables:

```bash
# Via options
idiomark extract --github -t ghp_YOUR-TOKEN-HERE -o profile.idiomark.json

# Via environment
export GITHUB_TOKEN=ghp_YOUR-TOKEN-HERE
idiomark extract --github -o profile.idiomark.json
```

**Priority:** Options override environment variables.

---

## Testing

### Mock Mode

For testing without API keys, set provider to `'mock'`:

```typescript
const analyzer = new PersonalityAnalyzer({
  provider: 'mock'
})

const result = await analyzer.analyze(samples)
// Returns realistic mock personality
```

**No API calls made** - Faster for development.

---

## See Also

- [Analyzer Guide](ANALYZER.md) - Complete PersonalityAnalyzer usage
- [Generator Guide](GENERATOR.md) - Complete IdiomarkGenerator usage
- [API Reference](API_REFERENCE.md) - All exported APIs
