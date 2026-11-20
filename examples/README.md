# Idiomark Examples

This directory contains example Idiomark files and usage demonstrations.

## Demo File

### [demo.idiomark](./demo.idiomark)
A complete example Idiomark personality profile demonstrating all features:

- **Voice Profile**: Casual tone, 87% confidence
- **Personality Dimensions**: Formality 25%, Humor 75%, Sarcasm 55%, Enthusiasm 82%, Directness 65%
- **Patterns**: High emoji usage, common punctuation patterns
- **Domains**: JavaScript (95%), TypeScript (89%), React (86%), Web Development (92%), AI (71%), Open Source (84%)
- **Values**: Strong preference for open source and developer experience, negative on over-engineering

### Using the Demo File

```bash
# Validate the demo file
idiomark validate examples/demo.idiomark

# Display detailed information
idiomark info examples/demo.idiomark

# Use with inference server
idiomark serve examples/demo.idiomark --port 3000
```

## Example Workflows

See [docs/EXAMPLES.md](../docs/EXAMPLES.md) for:
- CLI usage examples
- SDK integration code
- API usage patterns
- Platform-specific extraction
- Advanced use cases

## Creating Your Own Idiomark File

```bash
# Extract from Twitter (requires OAuth)
idiomark extract --twitter -o my-profile.idiomark

# Extract from multiple platforms
idiomark extract --twitter --github --reddit -o my-profile.idiomark

# Validate before using
idiomark validate my-profile.idiomark
```

## File Format Reference

See [docs/FORMAT.md](../docs/FORMAT.md) for complete .idiomark file specification.
