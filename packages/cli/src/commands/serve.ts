import chalk from 'chalk'
import ora from 'ora'
import { readFileSync } from 'fs'
import { IdiomarkInferenceServer } from '@idiomark/core'
import type { ServeOptions } from '../types'

export async function serve(file: string, options: ServeOptions) {
  const { port, model } = options

  console.log(chalk.cyan('\n🚀 Idiomark Inference Server\n'))

  const spinner = ora('Loading personality blueprint...').start()

  try {
    // Load the Idiomark file
    const content = readFileSync(file, 'utf-8')
    const data = JSON.parse(content)

    spinner.text = 'Initializing inference engine...'

    // Determine provider and API key from model or environment
    const isAnthropic = model?.includes('claude') || model?.includes('anthropic')
    const provider = isAnthropic ? 'anthropic' : 'openai'
    const apiKey = isAnthropic
      ? process.env.ANTHROPIC_API_KEY || ''
      : process.env.OPENAI_API_KEY || ''

    // Create the inference server with generation options
    const server = new IdiomarkInferenceServer({
      port: parseInt(port),
      model: model || (isAnthropic ? 'claude-3-5-sonnet-20241022' : 'gpt-4o'),
      personality: data,
      generation: {
        provider,
        apiKey,
        model: model || undefined
      }
    })

    spinner.succeed(chalk.green('Server starting...\n'))

    // Display server info
    console.log(chalk.cyan('🌐 Server Details:'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(`  ${chalk.white('URL:')}       http://localhost:${port}`)
    console.log(`  ${chalk.white('Model:')}     ${model}`)
    console.log(`  ${chalk.white('Provider:')}  ${provider}`)
    console.log(`  ${chalk.white('Personality:')} ${data.personality?.voice?.tone?.primary || 'Unknown'}`)
    console.log(chalk.gray('─'.repeat(40)))
    console.log(chalk.gray('\n📝 API Endpoints:'))
    console.log(chalk.gray('  POST   /generate          Generate response with personality'))
    console.log(chalk.gray('  POST   /stream           Stream response (SSE)'))
    console.log(chalk.gray('  GET    /health           Health check'))
    console.log(chalk.gray('  GET    /personality      View loaded personality'))
    console.log(chalk.gray('  GET    /system-prompt    View system prompt'))
    console.log(chalk.gray('\n💡 Example:'))
    console.log(chalk.gray('  curl -X POST http://localhost:3000/generate \\'))
    console.log(chalk.gray('    -H "Content-Type: application/json" \\'))
    console.log(chalk.gray('    -d \'{"message": "Hello!"}\'\n'))

    // Start the server
    await server.start()

    console.log(chalk.green(`\n✅ Server ready at http://localhost:${port}\n`))
    console.log(chalk.gray('Press Ctrl+C to stop\n'))

  } catch (error) {
    spinner.fail(chalk.red('\n❌ Server failed to start\n'))
    console.log(chalk.red(`  ${(error as any).message}\n`))
  }
}
