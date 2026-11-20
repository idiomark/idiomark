# @idiomark/cli

Command-line interface for Idiomark (Personality Characterization Protocol).

## Installation

```bash
# Global installation
npm install -g @idiomark/cli

# Or use with npx
npx idiomark --help
```

## Quick Start

```bash
# Clone a personality from Twitter
idiomark clone @user -t -o user.idiomark

# Become a personality (interactive chat)
idiomark become user.idiomark

# Compare two personalities
idiomark diff me.idiomark you.idiomark

# Quick identity dump
idiomark whoami user.idiomark

# Health check a personality
idiomark doctor user.idiomark

# Merge personalities
idiomark merge me.idiomark you.idiomark -o hybrid.idiomark
```

## Commands

### Personality Extraction

| Command | Alias | Description |
|---------|-------|-------------|
| `idiomark clone <source>` | - | Clone personality from various sources (`@user`, `github:user`, URL) |
| `idiomark extract` | `x` | Extract personality from connected platforms |
| `idiomark init` | `n` | Create a new Idiomark file interactively |

#### `idiomark clone <source>`

Clone personality from various sources.

```bash
# From Twitter handle
idiomark clone @twitter_user -t -o user.idiomark

# From GitHub username
idiomark clone github:github_user -g -o user.idiomark

# From URL (auto-detect)
idiomark clone https://twitter.com/user -o user.idiomark

# Multiple sources
idiomark clone @user -g -t -o user.idiomark
```

**Options:**
| Flag | Description |
|-------|-------------|
| `-g, --github` | Include GitHub data |
| `-t, --twitter` | Include Twitter data |
| `-o, --output <file>` | Output file path |
| `-s, --sample-size <n>` | Number of posts to analyze (default: 1000) |
| `-v, --verbose` | Verbose output |

#### `idiomark extract`

Extract personality from connected platforms (requires prior auth).

```bash
# Extract from multiple platforms
idiomark extract -t -g -o my-personality.idiomark

# With custom sample size
idiomark extract -t -s 5000 -o my-personality.idiomark
```

**Options:**
| Flag | Description |
|-------|-------------|
| `-t, --twitter` | Include Twitter data |
| `-g, --github` | Include GitHub data |
| `-r, --reddit` | Include Reddit data |
| `-o, --output <file>` | Output file path (default: `entity.idiomark`) |
| `-s, --sample-size <n>` | Number of posts to analyze (default: 1000) |
| `-v, --verbose` | Verbose output |

#### `idiomark init`

Create a new Idiomark file interactively.

```bash
# Interactive mode
idiomark init

# Direct arguments
idiomark init -n "Name" -t human -o entity.idiomark
```

**Options:**
| Flag | Description |
|-------|-------------|
| `-n, --name <name>` | Entity name |
| `-t, --type <type>` | Entity type (`human`, `ai`, `fictional`) |
| `-o, --output <file>` | Output filename |

### Personality Interaction

| Command | Alias | Description |
|---------|-------|-------------|
| `idiomark become <file>` | `chat`, `c` | Interactive chat with a Idiomark personality |
| `idiomark whoami <file>` | - | Quick identity dump of a Idiomark personality |

#### `idiomark become <file>`

Become a Idiomark personality (alias for `chat`).

```bash
# Start interactive chat
idiomark become user.idiomark

# With specific model
idiomark become user.idiomark -p anthropic -m claude-3-5-sonnet-20241022

# Verbose mode
idiomark become user.idiomark -v

# Disable streaming
idiomark become user.idiomark --no-stream

# Send single message instead of interactive
idiomark become user.idiomark --message "What's your favorite color?"
```

**Options:**
| Flag | Description |
|-------|-------------|
| `-p, --provider <provider>` | LLM provider: `anthropic`, `openai` (default: `anthropic`) |
| `-m, --model <model>` | AI model to use |
| `-v, --verbose` | Verbose output (token usage, etc.) |
| `--no-stream` | Disable streaming responses |
| `--message <msg>` | Send single message instead of interactive mode |

**Interactive Commands:**
- `exit` or `quit` - End chat session
- `clear` - Clear conversation history

#### `idiomark whoami <file>`

Quick identity dump of a Idiomark personality.

```bash
idiomark whoami user.idiomark
```

**Output includes:**
- Entity name and type
- Primary voice traits
- Top expertise domains
- Core values

### Personality Operations

| Command | Alias | Description |
|---------|-------|-------------|
| `idiomark diff <file1> <file2>` | - | Compare two Idiomark personalities side-by-side |
| `idiomark merge <files...>` | - | Merge multiple Idiomark personalities into one |
| `idiomark doctor <file>` | - | Run health checks on a Idiomark file |

#### `idiomark diff <file1> <file2>`

Compare two Idiomark personalities side-by-side.

```bash
idiomark diff me.idiomark you.idiomark
```

**Output includes:**
- Voice trait comparison (formality, humor, enthusiasm, etc.)
- Expertise domain overlap
- Value similarity
- Communication pattern differences

#### `idiomark merge <files...>`

Merge multiple Idiomark personalities into one.

```bash
# Equal weight merge
idiomark merge me.idiomark you.idiomark -o hybrid.idiomark

# Weighted merge
idiomark merge dominant.idiomark secondary.idiomark -w 0.7 0.3 -o blended.idiomark

# Multiple personalities
idiomark merge a.idiomark b.idiomark c.idiomark -o trio.idiomark
```

**Options:**
| Flag | Description |
|-------|-------------|
| `-w, --weights <numbers...>` | Weights for each personality (equal if not specified) |
| `-o, --output <file>` | Output file path (default: `merged.idiomark`) |

