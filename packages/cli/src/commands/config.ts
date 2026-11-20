/**
 * Idiomark Config Command
 *
 * View and edit Idiomark CLI configuration
 *
 * Usage:
 *   idiomark config                  Show all config
 *   idiomark config --list           List all config values
 *   idiomark config --path           Show config file path
 *   idiomark config --get <key>      Get a specific value
 *   idiomark config --set <k> <v>    Set a value
 *   idiomark config --delete <key>   Delete a value
 *   idiomark config --reset          Reset to defaults
 */

import chalk from 'chalk'
import inquirer from 'inquirer'
import type { ConfigOptions, APIProvider } from '../types'
import {
  loadConfig,
  saveConfig,
  getConfigPath,
  getApiKey,
  setApiKey,
  getDefault,
  setDefault,
  deleteConfig,
  getDefaultConfig,
  maskApiKey,
  configExists
} from '../config'

/**
 * Parse a config key path like 'apiKey.anthropic' or 'defaults.provider'
 */
function parseKeyPath(key: string): { section: string; field: string } | null {
  const parts = key.split('.')
  if (parts.length !== 2) return null
  return { section: parts[0], field: parts[1] }
}

/**
 * Get a config value by key path
 */
function getConfigValue(key: string): string | undefined {
  const parsed = parseKeyPath(key)
  if (!parsed) return undefined

  const config = loadConfig()

  if (parsed.section === 'apiKey') {
    return config.apiKey[parsed.field as APIProvider]
  }
  if (parsed.section === 'defaults') {
    return (config.defaults as Record<string, string | undefined>)[parsed.field]
  }

  return undefined
}

/**
 * Set a config value by key path
 */
function setConfigValue(key: string, value: string): boolean {
  const parsed = parseKeyPath(key)
  if (!parsed) return false

  if (parsed.section === 'apiKey') {
    setApiKey(parsed.field as APIProvider, value)
    return true
  }
  if (parsed.section === 'defaults') {
    setDefault(parsed.field as 'provider' | 'model' | 'output', value)
    return true
  }

  return false
}

/**
 * Delete a config value by key path
 */
function deleteConfigValue(key: string): boolean {
  const parsed = parseKeyPath(key)
  if (!parsed) return false

  const config = loadConfig()

  if (parsed.section === 'apiKey') {
    delete config.apiKey[parsed.field as APIProvider]
    saveConfig(config)
    return true
  }
  if (parsed.section === 'defaults') {
    delete (config.defaults as Record<string, string | undefined>)[parsed.field]
    saveConfig(config)
    return true
  }

  return false
}

/**
 * Main config command handler
 */
export async function config(options: ConfigOptions): Promise<void> {
  // Show config file path
  if (options.path) {
    console.log(getConfigPath())
    return
  }

  // Reset config to defaults
  if (options.reset) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Reset all configuration to defaults?',
        default: false
      }
    ])

    if (confirm) {
      deleteConfig()
      saveConfig(getDefaultConfig())
      console.log(chalk.green('Configuration reset to defaults.'))
    } else {
      console.log(chalk.gray('Reset cancelled.'))
    }
    return
  }

  // Get a specific value
  if (options.get) {
    const value = getConfigValue(options.get)
    if (value !== undefined) {
      // Mask API keys in output
      if (options.get.startsWith('apiKey.')) {
        console.log(maskApiKey(value))
      } else {
        console.log(value)
      }
    } else {
      console.log(chalk.gray('(not set)'))
    }
    return
  }

  // Set a value
  if (options.set && options.set.length >= 2) {
    const [key, ...valueParts] = options.set
    const value = valueParts.join(' ')

    if (setConfigValue(key, value)) {
      // Don't show the actual API key
      if (key.startsWith('apiKey.')) {
        console.log(chalk.green(`Set ${key}`))
      } else {
        console.log(chalk.green(`Set ${key} = ${value}`))
      }
    } else {
      console.error(chalk.red(`Invalid key: ${key}`))
      console.log(chalk.gray('\nValid keys:'))
      console.log(chalk.gray('  apiKey.anthropic'))
      console.log(chalk.gray('  apiKey.openai'))
      console.log(chalk.gray('  defaults.provider'))
      console.log(chalk.gray('  defaults.model'))
      console.log(chalk.gray('  defaults.output'))
      process.exit(1)
    }
    return
  }

  // Delete a value
  if (options.delete) {
    if (deleteConfigValue(options.delete)) {
      console.log(chalk.green(`Deleted ${options.delete}`))
    } else {
      console.error(chalk.red(`Invalid key: ${options.delete}`))
      process.exit(1)
    }
    return
  }

  // Default: show all config (interactive mode or list)
  await showConfig(options.list)
}

