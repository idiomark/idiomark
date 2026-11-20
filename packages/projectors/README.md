# @idiomark/projectors

> Apply Idiomark personalities to external systems - MCP servers, shopping agents, HTTP APIs, gaming bots, and more.

## Overview

**Projectors** are adapters that **project** Idiomark personalities **onto** external systems (the opposite of adapters which **extract** personalities **from** platforms).

```
┌─────────────────────┐         ┌──────────────────────┐
│  Idiomark Personality    │────────▶│  External System     │
│  (voice, values)    │  Apply  │  (MCP, UCP, Games)   │
└─────────────────────┘         └──────────────────────┘
```

## Available Projectors

| Projector | Description | Export |
|-----------|-------------|--------|
| **MCP Server** | Model Context Protocol server with personality-driven tools | `@idiomark/projectors/mcp` |
| **UCP Adapter** | Universal Commerce Protocol shopping agent | `@idiomark/projectors/ucp` |
| **HTTP Server** | REST API that responds with personality | `@idiomark/projectors/http` |
| **Gaming** | In-game NPCs and chat bots (Minecraft, Roblox, VRChat, Fortnite) | `@idiomark/projectors/gaming` |

## Installation

```bash
npm install @idiomark/projectors
```

Or install individual packages:

```bash
npm install @idiomark/projectors/mcp
npm install @idiomark/projectors/ucp
npm install @idiomark/projectors/http
npm install @idiomark/projectors/gaming
```

## Quick Start

### MCP Server

Create an MCP server that exposes your personality as tools:

```typescript
import { MCPServer } from '@idiomark/projectors/mcp'
import myPersonality from './my-personality.idiomark'

const server = new MCPServer({
  transport: 'stdio', // or 'http'
  port: 3000,         // required for http transport
  personality: myPersonality
})

await server.start()
```

**Exposed Tools:**
- `generate_response` - Generate responses with your personality
- `get_personality` - Query personality metadata
- `get_system_prompt` - Get the system prompt encoding
- `get_health` - Health check with metrics

**Exposed Resources:**
- `idiomark:///personality` - Full Idiomark file
- `idiomark:///voice` - Voice profile
- `idiomark:///values` - Core values
- `idiomark:///domains` - Domain knowledge

### UCP Adapter

Create a shopping agent with personality:

```typescript
import { UCPAdapter } from '@idiomark/projectors/ucp'
import myPersonality from './my-personality.idiomark'

const adapter = new UCPAdapter({
  merchantId: 'merchant-123',
  businessName: 'My Store',
  personality: myPersonality,
  port: 3000
})

const result = await adapter.start()
console.log(`Profile at: ${result.profileUrl}`)
```

**Personality Integration:**
- Interaction style (tone, formality, humor)
- Values-aligned product recommendations
- Domain-based product matching

### HTTP Server

Simple REST API with personality:

```typescript
import { HTTPServerAdapter } from '@idiomark/projectors/http'
import myPersonality from './my-personality.idiomark'

const server = new HTTPServerAdapter({
  port: 3000,
  personality: myPersonality,
  provider: 'anthropic', // or 'openai'
  model: 'claude-3-opus-20240229'
})

await server.start()
```

**Endpoints:**
- `POST /generate` - Generate response with personality
- `POST /stream` - Stream response (SSE)
- `GET /personality` - View personality JSON
- `GET /system-prompt` - View system prompt
- `GET /health` - Health check

### Gaming Adapters

Create personality-powered in-game bots:

```typescript
import { MinecraftAdapter } from '@idiomark/projectors/gaming/minecraft'
import myPersonality from './my-personality.idiomark'

const bot = new MinecraftAdapter({
  name: 'MyBot',
  serverConfig: {
    host: 'mc.hypixel.net',
    port: 25565
  },
  personality: myPersonality
})

await bot.connect()
```

**Supported Games:**
- Minecraft ([`minecraft`](./src/gaming/minecraft.ts))
- Roblox ([`roblox`](./src/gaming/roblox.ts))
- VRChat ([`vrchat`](./src/gaming/vrchat.ts))
- Fortnite ([`fortnite`](./src/gaming/fortnite.ts))

## Base Adapter

All projectors extend [`BaseProjectionAdapter`](./src/base.ts), which provides:

| Feature | Description |
|---------|-------------|
| Rate Limiting | Configurable request throttling |
| Caching | Cache personality applications |
| Retry Logic | Automatic retry with exponential backoff |
| Metrics | Request counting, latency tracking |
| Events | Event emission for observability |

### Events

```typescript
adapter.on('projectionStart', (data) => console.log('Starting', data))
adapter.on('projectionComplete', (data) => console.log('Complete', data))
adapter.on('projectionError', (data) => console.log('Error', data))
adapter.on('rateLimit', (data) => console.log('Rate limited', data))
adapter.on('cacheHit', (data) => console.log('Cache hit', data))
```

## Personality Modes

All projectors support three personality application modes:

| Mode | Description |
|------|-------------|
| `strict` | Maximum personality application |
| `balanced` | Balanced personality (default) |
| `subtle` | Subtle personality hints |

```typescript
// Use mode parameter
await server.generateResponse({
  message: 'Hello!',
  mode: 'strict'
})
```

## CLI Usage

The Idiomark CLI includes projector scaffolding:

```bash
# Create a new MCP server
idiomark projector create my-server --type mcp --personality me.idiomark

# Create a gaming bot
idiomark projector create mc-bot --type minecraft --personality gamer.idiomark

# Validate a projector
idiomark projector validate ./my-server

# Test a projector
idiomark projector test ./my-server
```

See [CLI Documentation](../../docs-site/docs/projectors.md) for full command reference.

## API Reference

### Types

```typescript
import type {
  ProjectionInput,
  ProjectionOutput,
  ProjectionOptions,
  ResponseResult,
  PersonalityMode
} from '@idiomark/projectors'
```

### Configuration

```typescript
interface ProjectionAdapterConfig {
  name: string
  rateLimiter?: {
    maxRequests: number
    windowDuration: number
  }
  cache?: {
    enabled: boolean
    ttl: number
  }
  retry?: {
    maxRetries: number
    baseDelay: number
    maxDelay: number
  }
}
```

## Examples

- [`examples/mcp-server.ts`](./examples/mcp-server.ts) - MCP server example
- [`examples/ucp-agent.ts`](./examples/ucp-agent.ts) - UCP shopping agent
- [`examples/http-api.ts`](./examples/http-api.ts) - HTTP API server
- [`examples/minecraft-bot.ts`](./examples/minecraft-bot.ts) - Minecraft bot

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines on adding new projectors.

## License

MIT
