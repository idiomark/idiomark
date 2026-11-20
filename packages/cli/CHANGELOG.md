# @idiomark/cli Changelog

## [1.0.0-alpha.0] - 2026-02-15

### Added

#### New Commands
- **`idiomark init`** - Interactive Idiomark file creation with prompts for entity name, type, and output filename
- **`idiomark config`** - Configuration management with subcommands:
  - `--list` - List all config values
  - `--get <key>` - Get specific value
  - `--set <key> <value>` - Set a value
  - `--delete <key>` - Delete a value
  - `--reset` - Reset to defaults
  - `--path` - Show config file location

#### Configuration System
- Config file at `~/.idiomarkrc` (JSON format)
- Support for `Idiomark_CONFIG_PATH` environment variable
- API key management for Anthropic and OpenAI
- Default provider/model settings
- Automatic config file creation with defaults

#### Adapter Management
- Fixed adapter path resolution - works from any directory
- `idiomark adapter list` now shows all 59 platform adapters
- `idiomark adapter info <name>` shows adapter details
- `idiomark adapter create` for creating new adapters
- `idiomark adapter validate` for validating adapters
- `idiomark adapter test` for testing adapters

### Fixed
- Type declaration syntax errors in `@idiomark/core`:
  - `types-dev.ts` - Added missing interface wrapper
  - `optimizer-idiomarkd.ts` - Fixed object literal syntax
  - `security-idiomarkd.ts` - Fixed type annotations
  - `migration-idiomarkd.test.ts` - Added missing comma
- Template literal syntax in `prompts-dev.ts`
- Validate command syntax error with template literals

### Commands Summary (14 total)

| Command | Description | Status |
|---------|-------------|--------|
| `idiomark --version` | Show version | ✅ |
| `idiomark extract` | Extract personality from platforms | ✅ |
| `idiomark init` | Create new Idiomark file | ✅ NEW |
| `idiomark extract:developer` | Extract IdiomarkD profile | ✅ |
| `idiomark validate` | Validate Idiomark file | ✅ |
| `idiomark serve` | Start inference server | ✅ |
| `idiomark info` | Display file info | ✅ |
| `idiomark chat` | Interactive chat | ✅ |
| `idiomark respond` | Single response | ✅ |
| `idiomark apply` | Apply to MCP/UCP/HTTP | ✅ |
| `idiomark config` | Manage configuration | ✅ NEW |
| `idiomark adapter` | Adapter management | ✅ FIXED |
| `idiomark adapter list` | List 59 adapters | ✅ FIXED |
| `idiomark projection-adapter` | Projection adapters | ✅ |

### Build Status
- ESM Build: ✅ SUCCESS (288 KB)
- DTS Build: ⚠️ Minor TypeScript errors (non-blocking)

### Platform Adapters (59 available)
askfm, behance, bitbucket, bluesky, codeberg, codewars, devto, discord, discourse, epic-games, facebook, fitbit, flickr, fortnite, github, gitlab, gmail, goodreads, hackernews, instagram, leetcode, letterboxd, linkedin, mastodon, medium, minecraft, notion, oura, outlook, phpbb, pinterest, quora, reddit, roblox, signal, slack, snapchat, soundcloud, spotify, stackexchange, steam, strava, substack, telegram, threads, tiktok, tripadvisor, tumblr, twitch, twitter, vimeo, vrchat, whatsapp, whoop, wordpress, xbox, xenforo, yelp, youtube

### Configuration File Structure
```json
{
  "apiKey": {
    "anthropic": "sk-ant-...",
    "openai": "sk-..."
  },
  "defaults": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-latest",
    "output": "personality.idiomark"
  }
}
```

### Known Issues
- Type declaration generation has minor TypeScript errors
- `extract` command requires OAuth tokens for real extraction
- `chat`/`respond` require API keys (can be set via config or env)

### Next Steps (Future)
- [ ] Publish to npm as `@idiomark/cli@1.0.0-alpha.0`
- [ ] Add shell completion (bash/zsh/fish)
- [ ] Add `idiomark compare` command
- [ ] Add `idiomark merge` command
- [ ] Mock mode for `extract` without OAuth
- [ ] Fix remaining DTS build errors

---

## Development Notes

### 2026-02-15 Session
- Fixed CLI build (syntax errors in validate.ts, prompts-dev.ts)
- Added `idiomark init` command via agent
- Added `idiomark config` command via agent
- Fixed adapter path resolution via agent
- Fixed type declaration syntax errors via agent
- Total: 4 parallel agents deployed
- Build size: 271KB → 288KB (+17KB with new features)
