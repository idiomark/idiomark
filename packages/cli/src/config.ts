/**
 * Idiomark CLI Configuration Management
 *
 * Handles loading, saving, and managing configuration stored in ~/.idiomarkrc
 * or a custom path specified via Idiomark_CONFIG_PATH environment variable.
 *
 * Config structure:
 * {
 *   "apiKey": {
 *     "anthropic": "sk-ant-...",
 *     "openai": "sk-..."
 *   },
 *   "defaults": {
 *     "provider": "anthropic",
 *     "model": "claude-3-5-sonnet-latest",
 *     "output": "personality.idiomark"
 *   }
 * }
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { IdiomarkConfig, APIProvider } from './types'

/**
 * Get the path to the config file
 * Respects Idiomark_CONFIG_PATH environment variable
 */
export function getConfigPath(): string {
  const envPath = process.env.Idiomark_CONFIG_PATH
  if (envPath) {
    return path.resolve(envPath)
  }
  return path.join(os.homedir(), '.idiomarkrc')
}

/**
 * Get the default configuration
 */
export function getDefaultConfig(): IdiomarkConfig {
  return {
    apiKey: {},
    defaults: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-latest',
      output: 'personality.idiomark'
    }
  }
}

/**
 * Load configuration from file
 * Creates default config if file doesn't exist
 */
export function loadConfig(): IdiomarkConfig {
  const configPath = getConfigPath()

  try {
    if (!fs.existsSync(configPath)) {
      // Create default config file if it doesn't exist
      const defaultConfig = getDefaultConfig()
      saveConfig(defaultConfig)
      return defaultConfig
    }

    const content = fs.readFileSync(configPath, 'utf-8')
    const config = JSON.parse(content) as IdiomarkConfig

    // Merge with defaults to ensure all fields exist
    return {
      ...getDefaultConfig(),
      ...config,
      apiKey: {
        ...getDefaultConfig().apiKey,
        ...config.apiKey
      },
      defaults: {
        ...getDefaultConfig().defaults,
        ...config.defaults
      }
    }
  } catch (error: any) {
    // If there's an error reading/parsing, return defaults
    console.warn(`Warning: Could not load config from ${configPath}: ${error.message}`)
    return getDefaultConfig()
  }
}

/**
 * Save configuration to file
 */
export function saveConfig(config: IdiomarkConfig): void {
  const configPath = getConfigPath()
  const configDir = path.dirname(configPath)

  // Ensure directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }

  // Write with pretty formatting
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')

  // Set file permissions to 600 (owner read/write only) for security
  try {
    fs.chmodSync(configPath, 0o600)
  } catch {
    // Ignore permission errors on Windows
  }
}

/**
 * Get API key for a specific provider
 * Checks config file first, then falls back to environment variables
 *
 * @param provider - The API provider (anthropic, openai)
 * @returns The API key or undefined if not found
 */
export function getApiKey(provider: APIProvider): string | undefined {
  // First check config file
  const config = loadConfig()
  if (config.apiKey[provider]) {
    return config.apiKey[provider]
  }

  // Fall back to environment variables
  const envVarMap: Record<APIProvider, string> = {
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    'openai-compatible': 'OPENAI_API_KEY' // Use OpenAI key for compatible APIs
  }

  return process.env[envVarMap[provider]]
}

/**
 * Set API key for a specific provider
 *
 * @param provider - The API provider
 * @param key - The API key
 */
export function setApiKey(provider: APIProvider, key: string): void {
  const config = loadConfig()
  config.apiKey[provider] = key
  saveConfig(config)
}

/**
 * Get a default configuration value
 *
 * @param key - The default key to get
 * @returns The default value or undefined
 */
export function getDefault<K extends keyof IdiomarkConfig['defaults']>(
  key: K
): IdiomarkConfig['defaults'][K] | undefined {
  const config = loadConfig()
  return config.defaults?.[key]
}

/**
 * Set a default configuration value
 *
 * @param key - The default key to set
 * @param value - The value to set
 */
export function setDefault<K extends keyof IdiomarkConfig['defaults']>(
  key: K,
  value: IdiomarkConfig['defaults'][K]
): void {
  const config = loadConfig()
  if (!config.defaults) {
    config.defaults = getDefaultConfig().defaults
  }
  config.defaults[key] = value
  saveConfig(config)
}

/**
 * Check if configuration exists
 */
export function configExists(): boolean {
  return fs.existsSync(getConfigPath())
}

/**
 * Delete the configuration file
 */
export function deleteConfig(): boolean {
  const configPath = getConfigPath()
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath)
    return true
  }
  return false
}

/**
 * Get all configured API providers that have keys set
 */
export function getConfiguredProviders(): APIProvider[] {
  const config = loadConfig()
  const providers: APIProvider[] = []

  for (const provider of ['anthropic', 'openai', 'openai-compatible'] as APIProvider[]) {
    if (config.apiKey[provider] || getApiKey(provider)) {
      providers.push(provider)
    }
  }

  return providers
}

/**
 * Mask an API key for display (show first 4 and last 4 chars)
 */
export function maskApiKey(key: string | undefined): string {
  if (!key) return '(not set)'
  if (key.length <= 12) return '****'
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
}
