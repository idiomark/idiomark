# Loader - File I/O Operations Guide

**Last Updated:** 2026-02-12
**Component:** `@idiomark/core`
**Source:** [loader.ts](src/loader.ts)

---

## Overview

The Loader module provides file I/O operations for Idiomark files:

- **Loading** - Read and parse Idiomark files from disk
- **Validation** - Optional schema validation during load
- **Listing** - Find all Idiomark files in directories
- **Saving** - Write Idiomark files with formatting options
- **Deleting** - Remove Idiomark files from disk
- **Batch Operations** - Load multiple files at once

---

## Quick Start

```typescript
import { loadIdiomarkFile, writeIdiomarkFile } from '@idiomark/core'

// Load a Idiomark file
const result = await loadIdiomarkFile('./profile.idiomark.json', {
  validate: true
})

if (result) {
  console.log('Loaded:', result.file.id)
  console.log('Validated:', result.validated)
}

// Write a Idiomark file
await writeIdiomarkFile('./output/profile.idiomark.json', idiomarkFile, {
  format: true  // Pretty print
})
```

---

## Core API

### loadIdiomarkFile()

Load a Idiomark file from disk with optional validation.

```typescript
async function loadIdiomarkFile(
  path: string,
  options?: LoadOptions
): Promise<LoadResult | null>
```

#### Parameters

```typescript
interface LoadOptions {
  validate?: boolean          // Validate against schema (default: true)
  throwOnNotFound?: boolean  // Throw error if file missing (default: false)
}
```

**Behavior:**
1. Reads file from disk using `fs.readFile()`
2. Parses JSON content
3. Validates against schema if `validate: true`
4. Returns `LoadResult` on success
5. Returns `null` on file not found (if `throwOnNotFound: false`)

#### Returns

```typescript
interface LoadResult {
  file: IdiomarkFile        // The parsed Idiomark file object
  path: string            // Absolute path to file
  validated: boolean      // Whether validation passed
}
```

**Example:**
```typescript
const result = await loadIdiomarkFile('./my-personality.idiomark.json')

console.log('Idiomark ID:', result.file.id)
console.log('Version:', result.file.idiomark)
console.log('Sources:', result.file.metadata.entity.sources)
```

---

### loadIdiomarkById()

Load a Idiomark file by ID from a directory.

```typescript
async function loadIdiomarkById(
  directory: string,
  id: string,
  options?: LoadOptions
): Promise<LoadResult | null>
```

**Search Pattern:**

Searches for files in this order:
1. `{id}.idiomark.json`
2. `{id}.idiomark`
3. `{id}.json`

**Example:**
```typescript
const result = await loadIdiomarkById('./personalities', 'idiomark_abc123')
```

**Use case:** When you know the Idiomark file ID but not the exact path.

---

### listIdiomarkFiles()

List all Idiomark files in a directory.

```typescript
const files = await listIdiomarkFiles('./personalities')

console.log(files)  // ['profile1.idiomark.json', 'profile2.idiomark.json']
```

**Returns:** Array of filenames

**Extensions Matched:**
- `.idiomark.json` - Full Idiomark format
- `.idiomark` - Idiomark format without extension
- `.json` - JSON file (if also matches ID pattern)

---

### loadAllIdiomarkFiles()

Load all Idiomark files from a directory.

```typescript
const results = await loadAllIdiomarkFiles('./personalities', {
  validate: true
})

console.log(`Loaded ${results.length} Idiomark files`)

results.forEach(result => {
  if (result) {
    console.log(`- ${result.file.id}: ${result.file.personality.voice.tone.primary}`)
  }
})
```

**Returns:** Array of `LoadResult` objects

---

### writeIdiomarkFile()

Write a Idiomark file to disk.

```typescript
async function writeIdiomarkFile(
  path: string,
  file: IdiomarkFile,
  options?: { format?: boolean }
): Promise<void>
```

**Parameters:**
- `path` - File path to write
- `file` - IdiomarkFile object to write
- `options.format` - Pretty-print JSON if true (default: `true`)

**Behavior:**
1. Ensures directory exists (creates with `recursive: true`)
2. Writes file with UTF-8 encoding
3. Uses 2-space indentation if `format: true`

**Example:**
```typescript
await writeIdiomarkFile('./profiles/my-profile.idiomark.json', personality, {
  format: true
})
```

---

### deleteIdiomarkFile()

Delete a Idiomark file from disk.

```typescript
async function deleteIdiomarkFile(path: string): Promise<boolean>
```

**Behavior:**
1. Attempts `fs.unlink()`
2. Returns `true` if successful
3. Returns `false` if file doesn't exist (ENOENT)

**Example:**
```typescript
const deleted = await deleteIdiomarkFile('./old-profile.idiomark.json')

if (deleted) {
  console.log('File deleted successfully')
} else {
  console.log('File not found (already deleted?)')
}
```

---

## File Patterns

