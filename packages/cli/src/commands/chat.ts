/**
 * Idiomark Chat Command
 *
 * Interactive chat with a personality from a Idiomark file
 */

import chalk from 'chalk'
import ora from 'ora'
import readline from 'readline'
import { IdiomarkReader, loadIdiomarkFile } from '@idiomark/core'
import type { ChatOptions } from '../types'
import { getApiKey, getDefault } from '../config'

export async function chat(options: ChatOptions) {
  const { file, provider, model, verbose, stream } = options

  console.log(chalk.cyan('\n🎭 Idiomark Chat\n'))

  const spinner = ora('Loading personality...').start()

  try {
    // Load Idiomark file
    const loadResult = await loadIdiomarkFile(file, {
      validate: true,
      throwOnNotFound: true
    })

    if (!loadResult) {
      // Defensive: the loader only returns null when throwOnNotFound is false,
      // but its declared return type is LoadResult | null.
      spinner.fail(chalk.red('Failed to load Idiomark file'))
      console.error(chalk.red(`Idiomark file not found: ${file}`))
      console.log(chalk.gray(`\n💡 Idiomark file not found at: ${chalk.bold(file)}`))
      console.log(chalk.gray(`   Create one with: ${chalk.bold('idiomark extract --twitter -o ' + file)}\n`))
      return
    }

    spinner.succeed(chalk.green(`Loaded personality: ${chalk.bold(loadResult.file.metadata.entity?.name || loadResult.file.id)}\n`))

    // Determine provider and model from config or options
    const effectiveProvider = provider || getDefault('provider') || 'anthropic'
    const effectiveModel = model || getDefault('model') || undefined

    // Get API key from config or environment
    const apiKey = getApiKey(effectiveProvider)

    if (!apiKey) {
      spinner.fail(chalk.red(`No API key found for provider: ${effectiveProvider}`))
      console.log(chalk.gray('\nSet an API key with:'))
      console.log(chalk.gray(`  idiomark config --set apiKey.${effectiveProvider} <your-key>`))
      console.log(chalk.gray('\nOr set environment variable:'))
      console.log(chalk.gray(`  ${effectiveProvider.toUpperCase()}_API_KEY=<your-key>`))
      process.exit(1)
    }

    // Create reader
    const reader = await IdiomarkReader.fromFile(file, {
      provider: effectiveProvider,
      model: effectiveModel,
      stream: stream !== false,
      apiKey
    })

    // Display personality summary
    const summary = reader.getPersonalitySummary()
    console.log(chalk.cyan('📊 Personality Profile:'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(`  ${chalk.white('Tone:')}           ${summary.tone.primary}${summary.tone.secondary ? ` / ${summary.tone.secondary}` : ''} (${Math.round(summary.tone.confidence * 100)}%)`)
    console.log(`  ${chalk.white('Attributes:')}`)
    console.log(`    Formality:   ${chalk.gray(summary.attributes.formality.toFixed(2))}`)
    console.log(`    Humor:       ${chalk.gray(summary.attributes.humor.toFixed(2))}`)
    console.log(`    Enthusiasm:  ${chalk.gray(summary.attributes.enthusiasm.toFixed(2))}`)
    console.log(`    Directness:  ${chalk.gray(summary.attributes.directness.toFixed(2))}`)
    console.log(`  ${chalk.white('Domains:')}        ${summary.domains.map(d => d.name).join(', ')}`)
    console.log(`  ${chalk.white('Topics:')}         ${summary.topics.primary.join(', ')}`)
    console.log(chalk.gray('─'.repeat(40)))
    console.log(chalk.gray(`\n💡 Type ${chalk.bold('"exit"')} to quit, ${chalk.bold('"clear"')} to reset history\n`))

    // Set up readline interface
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    // Chat loop
    const chatLoop = async () => {
      rl.question(chalk.cyan('You: '), async (input) => {
        const message = input.trim()

        if (message === 'exit' || message === 'quit') {
          console.log(chalk.gray('\n👋 Goodbye!\n'))
          rl.close()
          return
        }

        if (message === 'clear') {
          reader.clearHistory()
          console.log(chalk.gray('✂️  Conversation history cleared\n'))
          chatLoop()
          return
        }

        if (message === '') {
          chatLoop()
          return
        }

        // Generate response
        const responseSpinner = ora('Thinking...').start()

        try {
          const response = await reader.respond(message)

          responseSpinner.stop()

          // Display AI response
          const name = loadResult.file.metadata.entity?.name || 'AI'
          console.log(chalk.green(`\n${name}:`) + chalk.white(` ${response.content}\n`))

          // Add to history
          reader.addHistory({ role: 'user', content: message })
          reader.addHistory({ role: 'assistant', content: response.content })

          // Token usage info in verbose mode
          if (verbose && response.tokens) {
            console.log(chalk.gray(`  (tokens: ${response.tokens.input} in, ${response.tokens.output} out)\n`))
          }
        } catch (error) {
          responseSpinner.fail(chalk.red('Failed to generate response'))
          if (verbose) {
            console.error(error)
          }
        }

        chatLoop()
      })
    }

    // Start chat loop
    chatLoop()

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to load Idiomark file'))
    console.error(chalk.red(error.message || error))

    if (error.code === 'ENOENT') {
      console.log(chalk.gray(`\n💡 Idiomark file not found at: ${chalk.bold(file)}`))
      console.log(chalk.gray(`   Create one with: ${chalk.bold('idiomark extract --twitter -o ' + file)}\n`))
    }
  }
}

/**
 * Generate a single response without entering interactive mode
 */
export async function respond(options: ChatOptions & { message: string }) {
  const { file, provider, model, message, verbose } = options

  const spinner = ora('Loading personality...').start()

  try {
    const loadResult = await loadIdiomarkFile(file, {
      validate: true,
      throwOnNotFound: true
    })

    spinner.text = 'Generating response...'

    // Determine provider and model from config or options
    const effectiveProvider = provider || getDefault('provider') || 'anthropic'
    const effectiveModel = model || getDefault('model') || undefined

    // Get API key from config or environment
    const apiKey = getApiKey(effectiveProvider)

    if (!apiKey) {
      spinner.fail(chalk.red(`No API key found for provider: ${effectiveProvider}`))
      console.log(chalk.gray('\nSet an API key with:'))
      console.log(chalk.gray(`  idiomark config --set apiKey.${effectiveProvider} <your-key>`))
      console.log(chalk.gray('\nOr set environment variable:'))
      console.log(chalk.gray(`  ${effectiveProvider.toUpperCase()}_API_KEY=<your-key>`))
      process.exit(1)
    }

    const reader = await IdiomarkReader.fromFile(file, {
      provider: effectiveProvider,
      model: effectiveModel,
      apiKey
    })

    const result = await reader.respond(message)

    spinner.stop()

    // Output just the response content for piping
    console.log(result.content)

    if (verbose) {
      console.error(chalk.gray(`\nModel: ${result.model}, Tokens: ${result.tokens?.input || 0}+${result.tokens?.output || 0}`))
    }

  } catch (error: any) {
    spinner.fail(chalk.red('Failed'))
    console.error(chalk.red(error.message || error))
    process.exit(1)
  }
}
