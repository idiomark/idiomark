<div align="center">
  <img src="https://raw.githubusercontent.com/idiomark/.github/main/banner.svg" alt="Idiomark — the personality format for AI" width="100%">
</div>

# Idiomark

> **The personality format for AI.**

`idiomark` is an open (MIT) file format + SDK that captures how a specific person
speaks and thinks — voice, tone, writing patterns, values, cognitive style — into a
portable file, so AI systems can sound like *that person* and understand them,
instead of sounding generic.

```json
{
  "idiomark": "1.0.0",
  "id": "idiomark_jordan",
  "created": "2026-11-25T00:00:00Z",
  "updated": "2026-11-25T00:00:00Z",
  "metadata": {
    "entity": { "name": "Jordan", "type": "human", "sources": ["github", "email"] },
    "extraction": {
      "date": "2026-11-25T00:00:00Z",
      "sample_size": 1200,
      "timeframe": { "from": "2026-08-25T00:00:00Z", "to": "2026-11-25T00:00:00Z" }
    }
  },
  "personality": {
    "voice": {
      "tone": { "primary": "direct", "secondary": "dry", "confidence": 0.87 },
      "formality": 0.25,
      "humor": 0.55,
      "sarcasm": 0.6,
      "enthusiasm": 0.3,
      "directness": 0.92
    },
    "patterns": {
      "sentence_length": { "mean": 9.4, "stddev": 4.1 },
      "emoji_usage": { "frequency": "none", "top_emojis": [] },
      "punctuation": {
        "exclamation_frequency": 0.02,
        "question_frequency": 0.08,
        "ellipsis_usage": "none"
      }
    },
    "domains": [{ "name": "software-engineering", "confidence": 0.93 }],
    "values": [
      { "name": "candor", "sentiment": "positive", "confidence": 0.91 },
      { "name": "brevity", "sentiment": "positive", "confidence": 0.88 }
    ],
    "knowledge": {
      "frequent_terms": [],
      "topics": { "primary": ["infrastructure", "tooling"] }
    }
  }
}
```

## Why

AI models generate beige responses by default. Prompting for a persona every time
doesn't scale and doesn't travel — what works on one model drifts on another.
A `.idiomark` file is a durable, versioned, portable personality profile that any
system can consume.

## Packages

| Package | What it does |
|---------|--------------|
| [`@idiomark/core`](packages/core) | Schema, loader, reader, validator, generator |
| [`@idiomark/sdk`](packages/sdk) | High-level API for consuming profiles |
| [`@idiomark/cli`](packages/cli) | `idiomark` command-line tool |
| [`@idiomark/inference`](packages/inference) | Apply a profile to AI responses |
| [`@idiomark/mcp`](packages/mcp) | MCP server exposing profiles to agents |
| [`@idiomark/projectors`](packages/projectors) | Project a profile onto tasks |

## Spec

- [`spec/v1`](spec/v1) — stable core schema
- [`spec/v2`](spec/v2) — draft v2 (Big Five, linguistic markers, cognitive patterns)

Versioning follows a meta-style model: v2 features ship experimentally alongside
stable v1 without breaking readers.

## Quick start

```bash
pnpm install
pnpm build
node packages/cli/dist/index.js --help
```

## Status

Pre-1.0. The format is in active development; breaking changes are possible before
v1 is locked. See [`spec/v1/README.md`](spec/v1/README.md) for what's stable.

## License

[MIT](LICENSE) © Jordan Newell
