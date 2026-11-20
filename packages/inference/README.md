# @idiomark/inference

**Apply personality to AI responses - the core Idiomark product**

## Installation

```bash
pnpm add @idiomark/inference
```

## Usage

```typescript
import { InferenceEngine, createPrompt } from '@idiomark/inference'

// Load Idiomark file
const myIdiomark = JSON.parse(fs.readFileSync('my-personality.idiomark.json'))

// Create engine
const engine = new InferenceEngine({
  idiomark: myIdiomark,
  provider: 'anthropic',
  mode: 'balanced'
})

// Get response with personality
const response = await engine.respond('How do I center a div?')
console.log(response.content)
// Output: "Sure thing! 🚀 Just use flexbox or grid..."
```

## Response Modes

- `strict` - Follow personality exactly
- `balanced` - Personality + helpfulness (default)
- `subtle` - Light personality touch
- `custom` - User-defined mix

## API

| Method | Description |
|--------|-------------|
| `respond(message)` | Get personality-enhanced response |
| `setPersonality(idiomark)` | Update personality |
| `setMode(mode)` | Change response mode |
| `setContext(context)` | Set conversation history |
| `clearContext()` | Clear conversation |

## License

MIT
