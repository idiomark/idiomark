<div align="center">
  <img src="https://raw.githubusercontent.com/idiomark/.github/main/banner.svg" alt="Idiomark — the personality format for AI" width="100%">
</div>

# Idiomark

> **The personality format for AI.**

`idiomark` is an open (MIT) file format + SDK that captures how a specific person
speaks and thinks — voice, tone, writing patterns, values, cognitive style — into a
portable file, so AI systems can sound like *that person* and understand them,
instead of sounding generic.

```ini
; sketch of a .idiomark file
[voice]
tone        = direct, dry
hedging     = low
[writing]
sentence    = short. fragments welcome.
emoji       = never
[values]
 candor     = core
 brevity    = core
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
