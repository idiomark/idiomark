import chalk from 'chalk'
import ora from 'ora'
import { IdiomarkExtractor } from '@idiomark/core'
import type { ExtractOptions } from '../types'

export async function extract(options: ExtractOptions) {
  const { twitter, github, reddit, sampleSize, verbose } = options
  // Commander supplies the '-o, --output' default ('entity.idiomark'); fall back to
  // the same value for programmatic calls where the flag default is not applied.
  const output = options.output ?? 'entity.idiomark'

  console.log(chalk.cyan('\n🎭 Idiomark Extractor\n'))

  // Validate inputs
  const sources: string[] = []
  if (twitter) sources.push('twitter')
  if (github) sources.push('github')
  if (reddit) sources.push('reddit')

  if (sources.length === 0) {
    console.log(chalk.yellow('⚠️  No sources specified. Use --twitter, --github, or --reddit'))
    console.log(chalk.gray('\nExample: idiomark extract --twitter --github -o me.idiomark\n'))
    return
  }

  const spinner = ora('Initializing Idiomark extraction...').start()

  try {
    // Initialize extractor
    const extractor = new IdiomarkExtractor({
      sources,
      sampleSize: parseInt(sampleSize),
      verbose: verbose || false
    })

    spinner.text = `Fetching data from ${sources.join(', ')}...`

    // Perform extraction
    const result = await extractor.extract()

    spinner.text = 'Analyzing personality patterns...'

    // Save to file
    await result.save(output)

    spinner.succeed(chalk.green(`\n✅ Personality blueprint saved to ${chalk.bold(output)}\n`))

    // Display summary
    console.log(chalk.cyan('📊 Extraction Summary:'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(`  ${chalk.white('Sources:')}        ${sources.join(', ')}`)
    console.log(`  ${chalk.white('Posts analyzed:')} ${result.metadata.sampleSize}`)
    console.log(`  ${chalk.white('Timeframe:')}      ${result.metadata.timeframe}`)
    console.log(`  ${chalk.white('Confidence:')}     ${(result.confidence * 100).toFixed(1)}%`)
    console.log(chalk.gray('─'.repeat(40)))

    // Display personality preview
    console.log(chalk.cyan('\n🎭 Personality Preview:'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(`  ${chalk.white('Primary tone:')}   ${result.file.personality.voice.tone.primary}`)
    console.log(`  ${chalk.white('Formality:')}      ${result.file.personality.voice.formality.toFixed(2)}`)
    console.log(`  ${chalk.white('Humor:')}          ${result.file.personality.voice.humor.toFixed(2)}`)
    console.log(`  ${chalk.white('Enthusiasm:')}     ${result.file.personality.voice.enthusiasm.toFixed(2)}`)
    console.log(chalk.gray('─'.repeat(40)))
    console.log(chalk.gray(`\n💡 Run ${chalk.bold('idiomark info ' + output)} for full details\n`))

  } catch (error) {
    spinner.fail(chalk.red('\n❌ Extraction failed\n'))
    if (verbose) {
      console.error(error)
    } else {
      console.log(chalk.gray('Run with --verbose for details\n'))
    }
  }
}
