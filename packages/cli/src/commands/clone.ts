import chalk from 'chalk'
import ora from 'ora'
import { extract } from './extract'
import type { ExtractOptions } from '../types'

export async function clone(source: string, options: ExtractOptions = {}): Promise<void> {
  const spinner = ora('Cloning personality...').start()

  try {
    let extractOptions: ExtractOptions = { ...options }

    // Detect source type from argument
    if (source.startsWith('@')) {
      // Twitter username
      spinner.text = `Extracting from Twitter: ${source}`
      extractOptions = {
        ...extractOptions,
        twitter: true,
        output: extractOptions.output || `${source.slice(1)}.idiomark`
      }
    } else if (source.startsWith('github:')) {
      // GitHub username
      const username = source.replace('github:', '')
      spinner.text = `Extracting from GitHub: ${username}`
      extractOptions = {
        ...extractOptions,
        github: true,
        output: extractOptions.output || `${username}.idiomark`
      }
    } else if (source.startsWith('http://') || source.startsWith('https://')) {
      spinner.fail('URL extraction not yet implemented')
      console.log(chalk.yellow('URL scraping coming soon!'))
      console.log(chalk.gray('For now, use @username or github:username'))
      return
    } else if (source.endsWith('.idiomark')) {
      spinner.fail('File cloning not yet implemented')
      console.log(chalk.yellow('File copying coming soon!'))
      return
    } else {
      spinner.fail('Unknown source format')
      console.log(chalk.yellow('\nSupported formats:'))
      console.log('  @username          - Extract from Twitter')
      console.log('  github:username    - Extract from GitHub')
      console.log('  https://...         - Scrape from URL (soon)')
      return
    }

    spinner.stop()

    // Call extract with detected options
    await extract(extractOptions)

  } catch (error) {
    spinner.fail('Clone failed')
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error))
  }
}
