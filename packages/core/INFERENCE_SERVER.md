# Inference Server - Complete Guide

**Last Updated:** 2026-02-12
**Component:** `@idiomark/core`
**Source:** [inference.ts](src/inference.ts)

---

## Overview

`IdiomarkInferenceServer` is an HTTP server that serves personality-powered AI responses. It provides:

- RESTful API endpoints for generation and streaming
- Server-Sent Events (SSE) for real-time responses
- Health check endpoint
- Automatic CORS handling
- Built-in personality loading

---

## Quick Start

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
console.log('Server running on http://localhost:3000')
```

---

## Configuration

### InferenceServerOptions

```typescript
interface InferenceServerOptions {
  port: number                      // Port to listen on
  model: string                     // AI model to use
  personality: IdiomarkFile               // Idiomark file with personality
  generation?: GenerationOptions     // LLM generation options
}
```

### Server Options

The server is built on Node.js `http` module (using `createServer` from 'http').

---

## API Endpoints

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "model": "claude-3-5-sonnet-20241022",
  "personality": "idiomark_abc123",
  "timestamp": "2026-02-12T10:00:00Z"
}
```

**Use case:** Verify server is running and responsive.

---

### GET /personality

Get the complete loaded Idiomark file.

**Response:** Full Idiomark file JSON

```json
{
  "idiomark": "1.0.0",
  "id": "idiomark_abc123",
  "created": "2026-01-15T10:00:00Z",
  "updated": "2026-01-15T10:00:00Z",
  "metadata": { /* ... */ },
  "personality": { /* ... */ }
}
```

**Use case:** Retrieve full personality profile for debugging or inspection.

---

### GET /system-prompt

Get the system prompt used for generation.

**Response:** Plain text system prompt

```
You are an expert personality linguist and behavioral analyst...
[rest of system prompt]
```

**Use case:** Debug prompt construction or copy for other tools.

---

### POST /generate

Generate a single response with personality.

**Request:**
```json
{
  "message": "What is your opinion on TypeScript?",
  "history": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

**Response:**
```json
{
  "response": "I think TypeScript is great because...",
  "metadata": {
    "model": "claude-3-5-sonnet-20241022",
    "provider": "anthropic",
    "tokens": { "input": 50, "output": 150 },
    "timestamp": "2026-02-12T10:00:00Z",
    "personality": {
      "id": "idiomark_abc123",
      "tone": "casual",
      "toneConfidence": 0.82
    }
  }
}
```

**Features:**
- Conversation history support
- Token usage tracking
- Error handling with descriptive messages

---

### POST /stream

Generate a streaming response using Server-Sent Events.

**Request:** Same as `/generate`

**Response:** SSE stream

```
data: {"type":"content","content":"I think"}

data: {"type":"metadata","metadata":{"model":"claude-3-5-sonnet-20241022"}}

data: {"type":"done"}

```

**Event Types:**
| Type | Description |
|-------|-------------|
| `content` | Text content from LLM |
| `metadata` | Response metadata (model, tokens, timestamp) |
| `done` | Stream complete signal |

**Use case:** Real-time responses for long-form generation.

---

## Request/Response Formats

### POST /stream Request

```json
{
  "message": "User message here",
  "history": [
    { "role": "user", "content": "Message 1" },
    { "role": "assistant", "content": "Response 1" }
  ]
}
```

### POST /stream Response (SSE)

**Content Event:**
```
data: {"type":"content","content":"Partial response text"}
```

**Metadata Event:**
```
data: {"type":"metadata","metadata":{"model":"...","tokens":{...}}}
```

**Done Event:**
```
data: {"type":"done"}
```

---

## CORS Configuration

Server automatically adds CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

**Use case:** Allow browser-based clients to connect from any origin.

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "Internal server error": "Additional details"
}
```

### Common Errors

| Error | Cause | Solution |
|-------|--------|----------|
| Missing `message` field | Include `message` in request body |
| Invalid JSON | Send valid JSON in request body |
| LLM API error | Check API key and model settings |
| Missing personality | Personality file not loaded properly |

---

## Server Lifecycle

