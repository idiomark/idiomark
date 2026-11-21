# Contributing

Thanks for looking at Idiomark. The format is pre-1.0 — schema feedback is the highest-value contribution right now.

## Setup

```bash
pnpm install
pnpm build
pnpm test   # must be green before any PR
```

## Ground rules

- One PR, one concern. CI must pass (build + test + secret scan).
- Spec changes (`spec/v1`, `spec/v2`) require an issue first describing the compatibility impact.
- v1 is the stable surface: breaking v1 changes are rejected. Propose breaking ideas in v2.
- No new runtime dependencies without discussion — the core package is deliberately lean.

## Reporting bugs

Open an issue with: what you loaded, the validator's output, expected vs actual.