/**
 * Display all configuration
 */
async function showConfig(list: boolean = false): Promise<void> {
  const configPath = getConfigPath()
  const config = loadConfig()

  console.log(chalk.cyan('\nIdiomark CLI Configuration\n'))
  console.log(chalk.gray('─'.repeat(50)))

  // Config file location
  console.log(`${chalk.white('Config file:')} ${configPath}`)
  console.log(`${chalk.white('Status:')}      ${configExists() ? chalk.green('exists') : chalk.gray('not found (using defaults)')}`)
  console.log(chalk.gray('─'.repeat(50)))

  // API Keys
  console.log(chalk.cyan('\nAPI Keys:\n'))
  const providers: APIProvider[] = ['anthropic', 'openai', 'openai-compatible']
  for (const provider of providers) {
    const key = getApiKey(provider)
    console.log(`  ${chalk.white(provider.padEnd(18))} ${maskApiKey(key)}`)
  }

  // Defaults
  console.log(chalk.cyan('\nDefaults:\n'))
  console.log(`  ${chalk.white('provider:')}  ${config.defaults?.provider || 'anthropic'}`)
  console.log(`  ${chalk.white('model:')}     ${config.defaults?.model || 'claude-3-5-sonnet-latest'}`)
  console.log(`  ${chalk.white('output:')}    ${config.defaults?.output || 'personality.idiomark'}`)

  console.log(chalk.gray('\n' + '─'.repeat(50)))
  console.log(chalk.gray('\nCommands:'))
  console.log(chalk.gray(`  ${chalk.bold('idiomark config --set apiKey.anthropic <key>')}  Set Anthropic API key`))
  console.log(chalk.gray(`  ${chalk.bold('idiomark config --set apiKey.openai <key>')}      Set OpenAI API key`))
  console.log(chalk.gray(`  ${chalk.bold('idiomark config --set defaults.provider <name>')} Set default provider`))
  console.log(chalk.gray(`  ${chalk.bold('idiomark config --set defaults.model <model>')}   Set default model`))
  console.log(chalk.gray(`  ${chalk.bold('idiomark config --set defaults.output <file>')}   Set default output file`))
  console.log(chalk.gray(`  ${chalk.bold('idiomark config --get <key>')}                   Get a value`))
  console.log(chalk.gray(`  ${chalk.bold('idiomark config --delete <key>')}               Delete a value`))
  console.log(chalk.gray(`  ${chalk.bold('idiomark config --reset')}                      Reset to defaults`))
  console.log(chalk.gray(`  ${chalk.bold('idiomark config --path')}                       Show config file path`))
  console.log()

  // If not list mode, offer interactive configuration
  if (!list) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Set API Key', value: 'setKey' },
          { name: 'Set Default Provider', value: 'setProvider' },
          { name: 'Set Default Model', value: 'setModel' },
          { name: 'Set Default Output File', value: 'setOutput' },
          { name: 'Exit', value: 'exit' }
        ]
      }
    ])

    if (action === 'exit') {
      return
    }

    if (action === 'setKey') {
      const { provider, key } = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Which provider?',
          choices: ['anthropic', 'openai']
        },
        {
          type: 'password',
          name: 'key',
          message: 'Enter API key:',
          mask: '*'
        }
      ])

      setApiKey(provider, key)
      console.log(chalk.green(`\nAPI key saved for ${provider}.`))
    }

    if (action === 'setProvider') {
      const { provider } = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Select default provider:',
          choices: ['anthropic', 'openai'],
          default: getDefault('provider') || 'anthropic'
        }
      ])

      setDefault('provider', provider as APIProvider)
      console.log(chalk.green(`\nDefault provider set to ${provider}.`))
    }

    if (action === 'setModel') {
      const { model } = await inquirer.prompt([
        {
          type: 'input',
          name: 'model',
          message: 'Enter default model:',
          default: getDefault('model') || 'claude-3-5-sonnet-latest'
        }
      ])

      setDefault('model', model)
      console.log(chalk.green(`\nDefault model set to ${model}.`))
    }

    if (action === 'setOutput') {
      const { output } = await inquirer.prompt([
        {
          type: 'input',
          name: 'output',
          message: 'Enter default output file:',
          default: getDefault('output') || 'personality.idiomark'
        }
      ])

      setDefault('output', output)
      console.log(chalk.green(`\nDefault output file set to ${output}.`))
    }
  }
}
