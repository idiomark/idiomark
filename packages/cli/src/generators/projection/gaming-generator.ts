/**
 * Gaming Projection Adapter Generator
 *
 * Generates a gaming adapter (Minecraft, Roblox, VR, etc.)
 * for infusing Idiomark personalities into game worlds
 */

import type { ProjectionCreateOptions } from '../../commands/projection-adapter'

export interface GeneratedFiles {
  [filePath: string]: string
}

export async function generateGamingAdapter(
  name: string,
  options: ProjectionCreateOptions
): Promise<GeneratedFiles> {
  const className = toPascalCase(name)
  const gameType = name // minecraft, roblox, vrchat, etc.

  return {
    'src/index.ts': generateIndexFile(name, className, gameType),
    'src/game-client.ts': generateGameClientFile(name, className, gameType),
    'src/chat-handler.ts': generateChatHandlerFile(name, className),
    'src/npc-handler.ts': generateNPCHandlerFile(name, className),
    'package.json': generatePackageJson(name, options),
    'tsconfig.json': generateTsConfig(),
    'tsup.config.ts': generateTsupConfig(),
    'README.md': generateReadme(name, className, gameType, options.description)
  }
}

function generateIndexFile(name: string, className: string, gameType: string): string {
  return `/**
 * ${className} Gaming Adapter
 *
 * Applies Idiomark personality to ${gameType} game interactions
 */

import { GameAdapter } from '@idiomark/projectors'
import type { GamingAdapterOptions, GameServerConfig } from '@idiomark/projectors'
import type { IdiomarkFile } from '@idiomark/core'
import { readFileSync } from 'fs'
import { ${className}GameClient } from './game-client'
import { setupChatHandlers } from './chat-handler'
import { setupNPCHandlers } from './npc-handler'

export interface ${className}GameOptions {
  personality: IdiomarkFile | string
  host: string
  port?: number
  rconPort?: number
  rconPassword?: string
}

/**
 * Create a ${className} gaming adapter
 */
export async function create${className}Adapter(options: ${className}GameOptions): Promise<${className}Adapter> {
  // Load personality
  const personality = typeof options.personality === 'string'
    ? JSON.parse(readFileSync(options.personality, 'utf-8')) as IdiomarkFile
    : options.personality

  // Configure game connection
  const serverConfig: GameServerConfig = {
    host: options.host,
    port: options.port,
    rconPort: options.rconPort,
    rconPassword: options.rconPassword
  }

  // Create adapter instance
  const adapter = new ${className}Adapter({
    name: '${name}',
    game: '${gameType}',
    serverConfig,
    personality
  })

  // Setup chat handlers
  setupChatHandlers(adapter, personality)

  // Setup NPC handlers
  setupNPCHandlers(adapter, personality)

  return adapter
}

/**
 * ${className} Adapter Implementation
 */
class ${className}Adapter extends GameAdapter {
  private gameClient: ${className}GameClient

  constructor(options: GamingAdapterOptions) {
    super(options)
    this.gameClient = new ${className}GameClient(options.serverConfig)
  }

  async connect(): Promise<void> {
    await this.gameClient.connect()
    console.log(\`Connected to ${this.gameClient.getServerInfo()}\`)
    this.emitter.emit('connected')
  }

  async disconnect(): Promise<void> {
    await this.gameClient.disconnect()
    this.emitter.emit('disconnected')
  }

  async sendToGame(message: string): Promise<void> {
    await this.gameClient.sendChatMessage(message)
  }

  /**
   * Start listening for game events
   */
  async startListening(): Promise<void> {
    this.gameClient.on('playerChat', async (data) => {
      const response = await this.applyPersonalityToChat(data.message)
      await this.sendToGame(response)
    })

    this.gameClient.on('playerJoin', async (player) => {
      const greeting = await this.generateGreeting(player.name)
      await this.sendToGame(greeting)
    })

    this.gameClient.on('npcInteract', async (data) => {
      const response = await this.applyPersonalityToNPC(data.npcType, data.playerInput)
      await this.sendToGame(response)
    })
  }

  /**
   * Generate player greeting based on personality
   */
  private async generateGreeting(playerName: string): Promise<string> {
    const voice = this.personality?.personality?.voice
    const formality = voice?.formality || 0.5

    if (formality > 0.6) {
      return \`Welcome, \${playerName}. Good to see you.\`
    } else if (voice?.tone?.primary === 'enthusiastic') {
      return \`Hey \${playerName}!! Awesome to see you!\`
    } else if (voice?.tone?.primary === 'humorous') {
      return \`Look who it is! \${playerName} has graced us with their presence!\`
    }
    return \`Welcome \${playerName}!\`
  }
}

/**
 * Start the gaming adapter
 */
export async function start${className}Adapter(options: ${className}GameOptions): Promise<void> {
  const adapter = await create${className}Adapter(options)

  console.log(\`Starting ${className} gaming adapter...\`)

  await adapter.connect()
  await adapter.startListening()

  console.log('Adapter running. Press Ctrl+C to stop.')

  return new Promise(() => {
    // Keep running
  })
}

// CLI entry point
if (require.main === module) {
  const personalityPath = process.argv[2] || 'personality.idiomark'
  const personality = JSON.parse(require('fs').readFileSync(personalityPath, 'utf-8'))

  const serverConfig: GameServerConfig = {
    host: process.env.GAME_HOST || 'localhost',
    port: parseInt(process.env.GAME_PORT || '25565'),
    rconPort: parseInt(process.env.RCON_PORT || '25575'),
    rconPassword: process.env.RCON_PASSWORD
  }

  const adapterOptions: GamingAdapterOptions = {
    name: '${name}',
    game: '${name}',
    serverConfig,
    personality
  }

  const adapter = new ${className}Adapter(adapterOptions)
  await adapter.connect()

  console.log('Adapter running. Press Ctrl+C to stop.')

  return new Promise(() => {})
}
`
}

