# @idiomark/mcp

> Idiomark MCP Server - **Context7 for personality**

Single package with **Context** (read-only) and **Engine** (generative) modes.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@idiomark/mcp)](https://www.npmjs.com/package/@idiomark/mcp)

## Overview

**Context7** serves code documentation via MCP. **@idiomark/mcp** serves personality documentation via MCP.

```
┌─────────────────────────────────────────────────────────────┐
│                    Idiomark MCP Server                          │
│                                                             │
│  ┌─────────────┐         ┌─────────────┐                  │
│  │ Context Mode │         │ Engine Mode   │                  │
│  │  (Read-Only) │         │ (Generative)  │                  │
│  └─────────────┘         └─────────────┘                  │
│                                                             │
│  Context: Like Context7 serves code,                 │
│           this serves personality "documentation"               │
│                                                             │
│  Engine:   Generates responses with personality     │
│           applied (local LLM or user's API key)            │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Context Mode (Default)

Read-only personality data. No external API calls.

```typescript
import { IdiomarkMCPServer } from '@idiomark/mcp'

const server = new IdiomarkMCPServer({
  idiomarkFile: './me.idiomark'
  // No llm config = Context mode
})

await server.start()
```

**Tools:**
- `query_domain` - Query domain expertise
- `check_value_conflict` - Check text against values
- `get_voice` - Get voice parameters
- `get_system_prompt` - Get system prompt

**Resources:**
- `idiomark:///personality` - Full Idiomark file
- `idiomark:///voice` - Voice profile
- `idiomark:///values` - Core values
- `idiomark:///domains` - Domain expertise

### Engine Mode (Local LLM)

Generative with **data stays on-device**.

```typescript
import { IdiomarkMCPServer } from '@idiomark/mcp'

const server = new IdiomarkMCPServer({
  idiomarkFile: './me.idiomark',
  mode: {
    mode: 'engine',
    llm: {
      type: 'ollama',
      model: 'llama3.2'
    }
  }
})

await server.start()
```

**Additional Tools:**
- `generate_response` - Generate AI response with personality
- `apply_voice` - Transform text to match voice
- `suggest_actions` - Suggest actions based on values
- `evaluate_alignment` - Evaluate text alignment

### Engine Mode (User's API Key)

Generative with **explicit data upload consent**.

```typescript
import { IdiomarkMCPServer } from '@idiomark/mcp'

const server = new IdiomarkMCPServer({
  idiomarkFile: './me.idiomark',
  mode: {
    mode: 'engine',
    llm: {
      type: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY
    }
  }
})

await server.start()
```

⚠️ **Warning:** Your personality data will be sent to the LLM provider.

## CLI Usage

```bash
# Context mode (automatic)
npx @idiomark/mcp --file ./me.idiomark

# Engine mode (local LLM)
npx @idiomark/mcp --file ./me.idiomark --llm-type ollama

# Engine mode (API key)
npx @idiomark/mcp --file ./me.idiomark --llm-type anthropic --api-key $ANTHROPIC_API_KEY

# HTTP transport
npx @idiomark/mcp --file ./me.idiomark --transport http --port 3000
```

## Claude Desktop Config

### Simple Config

```json
{
  "mcpServers": {
    "my-personality": {
      "command": "npx",
      "args": [
        "-y",
        "@idiomark/mcp",
        "--file",
        "C:\\Users\\you\\.idiomark\\me.idiomark"
      ]
    }
  }
}
```

### With Local LLM

```json
{
  "mcpServers": {
    "my-personality-engine": {
      "command": "npx",
      "args": [
        "-y",
        "@idiomark/mcp",
        "--file",
        "C:\\Users\\you\\.idiomark\\me.idiomark",
        "--llm-type",
        "ollama"
      ]
    }
  }
}
```

### With API Key

```json
{
  "mcpServers": {
    "my-personality-api": {
      "command": "npx",
      "args": [
        "-y",
        "@idiomark/mcp",
        "--file",
        "C:\\Users\\you\\.idiomark\\me.idiomark",
        "--llm-type",
        "anthropic",
        "--api-key",
        "${ANTHROPIC_API_KEY}"
      ],
      "env": {
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}"
      }
    }
  }
}
```

## Mode Comparison

| Feature | Context Mode | Engine Mode |
|---------|-------------|-------------|
| **Privacy** | ✓ Maximum (data stays local) | Local: ✓ / Cloud: ⚠️ |
| **Tools** | Query tools only | Query + Generative |
| **LLM Calls** | ✗ None | ✓ Local or cloud |
| **API Key Needed** | ✗ No | Local: ✗ / Cloud: ✓ |
| **Response Generation** | ✗ | ✓ |
| **Voice Transformation** | ✗ | ✓ |

## Installation

```bash
npm install @idiomark/mcp
```

Or use directly with npx:

```bash
npx @idiomark/mcp --file ./me.idiomark
```

## Supported LLMs

### Local LLMs (Privacy-First)

| LLM | Priority | Support Date |
|-----|----------|-------------|
| **Ollama** | P0 | Day 7 |
| **LM Studio** | P1 | Day 14 |
| **LocalAI** | P2 | Day 30 |
| **Jan** | P3 | Day 45 |

### Cloud LLMs (User's API Key)

| LLM | Status |
|-----|--------|
| **Anthropic** | ✓ Supported |
| **OpenAI** | ✓ Supported |

## Architecture

```
@idiomark/mcp/
├── src/
│   ├── server.ts       # Main MCPServer class
│   ├── modes/
│   │   ├── context.ts  # Context mode implementation
│   │   └── engine.ts   # Engine mode implementation
│   ├── types.ts       # TypeScript types
│   ├── cli.ts         # CLI entry point
│   └── index.ts       # Main exports
├── examples/
│   ├── claude-desktop-simple.json
│   └── claude-desktop.json
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

## Security

### Encryption Support

Idiomark files can be encrypted. Keys stay local. Data never leaves.

```typescript
const server = new IdiomarkMCPServer({
  idiomarkFile: './me.idiomark.enc',
  keyProvider: () => getKeyFromUser()
})
```

### Cloud LLM Data Upload

Using cloud LLMs (Anthropic, OpenAI) requires **explicit consent**:

```bash
npx @idiomark/mcp \
  --file ./me.idiomark \
  --llm-type anthropic \
  --api-key $ANTHROPIC_API_KEY \
  --accept-data-upload
```

**You will be warned** before data is sent.

## Comparison

| | @idiomark/mcp | Context7 | Clueo |
|--|----------|----------|--------|
| **Purpose** | Personality context | Code context | Personality engine |
| **Extraction** | 43+ platforms | Codebases | Manual config |
| **Open Source** | ✓ MIT | ✓ MIT | ✓ MIT |
| **MCP Server** | ✓ | ✓ | ✓ |
| **Local LLM** | ✓ | ✗ | ✓ |
| **User's API Key** | ✓ | ✗ | ✗ |

## License

MIT

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)

## Links

- [Idiomark Protocol](https://github.com/idiomark-protocol)
- [Context7](https://github.com/upstash/context7) - Inspiration
- [MCP Specification](https://spec.modelcontextprotocol.io/)
