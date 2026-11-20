# Idiomark Protocol v1 Specification

> **Status:** Stable | **Version:** 1.x.x | **Last Updated:** 2026-02-17

## Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Core Types](#core-types)
4. [Field Reference](#field-reference)
5. [Validation Rules](#validation-rules)
6. [Examples](#examples)
7. [Implementation Notes](#implementation-notes)
8. [Versioning](#versioning)

---

## Overview

Idiomark Protocol v1 is the stable core of the Personality Characterization Protocol. It defines a JSON-based file format for capturing human personality traits derived from text analysis across multiple platforms.

### Design Principles

- **Stability**: V1 guarantees backward compatibility
- **Simplicity**: Required fields are minimal, optional fields enable richness
- **Extensibility**: V2 experimental features build on V1 without breaking changes
- **Language Agnostic**: JSON Schema enables implementations in any language

### Schema Location

```
spec/v1/idiomark.schema.json
```

---

## File Structure

### Minimal Valid File

```json
{
  "idiomark": "1.0.0",
  "id": "idiomark_unique_identifier",
  "created": "2026-01-01T00:00:00Z",
  "updated": "2026-01-01T00:00:00Z",
  "metadata": {
    "entity": {
      "type": "human",
      "sources": ["github"]
    },
    "extraction": {
      "date": "2026-01-01T00:00:00Z",
      "sample_size": 100,
      "timeframe": {
        "from": "2025-01-01T00:00:00Z",
        "to": "2026-01-01T00:00:00Z"
      }
    }
  },
  "personality": {
    "voice": { ... },
    "patterns": { ... },
    "domains": [],
    "values": [],
    "knowledge": { ... }
  }
}
```

### Root Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `idiomark` | string | ✅ | Protocol version (must match `^1\.\d+\.\d+(-[a-zA-Z0-9]+)?$`) |
| `id` | string | ✅ | Unique identifier (must match `^idiomark_[a-zA-Z0-9_-]+$`) |
| `created` | string | ✅ | ISO 8601 timestamp of file creation |
| `updated` | string | ✅ | ISO 8601 timestamp of last update |
| `metadata` | object | ✅ | Extraction metadata |
| `personality` | object | ✅ | Personality profile data |
| `signature` | string | ❌ | Optional cryptographic signature |

---

## Core Types

### Metadata

Contains information about the entity being profiled and how the data was extracted.

```typescript
interface IdiomarkMetadata {
  entity: {
    name?: string                    // Optional display name
    type: 'human' | 'brand' | 'bot' | 'fictional'
    sources: string[]                // Platform identifiers (e.g., "github", "twitter")
  }
  extraction: {
    date: string                     // When extraction was performed (ISO 8601)
    sample_size: number              // Number of content samples analyzed
    timeframe: {
      from: string                   // Start of data range (ISO 8601)
      to: string                     // End of data range (ISO 8601)
    }
  }
  validator?: string                 // Analysis provider/model (optional)
}
```

### Personality

The core personality profile containing communication style, linguistic patterns, expertise domains, values, and knowledge areas.

```typescript
interface Personality {
  voice: Voice           // Communication style characteristics
  patterns: Patterns     // Linguistic analysis results
  domains: Domain[]      // Areas of expertise
  values: Value[]        // Values and principles
  knowledge: Knowledge   // Topics and terminology
}
```

---

## Field Reference

### Voice

Communication style and tone characteristics.

| Field | Type | Required | Range | Description |
|-------|------|----------|-------|-------------|
| `tone.primary` | string | ✅ | - | Primary tone (e.g., "casual", "professional") |
| `tone.secondary` | string | ❌ | - | Secondary tone modifier |
| `tone.confidence` | number | ✅ | 0.0-1.0 | Confidence of tone detection |
| `formality` | number | ✅ | 0.0-1.0 | 0 = very casual, 1 = very formal |
| `humor` | number | ✅ | 0.0-1.0 | 0 = serious, 1 = very humorous |
| `sarcasm` | number | ✅ | 0.0-1.0 | 0 = sincere, 1 = very sarcastic |
| `enthusiasm` | number | ✅ | 0.0-1.0 | 0 = flat, 1 = very enthusiastic |
| `directness` | number | ✅ | 0.0-1.0 | 0 = indirect, 1 = very direct |

**Optional Big Five fields** (included in Voice for convenience):

| Field | Type | Required | Range | Description |
|-------|------|----------|-------|-------------|
| `openness` | number | ❌ | 0.0-1.0 | Creativity, curiosity, adventure-seeking |
| `conscientiousness` | number | ❌ | 0.0-1.0 | Organization, discipline, reliability |
| `extraversion` | number | ❌ | 0.0-1.0 | Social energy, stimulation-seeking |
| `agreeableness` | number | ❌ | 0.0-1.0 | Cooperation, empathy, harmony-seeking |
| `neuroticism` | number | ❌ | 0.0-1.0 | Emotional volatility (0 = stable) |

### Patterns

Linguistic patterns derived from text analysis.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sentence_length.mean` | number | ✅ | Average sentence length in words |
| `sentence_length.stddev` | number | ✅ | Standard deviation of sentence length |
| `paragraph_length.mean` | number | ❌ | Average paragraph length in sentences |
| `paragraph_length.stddev` | number | ❌ | Standard deviation of paragraph length |
| `emoji_usage.frequency` | string | ✅ | One of: "none", "low", "medium", "high" |
| `emoji_usage.top_emojis` | string[] | ✅ | Most frequently used emojis |
| `emoji_usage.position` | string | ❌ | One of: "start", "end", "mixed" |
| `punctuation.exclamation_frequency` | number | ✅ | 0.0-1.0 frequency of exclamation marks |
| `punctuation.question_frequency` | number | ✅ | 0.0-1.0 frequency of question marks |
| `punctuation.ellipsis_usage` | string | ✅ | One of: "none", "low", "medium", "high" |
| `capitalization.all_caps_frequency` | number | ❌ | 0.0-1.0 frequency of ALL CAPS |
| `capitalization.random_caps` | boolean | ❌ | Whether random capitalization is present |

**LIWC Categories** (optional, based on psycholinguistics research):

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `liwc_categories.first_person_singular` | number | 0.0-1.0 | "I, me, my" usage - self-focus indicator |
| `liwc_categories.first_person_plural` | number | 0.0-1.0 | "we, us" usage - collective focus |
| `liwc_categories.third_person` | number | 0.0-1.0 | "he, she, they" usage - other focus |
| `liwc_categories.positive_emotion` | number | 0.0-1.0 | Positive emotion word ratio |
| `liwc_categories.negative_emotion` | number | 0.0-1.0 | Negative emotion word ratio |
| `liwc_categories.cognitive_process` | number | 0.0-1.0 | Insight, cause, know - thinking style |
| `liwc_categories.social_words` | number | 0.0-1.0 | Social process word ratio |
| `liwc_categories.work_words` | number | 0.0-1.0 | Work-related term ratio |
| `liwc_categories.achievement_words` | number | 0.0-1.0 | Award, earn, success - goal focus |
| `liwc_categories.articles` | number | 0.0-1.0 | "a, an, the" - complexity indicator |
| `liwc_categories.long_words` | number | 0.0-1.0 | Words > 6 letters - sophistication |

### Domain

Area of expertise or interest.

```typescript
interface Domain {
  name: string           // Domain identifier (e.g., "software-engineering")
  confidence: number     // 0.0-1.0 confidence of classification
  evidence?: string[]    // Supporting evidence from content
}
```

### Value

Expressed value or principle.

```typescript
interface Value {
  name: string                          // Value identifier (e.g., "privacy")
  sentiment: 'positive' | 'negative' | 'neutral'  // How value is expressed
  confidence: number                    // 0.0-1.0 confidence of detection
}
```

### Knowledge

Topics and terminology knowledge.

```typescript
interface Knowledge {
  frequent_terms: string[]     // Commonly used terms and phrases
  mentions?: {
    people?: string[]          // Frequently mentioned people
    projects?: string[]        // Frequently mentioned projects
    organizations?: string[]   // Frequently mentioned organizations
  }
  topics: {
    primary: string[]          // Primary discussion topics
    secondary?: string[]       // Secondary discussion topics
  }
}
```

---

## Validation Rules

### Required Fields

The following fields MUST be present in every V1 Idiomark file:

1. `idiomark` - Version string
2. `id` - Unique identifier
3. `created` - Creation timestamp
4. `updated` - Update timestamp
5. `metadata.entity.type` - Entity type
6. `metadata.entity.sources` - At least one source
7. `metadata.extraction.date` - Extraction date
8. `metadata.extraction.sample_size` - Sample size (≥ 1)
9. `metadata.extraction.timeframe.from` - Start date
10. `metadata.extraction.timeframe.to` - End date
11. `personality.voice` - Voice object with required subfields
12. `personality.patterns` - Patterns object with required subfields
13. `personality.domains` - Domains array (can be empty)
14. `personality.values` - Values array (can be empty)
15. `personality.knowledge` - Knowledge object with required subfields

### Numeric Ranges

All numeric fields with ranges:
- Scores (formality, humor, etc.): `0.0 ≤ value ≤ 1.0`
- Confidence values: `0.0 ≤ value ≤ 1.0`
- Sample size: `value ≥ 1`
- Sentence/paragraph statistics: `value ≥ 0`

### String Patterns

- `idiomark`: Must match `^1\.\d+\.\d+(-[a-zA-Z0-9]+)?$`
  - Valid: `1.0.0`, `1.1.0`, `1.0.0-alpha`
  - Invalid: `2.0.0`, `1.0`, `v1.0.0`
- `id`: Must match `^idiomark_[a-zA-Z0-9_-]+$`
  - Valid: `idiomark_abc123`, `idiomark_test-user`, `idiomark_2026_01_15`
  - Invalid: `abc123`, `idiomark-abc`, `idiomark@test`

### Enum Values

- `entity.type`: `human`, `brand`, `bot`, `fictional`
- `emoji_usage.frequency`: `none`, `low`, `medium`, `high`
- `emoji_usage.position`: `start`, `end`, `mixed`
- `ellipsis_usage`: `none`, `low`, `medium`, `high`
- `value.sentiment`: `positive`, `negative`, `neutral`

---

## Examples

### Minimal File

```json
{
  "idiomark": "1.0.0",
  "id": "idiomark_minimal_example",
  "created": "2026-01-01T00:00:00Z",
  "updated": "2026-01-01T00:00:00Z",
  "metadata": {
    "entity": {
      "type": "human",
      "sources": ["example"]
    },
    "extraction": {
      "date": "2026-01-01T00:00:00Z",
      "sample_size": 1,
      "timeframe": {
        "from": "2026-01-01T00:00:00Z",
        "to": "2026-01-01T00:00:00Z"
      }
    }
  },
  "personality": {
    "voice": {
      "tone": { "primary": "neutral", "confidence": 0.5 },
      "formality": 0.5,
      "humor": 0.5,
      "sarcasm": 0.5,
      "enthusiasm": 0.5,
      "directness": 0.5
    },
    "patterns": {
      "sentence_length": { "mean": 10, "stddev": 2 },
      "emoji_usage": { "frequency": "none", "top_emojis": [] },
      "punctuation": {
        "exclamation_frequency": 0,
        "question_frequency": 0,
        "ellipsis_usage": "none"
      }
    },
    "domains": [],
    "values": [],
    "knowledge": {
      "frequent_terms": [],
      "topics": { "primary": [] }
    }
  }
}
```

### Complete File

See [test vectors](../../conformance/test-vectors/v1/complete.json) for a fully populated example.

---

## Implementation Notes

### Timestamps

- Use ISO 8601 format with timezone: `2026-01-15T10:30:00Z`
- All timestamps should be in UTC
- `created` should not change after initial file creation
- `updated` should reflect the last modification time

### Numeric Precision

- Use floating-point numbers for scores (0.0-1.0)
- Precision of 2-3 decimal places is typically sufficient
- Avoid integer division when calculating ratios

### Empty Arrays

- `domains` and `values` can be empty arrays
- `frequent_terms`, `top_emojis`, etc. can be empty arrays
- Empty arrays are valid; `null` is not

### Unicode

- All string fields support UTF-8 encoding
- Unicode characters are allowed in text content
- The `id` field is restricted to ASCII alphanumeric, underscore, and hyphen

---

## Versioning

### Version Pattern

V1 versions follow the pattern: `1.MAJOR.PATCH[-PRERELEASE]`

- `1` - Fixed major version for V1
- `MAJOR` - Incremented for breaking changes within V1 (rare)
- `PATCH` - Incremented for bug fixes and clarifications
- `PRERELEASE` - Optional prerelease identifier (e.g., `-alpha`, `-beta`)

### Compatibility Promise

V1 guarantees:
- **Backward compatibility**: Files valid under 1.0.0 remain valid under 1.x.x
- **No required field removal**: All required fields will remain required
- **No type changes**: Field types will not change
- **Optional field additions**: New optional fields may be added

### Upgrading from V1 to V2

V2 is a superset of V1:
- All V1 files are valid V2 files
- V2 adds optional experimental fields
- To upgrade: change `idiomark` version and add V2 fields as needed

---

## JSON Schema

The authoritative schema is available at:

```
spec/v1/idiomark.schema.json
```

Use any JSON Schema Draft-07 compliant validator to validate Idiomark files.

### Validation Example (JavaScript)

```javascript
import Ajv from 'ajv'
import schema from './spec/v1/idiomark.schema.json'

const ajv = new Ajv()
const validate = ajv.compile(schema)

const idiomarkFile = { /* ... */ }

if (validate(idiomarkFile)) {
  console.log('Valid Idiomark file')
} else {
  console.log('Validation errors:', validate.errors)
}
```

### Validation Example (Python)

```python
import json
from jsonschema import validate, ValidationError

with open('spec/v1/idiomark.schema.json') as f:
    schema = json.load(f)

with open('my-profile.idiomark') as f:
    idiomark_file = json.load(f)

try:
    validate(idiomark_file, schema)
    print('Valid Idiomark file')
except ValidationError as e:
    print(f'Validation error: {e.message}')
```

### Validation Example (Go)

```go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"

    "github.com/xeipuuv/gojsonschema"
)

func main() {
    schemaLoader := gojsonschema.NewReferenceLoader("file://./spec/v1/idiomark.schema.json")
    documentLoader := gojsonschema.NewReferenceLoader("file://./my-profile.idiomark")

    result, err := gojsonschema.Validate(schemaLoader, documentLoader)
    if err != nil {
        panic(err)
    }

    if result.Valid() {
        fmt.Println("Valid Idiomark file")
    } else {
        fmt.Println("Validation errors:")
        for _, desc := range result.Errors() {
            fmt.Printf("- %s\n", desc)
        }
    }
}
```

### Validation Example (Rust)

```rust
use jsonschema::{JSONSchema, ValidationError};
use serde_json::Value;
use std::fs;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let schema_str = fs::read_to_string("spec/v1/idiomark.schema.json")?;
    let schema: Value = serde_json::from_str(&schema_str)?;
    let compiled = JSONSchema::compile(&schema)?;

    let idiomark_str = fs::read_to_string("my-profile.idiomark")?;
    let idiomark: Value = serde_json::from_str(&idiomark_str)?;

    let result = compiled.validate(&idiomark);

    match result {
        Ok(_) => println!("Valid Idiomark file"),
        Err(errors) => {
            println!("Validation errors:");
            for error in errors {
                println!("- {}", error);
            }
        }
    }

    Ok(())
}
```

---

## See Also

- [V2 Experimental Specification](../v2/README.md)
- [Conformance Test Suite](../../conformance/README.md)
- [Certification Program](../../certification/README.md)
- [Contributing Adapters](../../docs-site/docs/contributing-adapters.md)