### Supported Extensions

The loader recognizes these Idiomark file extensions:

| Extension | Format | Description |
|-----------|--------|-------------|
| `.idiomark.json` | Full | Complete Idiomark file format |
| `.idiomark` | Short | Idiomark format without `.json` extension |
| `.json` | JSON | May be Idiomark file if matches ID pattern |

### ID Pattern Extraction

When loading by ID, the system looks for files matching:
- `{id}.idiomark.json` - Preferred
- `{id}.idiomark` - Alternative
- `{id}.json` - Fallback

### Path Handling

The loader uses Node.js `path` module:
- Joins directory and filename using platform-specific separators
- Creates parent directories if needed with `fs.mkdir()`

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|--------|--------|----------|
| `ENOENT` | File not found | Check file exists before loading |
| `EISDIR` | Path is directory | Use correct file path |
| `EACCES` | Permission denied | Check file permissions |
| `EJSON` | Invalid JSON | Verify Idiomark file format |
| `ENOSPC` | System limit | Check available disk space |

### Try-Catch Pattern

```typescript
try {
  const result = await loadIdiomarkFile('./profile.idiomark.json', {
    validate: true,
    throwOnNotFound: true
  })

  console.log('Loaded:', result.file.id)
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('File not found:', error.path)
  } else if (error.code === 'EJSON') {
    console.error('Invalid JSON format:', error.message)
  } else {
    console.error('Load failed:', error.message)
  }
}
```

---

## Best Practices

### 1. Always Validate

```typescript
// Always validate when loading
const result = await loadIdiomarkFile('./profile.idiomark.json', {
  validate: true  // Enable validation
})
```

**Why:** Catches malformed files early, prevents downstream errors.

### 2. Use Appropriate Paths

```typescript
// Use absolute paths for clarity
const path = '/Users/john/.idiomark/profiles/my-profile.idiomark.json'

// Or use relative to current working directory
const path = './personalities/profile.idiomark.json'
```

### 3. Handle Not Found Gracefully

```typescript
const result = await loadIdiomarkFile('./profile.idiomark.json', {
  throwOnNotFound: false  // Don't throw, just return null
})

if (!result) {
  console.log('File not found, using defaults')
}
```

### 4. Check Before Write

```typescript
// Don't overwrite existing data
const exists = await fs.existsSync(path)
if (exists) {
  console.warn('File already exists, skipping')
  return
}

await writeIdiomarkFile(path, idiomarkFile)
```

### 5. Use Async Operations

```typescript
// All loader functions are async
await loadIdiomarkFile(path)  // Returns promise
await writeIdiomarkFile(path, file)  // Returns promise
await deleteIdiomarkFile(path)   // Returns promise
```

**Why:** Prevents blocking I/O operations.

---

## Examples

### Basic Usage

```typescript
import { loadIdiomarkFile, writeIdiomarkFile } from '@idiomark/core'

async function savePersonality(personality: Personality, filename: string) {
  const path = `./profiles/${filename}.idiomark.json`

  await writeIdiomarkFile(path, {
    idiomark: personality,
    format: true
  })

  console.log('Saved to:', path)
}
```

### Batch Loading

```typescript
import { loadAllIdiomarkFiles } from '@idiomark/core'

async function loadAllProfiles(directory: string) {
  const results = await loadAllIdiomarkFiles(directory, {
    validate: true
  })

  const profiles = results
    .filter(r => r !== null)
    .map(r => r.file)

  console.log(`Loaded ${profiles.length} profiles`)

  return profiles
}
```

### Safe Deletion

```typescript
import { deleteIdiomarkFile, listIdiomarkFiles } from '@idiomark/core'

async function cleanupOldProfiles(directory: string) {
  const files = await listIdiomarkFiles(directory)

  for (const file of files) {
    // Confirm before deleting
    if (file.includes('old-')) {
      await deleteIdiomarkFile(`${directory}/${file}`)
    }
  }
}
```

---

## Integration Examples

### With Extraction

```typescript
import { extractFromPlatforms, writeIdiomarkFile } from '@idiomark/core'

const result = await extractFromPlatforms({
  sources: ['github'],
  sampleSize: 500,
  auth: { github: { token: process.env.GITHUB_TOKEN } }
})

// Save the result
await result.save('./github-profile.idiomark.json')
```

### With Validation

```typescript
import { loadIdiomarkFile, IdiomarkValidator } from '@idiomark/core'

const validator = new IdiomarkValidator()
const result = await loadIdiomarkFile('./profile.idiomark.json', {
  validate: true
})

if (!result.validated) {
  console.error('Validation failed:', result.file)
}
```

---

## See Also

- [API Reference](API_REFERENCE.md) - All exported APIs
- [IdiomarkFile Type](API_REFERENCE.md#idiomarkfile-type) - Complete file structure
- [Validator Usage](API_REFERENCE.md#idiomarkvalidator) - Validation API
