# Idiomark Protocol Specification

Language-agnostic specification for the **Personality Characterization Protocol (Idiomark)**.

## Overview

Idiomark is a protocol for capturing, storing, and consuming human personality traits for AI generation. This directory contains the authoritative schema definitions that enable independent implementations in any programming language.

## Versions

| Version | Status | Description |
|---------|--------|-------------|
| [v1](./v1/) | **Stable** | Core personality dimensions (voice, patterns, domains, values, knowledge) |
| [v2](./v2/) | **Experimental** | Extended dimensions (Big Five, linguistic markers, cognitive patterns) |

## Schema Format

All schemas are provided in **JSON Schema (Draft-07)** format:

- Language-agnostic with mature implementations in 20+ languages
- Supports both validation and documentation generation
- Direct mapping from the TypeScript reference implementation

## Quick Start

### Validate a Idiomark File

```bash
# Using ajv-cli (Node.js)
npx ajv-cli validate -s spec/v1/idiomark.schema.json -d my-profile.idiomark

# Using jsonschema (Python)
pip install jsonschema
jsonschema -i my-profile.idiomark spec/v1/idiomark.schema.json
```

### Implement a Client

1. Load the schema for your target version
2. Validate Idiomark files against the schema
3. Implement the core types in your language
4. Run the [conformance test suite](../conformance/) to verify compliance

## Schema Structure

```
spec/
├── v1/
│   ├── idiomark.schema.json    # V1 (stable) schema
│   └── README.md
├── v2/
│   ├── idiomark-v2.schema.json # V2 (experimental) schema
│   └── README.md
└── README.md              # This file
```

## Core Types

### IdiomarkFile (Root)

```json
{
  "idiomark": "1.0.0",
  "id": "idiomark_unique_identifier",
  "created": "2026-01-01T00:00:00Z",
  "updated": "2026-01-01T00:00:00Z",
  "metadata": { ... },
  "personality": { ... },
  "signature": "optional-signature"
}
```

### Personality

The core personality object contains:

- **voice** - Communication style (formality, humor, sarcasm, etc.)
- **patterns** - Linguistic patterns (sentence length, emoji usage, punctuation)
- **domains** - Areas of expertise or interest
- **values** - Values and principles expressed
- **knowledge** - Knowledge areas and discussion topics

## Versioning Strategy

- **v1.x.x** - Stable core, backward compatible
- **v2.0.0-beta** - Experimental features, may change

Experimental features that prove valuable graduate to the stable V1 core.

## Certification

Implementations that pass the conformance test suite can be [certified](../certification/). Certified clients are listed in the public registry.

## Related

- [Conformance Test Suite](../conformance/) - Validate your implementation
- [Certification Program](../certification/) - Get your client certified
- [Documentation](https://docs.idiomark.org/) - Full protocol documentation
