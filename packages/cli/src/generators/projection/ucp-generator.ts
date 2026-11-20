/**
 * UCP Projection Adapter Generator
 *
 * Generates a UCP (Universal Commerce Protocol) adapter
 * for infusing Idiomark personalities into e-commerce experiences
 */

import type { ProjectionCreateOptions } from '../../commands/projection-adapter'

export interface GeneratedFiles {
  [filePath: string]: string
}

export async function generateUCPAdapter(
  name: string,
  options: ProjectionCreateOptions
): Promise<GeneratedFiles> {
  const className = toPascalCase(name)

  return {
    'src/index.ts': generateIndexFile(name, className),
    'src/ucp-profile.ts': generateProfileFile(name, className),
    'src/recommendations.ts': generateRecommendationsFile(name, className),
    'src/responses.ts': generateResponsesFile(name, className),
    'package.json': generatePackageJson(name, options),
    'tsconfig.json': generateTsConfig(),
    'tsup.config.ts': generateTsupConfig(),
    'README.md': generateReadme(name, className, options.description)
  }
}

function generateIndexFile(name: string, className: string): string {
  return `/**
 * ${className} UCP Adapter
 *
 * Applies Idiomark personality to Universal Commerce Protocol interactions
 */

import { UCPAdapter } from '@idiomark/projectors'
import type { UCPAdapterOptions } from '@idiomark/projectors'
import type { IdiomarkFile } from '@idiomark/core'
import { generateUCPProfile } from './ucp-profile'
import { getPersonalityRecommendations } from './recommendations'
import { getPersonalityResponseConfig } from './responses'

export interface ${className}UCPOptions extends UCPAdapterOptions {
  personality: IdiomarkFile | string
  merchantId?: string
  businessName?: string
}

/**
 * Create a ${className} UCP adapter instance
 */
export async function create${className}UCPAdapter(options: ${className}UCPOptions): Promise<UCPAdapter> {
  // Load personality
  const personality = typeof options.personality === 'string'
    ? JSON.parse(await (await import('fs/promises')).readFile(options.personality, 'utf-8')) as IdiomarkFile
    : options.personality

  // Generate UCP profile from personality
  const ucpProfile = generateUCPProfile(personality, {
    merchantId: options.merchantId || '${name}-merchant',
    businessName: options.businessName || '${name} Store'
  })

  // Create adapter with personality-infused config
  const adapter = new UCPAdapter({
    ...options,
    profile: ucpProfile,
    personality
  })

  // Apply personality to response generation
  const responseConfig = getPersonalityResponseConfig(personality)
  adapter.configureResponses(responseConfig)

  // Apply personality to product recommendations
  const recommendationStrategy = getPersonalityRecommendations(personality)
  adapter.configureRecommendations(recommendationStrategy)

  return adapter
}

/**
 * Start UCP server with personality
 */
export async function start${className}UCPServer(options: ${className}UCPOptions): Promise<void> {
  const adapter = await create${className}UCPAdapter(options)

  console.error(\`Starting ${className} UCP server...\`)

  await adapter.serve({
    port: options.port || 8080
  })

  console.error('UCP server running')
}

// CLI entry point
if (require.main === module) {
  const personalityPath = process.argv[2] || 'personality.idiomark'
  start${className}UCPServer({
    personality: personalityPath
  }).catch(console.error)
}
`
}

function generateProfileFile(name: string, className: string): string {
  return `/**
 * UCP Profile Generator for ${className}
 *
 * Converts Idiomark personality to UCP merchant profile
 */

import type { UCPProfile } from '@idiomark/projectors'
import type { IdiomarkFile } from '@idiomark/core'

export interface ProfileOptions {
  merchantId: string
  businessName: string
}

/**
 * Generate UCP profile from Idiomark personality
 */
export function generateUCPProfile(
  personality: IdiomarkFile,
  options: ProfileOptions
): UCPProfile {
  const { personality: pers } = personality
  const { voice, values, domains, knowledge } = pers || {}

  // Map Idiomark voice to UCP interaction style
  const interactionStyle = {
    tone: voice?.tone?.primary || 'neutral',
    formality: voice?.formality || 0.5,
    directness: voice?.directness || 0.5,
    humor: voice?.humor || 0,
    enthusiasm: voice?.enthusiasm || 0.5
  }

  // Map Idiomark values to recommendation strategy
  const recommendationStrategy = {
    values_alignment: values?.map(v => v.name) || [],
    domain_preferences: domains?.map(d => d.name) || [],
    voice_matching: voice?.tone?.primary === 'conversational'
  }

  // Enable personality-infused responses
  const personalityResponses = {
    enabled: true,
    system_prompt: generateSystemPrompt(personality)
  }

  // Standard UCP capabilities
  const capabilities = {
    product_search: true,
    checkout: true,
    payment_tokenization: true,
    inventory_check: true
  }

  return {
    merchant_id: options.merchantId,
    business_name: options.businessName,
    capabilities,
    interaction_style: interactionStyle,
    product_recommendation_strategy: recommendationStrategy,
    personality_infused_responses: personalityResponses
  }
}

/**
 * Generate system prompt for UCP interactions
 */
function generateSystemPrompt(personality: IdiomarkFile): string {
  const { voice, values } = personality.personality || {}

  const parts = [
    \`You are a helpful shopping assistant for a merchant with a \${voice?.tone?.primary || 'neutral'} tone.\`,
    values && values.length > 0
      ? \`Core values to embody: \${values.map(v => v.name).join(', ')}.\`
      : '',
    \`Be helpful but not pushy. Focus on finding the right products for the customer.\`
  ].filter(Boolean)

  return parts.join(' ')
}
`
}