function generateGameClientFile(name: string, className: string, gameType: string): string {
  const gameLower = gameType.toLowerCase()

  return `/**
 * ${className} Game Client
 *
 * Handles connection and communication with ${gameType} servers
 */

import type { GameServerConfig } from '@idiomark/projectors'
import { EventEmitter } from 'events'

export interface ServerInfo {
  host: string
  port?: number
  version?: string
  players?: number
}

export interface ChatMessage {
  playerId: string
  playerName: string
  message: string
  timestamp: number
}

export interface PlayerJoin {
  playerId: string
  playerName: string
}

export interface NPCInteraction {
  npcId: string
  npcType: string
  playerId: string
  playerInput: string
}

/**
 * Game client for ${gameType}
 */
export class ${className}GameClient extends EventEmitter {
  private config: GameServerConfig
  private connected = false
  private reconnectTimer?: NodeJS.Timeout

  constructor(config: GameServerConfig) {
    super()
    this.config = config
  }

  /**
   * Connect to game server
   */
  async connect(): Promise<void> {
    // Implement game-specific connection logic here
    // This is a template - actual implementation depends on the game

    /*
    if ('${gameLower}' === 'minecraft') {
      await this.connectMinecraftRCON()
    } else if ('${gameLower}' === 'roblox') {
      await this.connectRobloxAPI()
    }
    */

    this.connected = true
    this.emit('connected')
    console.log(\`Connected to \${this.config.host}\`)
  }

  /**
   * Disconnect from game server
   */
  async disconnect(): Promise<void> {
    this.connected = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    this.emit('disconnected')
  }

  /**
   * Send chat message to game
   */
  async sendChatMessage(message: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to game server')
    }

    // Implement game-specific chat sending
    console.log(\`Sending to game: \${message}\`)

    /*
    if ('${gameLower}' === 'minecraft') {
      await this.sendMinecraftCommand('say', [message])
    }
    */
  }

  /**
   * Execute game command
   */
  async executeCommand(command: string, args: string[] = []): Promise<void> {
    const fullCommand = \`/\${command} \${args.join(' ')}\`
    await this.sendChatMessage(fullCommand)
  }

  /**
   * Get server info
   */
  getServerInfo(): ServerInfo {
    return {
      host: this.config.host,
      port: this.config.port,
      version: '1.0.0'
    }
  }

  /**
   * Setup automatic reconnection
   */
  private setupReconnect(): void {
    this.reconnectTimer = setInterval(async () => {
      if (!this.connected) {
        console.log('Attempting to reconnect...')
        try {
          await this.connect()
        } catch (error) {
          console.error('Reconnection failed:', error)
        }
      }
    }, 30000) // Try every 30 seconds
  }
}
`
}

