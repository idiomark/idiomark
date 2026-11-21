# Security Policy

## Reporting

Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/idiomark/idiomark/security/advisories/new) — do not open a public issue.

Idiomark files can contain detailed personality data. Treat untrusted `.idiomark` files like untrusted configuration: validate before loading, never execute code from a file's content.

## Scope

- `packages/core` — loader, validator, crypto (key providers, ratchet)
- `packages/mcp` — server exposed to agents
- `packages/inference` — prompt construction from profile data
