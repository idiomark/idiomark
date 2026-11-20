import chalk from 'chalk'
import inquirer from 'inquirer'
import { writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import type { IdiomarkFile } from '@idiomark/core'

export interface InitOptions {
  name?: string
  type?: 'human' | 'ai' | 'fictional'
  output?: string
}

/**
 * Generate a unique ID for the Idiomark file
 */
function generateId(name: string): string {
  const timestamp = Date.now().toString(36)
  const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20)
  return `idiomark_${sanitized}_${timestamp}`
}

/**
 * Create a minimal valid Idiomark v1.0.0 file
 */
function createMinimalIdiomark(name: string, entityType: 'human' | 'ai' | 'fictional'): IdiomarkFile {
  const now = new Date().toISOString()
  const id = generateId(name)

  // Map CLI entity types to Idiomark metadata types
  // Idiomark supports: human, brand, bot, fictional
  const idiomarkEntityType = entityType === 'ai' ? 'bot' : entityType

  return {
    idiomark: '1.0.0',
    id,
    created: now,
    updated: now,
    metadata: {
      entity: {
        name,
        type: idiomarkEntityType as 'human' | 'brand' | 'bot' | 'fictional',
        sources: []
      },
      extraction: {
        date: now,
        sample_size: 0,
        timeframe: {
          from: now,
          to: now
        }
      }
    },
    personality: {
      voice: {
        tone: {
          primary: '',
          confidence: 0
        },
        formality: 0.5,
        humor: 0.5,
        sarcasm: 0.5,
        enthusiasm: 0.5,
        directness: 0.5
      },
      patterns: {
        sentence_length: {
          mean: 0,
          stddev: 0
        },
        emoji_usage: {
          frequency: 'none',
          top_emojis: []
        },
        punctuation: {
          exclamation_frequency: 0,
          question_frequency: 0,
          ellipsis_usage: 'none'
        }
      },
      domains: [],
      values: [],
      knowledge: {
        frequent_terms: [],
        mentions: {
          people: [],
          projects: [],
          organizations: []
        },
        topics: {
          primary: [],
          secondary: []
        }
      }
    }
  }
}

/**
 * Sanitize a filename by removing invalid characters
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

export async function init(options: InitOptions = {}) {
  console.log(chalk.cyan('\n✓ Idiomark Init - Create a new Idiomark file\n'))

  try {
    // Prompt for entity name
    const nameAnswer = await inquirer.prompt<{
      name: string
    }>([
      {
        type: 'input',
        name: 'name',
        message: 'Entity name:',
        default: options.name,
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return 'Entity name is required'
          }
          if (input.trim().length < 2) {
            return 'Entity name must be at least 2 characters'
          }
          return true
        }
      }
    ])

    // Prompt for entity type
    const typeAnswer = await inquirer.prompt<{
      type: 'human' | 'ai' | 'fictional'
    }>([
      {
        type: 'list',
        name: 'type',
        message: 'Entity type:',
        choices: [
          { name: 'Human - A real person', value: 'human' },
          { name: 'AI - An artificial intelligence or bot', value: 'ai' },
          { name: 'Fictional - A fictional character', value: 'fictional' }
        ],
        default: options.type || 'human'
      }
    ])

    // Generate default filename
    const sanitizedName = sanitizeFilename(nameAnswer.name)
    const defaultFilename = `${sanitizedName}.idiomark`

    // Prompt for output filename
    const outputAnswer = await inquirer.prompt<{
      output: string
    }>([
      {
        type: 'input',
        name: 'output',
        message: 'Output filename:',
        default: options.output || defaultFilename,
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return 'Output filename is required'
          }
          if (!input.endsWith('.idiomark')) {
            return 'Filename must end with .idiomark'
          }
          return true
        }
      }
    ])

    const outputPath = resolve(process.cwd(), outputAnswer.output)

    // Check if file already exists
    if (existsSync(outputPath)) {
      const overwriteAnswer = await inquirer.prompt<{
        overwrite: boolean
      }>([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `File "${outputAnswer.output}" already exists. Overwrite?`,
          default: false
        }
      ])

      if (!overwriteAnswer.overwrite) {
        console.log(chalk.yellow('\nOperation cancelled.\n'))
        return
      }
    }

    // Create the Idiomark file
    const idiomarkFile = createMinimalIdiomark(nameAnswer.name.trim(), typeAnswer.type)

    // Write the file
    writeFileSync(outputPath, JSON.stringify(idiomarkFile, null, 2), 'utf-8')

    // Success message
    console.log(chalk.green('\n✅ Idiomark file created successfully!\n'))
    console.log(chalk.cyan('📄 File Details:'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(`  ${chalk.white('Path:')}             ${chalk.cyan(outputPath)}`)
    console.log(`  ${chalk.white('Entity Name:')}      ${chalk.cyan(nameAnswer.name)}`)
    console.log(`  ${chalk.white('Entity Type:')}      ${chalk.cyan(typeAnswer.type)}`)
    console.log(`  ${chalk.white('ID:')}               ${chalk.gray(idiomarkFile.id)}`)
    console.log(`  ${chalk.white('Version:')}          ${chalk.gray(idiomarkFile.idiomark)}`)
    console.log(chalk.gray('─'.repeat(40)))
    console.log(chalk.gray('\n💡 Next steps:'))
    console.log(chalk.gray('   • Edit the file to add personality data'))
    console.log(chalk.gray('   • Run "idiomark validate" to check the file structure'))
    console.log(chalk.gray('   • Run "idiomark info" to view file details\n'))

  } catch (error) {
    if ((error as any).name === 'ExitPromptError') {
      console.log(chalk.yellow('\n\nOperation cancelled.\n'))
      return
    }
    throw error
  }
}