function generateChatHandlerFile(name: string, className: string): string {
  return `/**
 * Chat Handlers for ${className}
 *
 * Apply personality to in-game chat messages
 */

import type { GameAdapter } from '@idiomark/projectors'
import type { IdiomarkFile } from '@idiomark/core'

/**
 * Setup chat message handlers
 */
export function setupChatHandlers(adapter: GameAdapter, personality: IdiomarkFile): void {
  const { voice, values, knowledge } = personality.personality || {}

  // Define personality-based chat patterns
  const chatPatterns = {
    // Greeting responses
    greeting: [
      voice?.tone?.primary === 'formal'
        ? 'Greetings, traveler.'
        : voice?.tone?.primary === 'enthusiastic'
        ? 'Hey there! Great to see you!'
        : 'Hi! Welcome!',
      voice?.humor && voice.humor > 0.5
        ? 'Well, well, well! Look who decided to show up!'
        : null
    ].filter(Boolean),

    // Farewell responses
    farewell: [
      voice?.tone?.primary === 'formal'
        ? 'Safe travels, friend.'
        : 'See you next time!',
      voice?.humor && voice.humor > 0.5
        ? 'Don\'t be a stranger! Or do, I\'m not the boss of you.'
        : null
    ].filter(Boolean),

    // Help responses
    help: [
      voice?.tone?.primary === 'helpful'
        ? 'Of course! Let me help you with that.'
        : 'Sure, what do you need?',
      voice?.enthusiasm && voice.enthusiasm > 0.7
        ? 'Ooh, I\'d love to help! What\'s up?'
        : null
    ].filter(Boolean)
  }

  // Register handlers with the adapter
  adapter.on('chatMessage', async (message: string, context: any) => {
    const response = await generateChatResponse(message, personality, chatPatterns)
    return response
  })
}

/**
 * Generate personality-infused chat response
 */
async function generateChatResponse(
  message: string,
  personality: IdiomarkFile,
  patterns: Record<string, string[]>
): Promise<string> {
  const lowerMessage = message.toLowerCase()

  // Detect message type
  const isGreeting = /^(hi|hello|hey|greetings|howdy)/i.test(message)
  const isFarewell = /(bye|goodbye|see you|later|cya)/i.test(message)
  const isHelp = /(help|assist|support|can you)/i.test(message)

  let baseResponse = ''

  if (isGreeting && patterns.greeting.length > 0) {
    baseResponse = patterns.greeting[Math.floor(Math.random() * patterns.greeting.length)]
  } else if (isFarewell && patterns.farewell.length > 0) {
    baseResponse = patterns.farewell[Math.floor(Math.random() * patterns.farewell.length)]
  } else if (isHelp && patterns.help.length > 0) {
    baseResponse = patterns.help[Math.floor(Math.random() * patterns.help.length)]
  } else {
    // Generate contextual response based on personality
    baseResponse = generateContextualResponse(message, personality)
  }

  // Add emoji if personality uses them
  const emojiUsage = personality.personality?.voice?.emoji_usage?.frequency || 0
  if (emojiUsage > 0.3 && Math.random() < emojiUsage) {
    baseResponse += \` \${getRandomEmoji(personality)}\`
  }

  return baseResponse
}

/**
 * Generate contextual response based on personality
 */
function generateContextualResponse(message: string, personality: IdiomarkFile): string {
  const voice = personality.personality?.voice
  const tone = voice?.tone?.primary || 'neutral'

  const responses: Record<string, string[]> = {
    casual: [
      'Gotcha!',
      'Nice!',
      'Interesting...',
      'Oh, I see what you mean.',
      'Alright then!'
    ],
    formal: [
      'I understand.',
      'Certainly.',
      'I see.',
      'Very well.',
      'Understood.'
    ],
    enthusiastic: [
      'Awesome!',
      'That\'s amazing!',
      'Love it!',
      'Oh wow!',
      'Fantastic!'
    ],
    humorous: [
      'Ha, good one!',
      'Well isn\'t that interesting?',
      'You\'re funny, I\'ll give you that.',
      'Classic.',
      'I see what you did there!'
    ],
    neutral: [
      'Okay.',
      'I see.',
      'Alright.',
      'Got it.',
      'Understood.'
    ]
  }

  const toneResponses = responses[tone] || responses.neutral
  return toneResponses[Math.floor(Math.random() * toneResponses.length)]
}

/**
 * Get random emoji from personality
 */
function getRandomEmoji(personality: IdiomarkFile): string {
  const emojis = personality.personality?.knowledge?.frequent_terms?.filter(
    (term: string) => /^[\u{1F300}-\u{1F9FF}]$/u.test(term)
  ) || []

  if (emojis.length === 0) {
    const defaultEmojis = ['😊', '👍', '✨', '🎮']
    return defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)]
  }

  return emojis[Math.floor(Math.random() * emojis.length)]
}
`
}