### Starting the Server

```typescript
await server.start()
// Console output:
// 🚀 Idiomark Inference Server
// Initializing inference engine...
// Server starting...
// ✅ Server ready at http://localhost:3000
```

### Stopping the Server

```typescript
await server.stop()
// Console output:
// Idiomark Inference Server stopped
```

**Use case:** Graceful shutdown when process is terminating.

---

## Examples

### Basic Usage

```typescript
import { IdiomarkInferenceServer } from '@idiomark/core'
import { readFileSync } from 'fs'

// Load Idiomark file
const content = readFileSync('./profile.idiomark.json', 'utf-8')
const personality = JSON.parse(content)

// Create server
const server = new IdiomarkInferenceServer({
  port: 3000,
  model: 'claude-3-5-sonnet-20241022',
  personality
})

// Start server
await server.start()
```

### Using with Express

```typescript
import express from 'express'
import { IdiomarkInferenceServer } from '@idiomark/core'

const app = express()

app.use(express.json())

// Add server routes
app.post('/generate', async (req, res) => {
  // Handle generation
})

const server = new IdiomarkInferenceServer({
  port: 3000,
  personality
})

// Integrate with Express
server.on('request', (req, res) => {
  // Server handles request
  // You can add Express middleware here
})
```

### Streaming to Frontend

```typescript
// Client-side SSE handling
const eventSource = new EventSource('http://localhost:3000/stream')

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)

  if (data.type === 'content') {
    console.log('Response:', data.content)
  } else if (data.type === 'metadata') {
    console.log('Model:', data.metadata.model)
  } else if (data.type === 'done') {
    eventSource.close()
  }
}
```

---

## Testing

### Health Check Test

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected response
# {"status":"healthy","model":"...","personality":"...","timestamp":"..."}
```

### Generate Request Test

```bash
# Test generation endpoint
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, what is your name?"}'
```

### Stream Test

```bash
# Test streaming endpoint
curl -N http://localhost:3000/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Tell me a story"}'
```

---

## Best Practices

### 1. Security

```typescript
// Never expose API keys in logs
console.log('API Key:', process.env.ANTHROPIC_API_KEY) // ❌ Bad

// Use safe logging
const safeLogger = {
  log: (message: string, meta?: any) => {
    const safeMeta = {
      ...meta,
      apiKey: meta?.apiKey?.substring(0, 10) + '***' // Mask most of it
    }
    console.log(message, safeMeta)
  }
}
```

### 2. Rate Limiting

The server itself doesn't rate limit - but the underlying LLM provider may have limits.

```typescript
// Handle rate limit errors
if (error.message.includes('rate limit')) {
  console.warn('Rate limit reached, waiting...')
  await new Promise(resolve => setTimeout(resolve, 60000))
  // Retry after 60 seconds
}
```

### 3. Resource Management

```typescript
// Clean up resources
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...')
  await server.stop()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...')
  await server.stop()
  process.exit(0)
})
```

### 4. Monitoring

```typescript
// Track request metrics
let requestCount = 0

server.on('request', (req) => {
  requestCount++
  console.log(`Request #${requestCount}: ${req.method} ${req.url}`)
})

// Log errors
server.on('error', (err) => {
  console.error('Server error:', err)
})
```

---

## Deployment

### Production Considerations

| Consideration | Recommendation |
|---------------|--------------|
| **Reverse Proxy** | Use nginx/traefik for SSL and load balancing |
| **Port Selection** | Use port >1024 to avoid conflicts |
| **Timeout Handling** | Configure appropriate timeouts for LLM calls |
| **CORS** | Configure allowed origins for production |
| **Logging** | Use structured logging (JSON) for production |
| **Memory** | Monitor memory usage with large models |

### Docker Example

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN npm ci --only=production

# Copy files
COPY package*.json ./
COPY server.js ./

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start server
CMD ["node", "server.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  idiomark-inference:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
```

---

## See Also

- [API Reference](API_REFERENCE.md) - All public APIs
- [Generator Guide](GENERATOR.md) - Response generation details
- [Reader Guide](READER.md) - Idiomark file consumption