#### `idiomark doctor <file>`

Run health checks on a Idiomark file.

```bash
idiomark doctor user.idiomark
```

**Checks:**
- Schema validation
- Required fields presence
- Data quality (outliers, inconsistencies)
- Adapter compatibility
- Projection support

### File Operations

| Command | Alias | Description |
|---------|-------|-------------|
| `idiomark info <file>` | `i` | Display detailed information about a Idiomark file |
| `idiomark validate <file>` | `v` | Validate a Idiomark file |

#### `idiomark info <file>`

Display detailed information about a Idiomark file.

```bash
idiomark info my-personality.idiomark
```

**Output includes:**
- File metadata (ID, version, sources)
- Entity information (name, type)
- Extraction details (sample size, timeframe)
- Personality summary (voice, patterns, domains, values)

#### `idiomark validate <file>`

Validate a Idiomark file against the schema.

```bash
# Standard validation
idiomark validate my-personality.idiomark

# Strict validation
idiomark validate my-personality.idiomark --strict
```

**Options:**
| Flag | Description |
|-------|-------------|
| `-s, --strict` | Enable strict validation mode |

### Server & Apply

| Command | Alias | Description |
|---------|-------|-------------|
| `idiomark serve <file>` | `s` | Start a local inference server with a personality |
| `idiomark apply <file>` | - | Apply a Idiomark personality to external systems |

#### `idiomark serve <file>`

Start a local inference server with a Idiomark personality.

```bash
# Start server on default port 3000
idiomark serve my-personality.idiomark

# Custom port
idiomark serve my-personality.idiomark -p 8080

# With specific model
idiomark serve my-personality.idiomark -m gpt-4o
```

**Options:**
| Flag | Description |
|-------|-------------|
| `-p, --port <number>` | Port to listen on (default: 3000) |
| `-m, --model <model>` | AI model to use (default: `gpt-4`) |

**Server Endpoints:**
| Endpoint | Method | Description |
|----------|----------|-------------|
| `/health` | GET | Health check |
| `/personality` | GET | View loaded personality |
| `/system-prompt` | GET | View system prompt |
| `/generate` | POST | Generate response with personality |
| `/stream` | POST | Stream response (SSE) |

#### `idiomark apply <file>`

Apply a Idiomark personality to external systems (MCP, UCP, HTTP).

```bash
# Start MCP server
idiomark apply user.idiomark -m my-mcp-server

# Generate UCP merchant profile
idiomark apply user.idiomark -u merchant-123 --ucp-business-name "My Business"

# Start HTTP server
idiomark apply user.idiomark -p 8080
```

**Options:**
| Flag | Description |
|-------|-------------|
| `-m, --mcp-server <name>` | Start MCP server with personality |
| `--mcp-transport <stdio|http>` | MCP transport method (default: `stdio`) |
| `--mcp-port <number>` | Port for MCP HTTP transport |
| `-u, --ucp-merchant <id>` | Generate UCP profile for merchant |
| `--ucp-business-name <name>` | Business name for UCP profile |
| `-p, --http-port <number>` | Start HTTP server on port |
| `--provider <anthropic|openai|auto>` | LLM provider (default: `auto`) |
| `--llm-model <model>` | AI model to use |

### Configuration

| Command | Description |
|---------|-------------|
| `idiomark config` | View and edit Idiomark CLI configuration |

#### `idiomark config`

```bash
# List all config values
idiomark config --list

# Get specific value
idiomark config --get defaultModel

# Set value
idiomark config --set defaultModel claude-3-5-sonnet-20241022

# Delete value
idiomark config --delete defaultModel

# Reset to defaults
idiomark config --reset

# Show config file path
idiomark config --path
```

**Options:**
| Flag | Description |
|-------|-------------|
| `-l, --list` | List all config values (non-interactive) |
| `-g, --get <key>` | Get a specific config value |
| `-s, --set <key> <value>` | Set a config value |
| `-d, --delete <key>` | Delete a config value |
| `--reset` | Reset configuration to defaults |
| `--path` | Show config file path |

### Adapters & Projections

| Command | Description |
|---------|-------------|
| `idiomark adapter` | Manage platform adapters for personality extraction |
| `idiomark projection` | Manage projection adapters for personality formats |

See [ADAPTERS.md](../../docs/ADAPTERS.md) for adapter documentation.

## Examples

### Extract and Chat Workflow

```bash
# 1. Clone personality from Twitter
idiomark clone @user -t -o user.idiomark

# 2. View the extracted profile
idiomark info user.idiomark

# 3. Quick identity check
idiomark whoami user.idiomark

# 4. Chat with the personality
idiomark become user.idiomark
```

### Compare Personalities

```bash
# Extract two personalities
idiomark clone @alice -t -o alice.idiomark
idiomark clone @bob -t -o bob.idiomark

# Compare them
idiomark diff alice.idiomark bob.idiomark

# Create a blend
idiomark merge alice.idiomark bob.idiomark -w 0.6 0.4 -o alicebob.idiomark
```

### Health Check

```bash
# Validate and check health
idiomark validate user.idiomark
idiomark doctor user.idiomark
```

## Environment Variables

| Variable | Description | Required For |
|-----------|---------------|--------------|
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | Anthropic provider |
| `OPENAI_API_KEY` | OpenAI API key | OpenAI provider |

## Exit Codes

| Code | Meaning |
|-------|---------|
| 0 | Success |
| 1 | Generic error |
| 2 | File not found |
| 3 | Validation failed |

## Related Packages

- [@idiomark/core](../core) - Core library
- [@idiomark/sdk](../sdk) - SDK for programmatic access
- See [docs/](../../docs/) for complete documentation

## License

MIT