function generateNPCHandlerFile(name: string, className: string): string {
  return `/**
 * NPC Handlers for ${className}
 *
 * Apply personality to NPC dialogue and interactions
 */

import type { GameAdapter } from '@idiomark/projectors'
import type { IdiomarkFile } from '@idiomark/core'

export interface NPCDialogue {
  npcType: string
  dialogue: string
  personality: 'friendly' | 'hostile' | 'neutral' | 'quest_giver' | 'merchant'
}

/**
 * Setup NPC interaction handlers
 */
export function setupNPCHandlers(adapter: GameAdapter, personality: IdiomarkFile): void {
  const { voice, values } = personality.personality || {}

  // Define personality-based NPC dialogue
  const dialogueTemplates = {
    quest_giver: {
      formal: 'Greetings, adventurer. I have a task requiring your attention.',
      casual: 'Hey! Got a quest for you if you\'re interested.',
      humorous: 'Well look at this! Another hero looking for trouble. I\'ve got just the quest!',
      enthusiastic: 'Exciting news, traveler! An adventure awaits!'
    },
    merchant: {
      formal: 'Welcome to my establishment. How may I be of service?',
      casual: 'Hey! See anything you like?',
      humorous: 'Step right up! Don\'t mind the prices, they\'re just suggestions... mostly.',
      enthusiastic: 'Welcome, welcome! You\'re going to LOVE what I have!'
    },
    friendly: {
      formal: 'Good day to you.',
      casual: 'Hi there! Nice day, isn\'t it?',
      humorous: 'Hey! You look like you\'ve seen some things. Want to share?',
      enthusiastic: 'Hello! It\'s always great to meet new people!'
    },
    hostile: {
      formal: 'You should not have come here.',
      casual: 'You\'re in the wrong place, friend.',
      humorous: 'Oh wonderful, another visitor. Just what I needed.',
      enthusiastic: 'Finally, some entertainment! Prepare yourself!'
    }
  }

  // Register handlers
  adapter.on('npcInteract', async (interaction: NPCDialogue) => {
    return await generateNPCDialogue(interaction, personality, dialogueTemplates)
  })
}

/**
 * Generate NPC dialogue based on personality
 */
async function generateNPCDialogue(
  interaction: NPCDialogue,
  personality: IdiomarkFile,
  templates: Record<string, Record<string, string>>
): Promise<string> {
  const voice = personality.personality?.voice
  const tone = voice?.tone?.primary || 'neutral'

  const npcTemplates = templates[interaction.personality] || templates.friendly
  let dialogue = npcTemplates[tone] || npcTemplates.casual

  // Add value-based flavor
  const values = personality.personality?.values || []
  for (const value of values) {
    if (value.name === 'helpfulness' && Math.random() > 0.5) {
      dialogue += ' Is there anything else I can help with?'
    }
    if (value.name === 'humor' && Math.random() > 0.7) {
      dialogue += ' *wink*'
    }
    if (value.name === 'enthusiasm' && Math.random() > 0.6) {
      dialogue += '!'
    }
  }

  return dialogue
}
`
}