function generateRecommendationsFile(name: string, className: string): string {
  return `/**
 * Personality-Based Product Recommendations for ${className}
 *
 * Infuses personality into product recommendation logic
 */

import type { IdiomarkFile } from '@idiomark/core'

export interface RecommendationStrategy {
  values_alignment: string[]
  domain_preferences: string[]
  voice_matching: boolean
  custom_filter?: (product: any, userContext: any) => number
}

/**
 * Get personality-driven recommendation strategy
 */
export function getPersonalityRecommendations(personality: IdiomarkFile): RecommendationStrategy {
  const { values, domains, knowledge } = personality.personality || {}

  return {
    values_alignment: values?.map(v => v.name) || [],
    domain_preferences: domains?.map(d => d.name) || [],
    voice_matching: true,

    // Custom scoring based on personality
    custom_filter: (product, userContext) => {
      let score = 1.0

      // Apply value-based filtering
      if (values) {
        for (const value of values) {
          if (value.name === 'sustainability' && product.eco_friendly) {
            score *= 1.2
          }
          if (value.name === 'quality' && product.premium) {
            score *= 1.15
          }
        }
      }

      // Apply domain expertise
      if (domains && domains.length > 0) {
        const domainNames = domains.map(d => d.name.toLowerCase())
        if (domainNames.some(d => product.category?.toLowerCase().includes(d))) {
          score *= 1.1
        }
      }

      return score
    }
  }
}
`
}

function generateResponsesFile(name: string, className: string): string {
  return `/**
 * Personality-Infused Response Configuration for ${className}
 *
 * Configures how personality affects customer interactions
 */

import type { IdiomarkFile } from '@idiomark/core'

export interface ResponseConfig {
  greeting: string
  farewell: string
  unknown_product: string
  out_of_stock: string
  promotion_style: 'subtle' | 'moderate' | 'enthusiastic'
  emoji_enabled: boolean
}

/**
 * Get response configuration based on personality
 */
export function getPersonalityResponseConfig(personality: IdiomarkFile): ResponseConfig {
  const { voice } = personality.personality || {}
  const tone = voice?.tone?.primary || 'neutral'
  const formality = voice?.formality || 0.5
  const enthusiasm = voice?.enthusiasm || 0.5
  const emojiUsage = voice?.emoji_usage?.frequency || 0

  // Build greeting based on formality
  const formalGreetings = [
    'Welcome to our store. How may I assist you today?',
    'Good day. What can I help you find?'
  ]
  const casualGreetings = [
    'Hey! Welcome in! What can I help you find?',
    'Hi there! Looking for anything special?'
  ]

  const greeting = formality > 0.6
    ? formalGreetings[Math.floor(Math.random() * formalGreetings.length)]
    : casualGreetings[Math.floor(Math.random() * casualGreetings.length)]

  // Determine promotion style
  const promotionStyle = enthusiasm > 0.7 ? 'enthusiastic'
    : enthusiasm > 0.4 ? 'moderate'
    : 'subtle'

  return {
    greeting,
    farewell: formality > 0.6
      ? 'Thank you for your business. Have a wonderful day.'
      : 'Thanks for stopping by! See you next time!',
    unknown_product: tone === 'humorous'
      ? 'Hmm, that one seems to be playing hide and seek. Let me suggest something similar...'
      : "I don't see that item, but let me show you something similar you might like.",
    out_of_stock: 'That item is temporarily unavailable. Would you like me to notify you when it\'s back?',
    promotion_style: promotionStyle,
    emoji_enabled: emojiUsage > 0.3
  }
}
`
}

function generatePackageJson(name: string, options: ProjectionCreateOptions): string {
  return JSON.stringify({
    name: `@idiomark/projection-adapter-${name}`,
    version: '1.0.0',
    description: options.description || `${name} UCP projection adapter for Idiomark Protocol`,
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
      type: 'ucp',
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

function generateReadme(name: string, className: string, description?: string): string {
  return `# @idiomark/projection-adapter-${name}

${description || `${name} UCP projection adapter for Idiomark Protocol`}

## Overview

This adapter applies a Idiomark personality to Universal Commerce Protocol (UCP) interactions, creating personality-infused shopping experiences.

## Features

- **Personality-driven interaction style**: Tone, formality, and enthusiasm mapped from Idiomark
- **Value-based product recommendations**: Products aligned with personality values
- **Custom response templates**: Greetings, farewells, and error messages infused with personality
- **Domain expertise filtering**: Recommendations weighted by personality domains

## Installation

\`\`\`bash
npm install
npm run build
\`\`\`

## Usage

\`\`\`typescript
import { create${className}UCPAdapter } from '@idiomark/projection-adapter-${name}'
import { readFileSync } from 'fs'

// Load personality
const personality = JSON.parse(readFileSync('./personality.idiomark', 'utf-8'))

// Create adapter
const adapter = await create${className}UCPAdapter({
  personality,
  merchantId: 'my-merchant-id',
  businessName: 'My Store'
})

// Start UCP server
await adapter.serve({ port: 8080 })
\`\`\`

## Configuration

The adapter maps Idiomark personality attributes to UCP concepts:

- **Voice** → Interaction style (tone, formality, directness)
- **Values** → Product recommendation alignment
- **Domains** → Category expertise and filtering
- **Emoji usage** → Response emoji inclusion

## UCP Endpoints

Once running, the adapter provides standard UCP endpoints:

- \`POST /ucp/search\` - Product search with personality
- \`POST /ucp/checkout\` - Checkout flow with personality-infused confirmations
- \`POST /ucp/inventory\` - Inventory checks with friendly messaging
- \`GET /ucp/profile\` - Merchant profile with personality metadata

## Development

\`\`\`bash
npm run dev    # Watch mode
npm run build  # Production build
npm run test   # Run tests
\`\`\`

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