function generatePackageJson(name: string, options: ProjectionCreateOptions): string {
  return JSON.stringify({
    name: `@idiomark/projection-adapter-${name}`,
    version: '1.0.0',
    description: options.description || `${name} gaming projection adapter for Idiomark Protocol`,
    type: 'module',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    exports: {
      '.': {
        import: './dist/index.js',
        types: './dist/index.d.ts'
      }
    },
    scripts: {
      dev: 'tsup --watch',
      build: 'tsup',
      start: 'node dist/index.js',
      test: 'vitest',
      lint: 'eslint src/',
      clean: 'rm -rf dist'
    },
    dependencies: {
      '@idiomark/core': 'workspace:*',
      '@idiomark/projectors': 'workspace:*',
      '@idiomark/inference': 'workspace:*'
    },
    devDependencies: {
      '@types/node': '^22.13.5',
      tsup: '^8.4.0',
      typescript: '^5.7.3',
      vitest: '^3.0.7'
    },
    idiomark: {
      type: 'gaming',
      game: name,
      status: 'experimental'
    },
    engines: {
      node: '>=18.0.0'
    }
  }, null, 2)
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      lib: ['ES2022'],
      moduleResolution: 'bundler',
      esModuleInterop: true,
      resolveJsonModule: true,
      strict: true,
      skipLibCheck: true,
      declaration: true,
      declarationMap: true,
      outDir: './dist',
      rootDir: './src'
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist']
  }, null, 2)
}

function generateTsupConfig(): string {
  return `import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  target: 'es2022'
})
`
}

function generateReadme(name: string, className: string, gameType: string, description?: string): string {
  return `# @idiomark/projection-adapter-${name}

${description || `${name} gaming projection adapter for Idiomark Protocol`}

## Overview

This adapter applies a Idiomark personality to ${gameType} game interactions, enabling personality-infused NPCs, chat responses, and ambient dialogues.

## Features

- **Player chat responses**: Personality-driven replies to player messages
- **NPC dialogue systems**: Quest givers, merchants, friendly NPCs, hostiles
- **Player join/leave events**: Greetings and farewells
- **Emotion and emoji support**: Based on personality settings
- **Value-based interactions**: Responses aligned with personality values

## Installation

\`\`\`bash
npm install
npm run build
\`\`\`

## Usage

### Environment Variables

\`\`\`bash
export GAME_HOST=localhost
export GAME_PORT=25565
export RCON_PORT=25575
export RCON_PASSWORD=your_password
\`\`\`

### Start Adapter

\`\`\`bash
npm start -- ./path/to/personality.idiomark
\`\`\`

## Configuration

### Personality Integration

The adapter maps Idiomark personality attributes to game interactions:

- **Voice tone** → NPC dialogue style (formal, casual, humorous, enthusiastic)
- **Values** → NPC behaviors and response patterns
- **Emoji usage** → Chat emoji frequency
- **Formality** → Greeting and farewell styles
- **Humor level** → Jokes and witty responses

### NPC Types

- **quest_giver**: NPCs that offer missions/quests
- **merchant**: Shop and trading NPCs
- **friendly**: Ambient villagers and friendly characters
- **hostile**: Enemy NPCs with personality
- **neutral**: Background characters

## Architecture

\`\`\`
src/
├── index.ts         # Main adapter entry point
├── game-client.ts   # Game server connection client
├── chat-handler.ts  # Player chat message handlers
└── npc-handler.ts   # NPC dialogue systems
\`\`\`

## Development

\`\`\`bash
npm run dev    # Watch mode
npm run build  # Production build
npm run test   # Run tests
\`\`\`

## Game-Specific Notes

For ${gameType}:

1. **Connection**: Uses RCON/remote console protocol
2. **Chat**: Sends messages via say/tell commands
3. **Events**: Listens for player joins, chat, NPC interactions
4. **Commands**: Executes server commands with personality

## License

MIT
`
}

// Helper functions

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}
