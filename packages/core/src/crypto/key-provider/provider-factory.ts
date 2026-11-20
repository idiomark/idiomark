/**
 * Key Provider Factory
 *
 * Creates key providers based on configuration or environment variables.
 * Supports software, HSM, and cloud KMS backends.
 *
 * @module @idiomark/core/crypto/key-provider/provider-factory
 */

import type {
  KeyProvider,
  KeyProviderConfig,
  ProviderType
} from './types.js'
import { SoftwareKeyProvider } from './software-provider.js'

// ============================================================================
// Environment Variable Names
// ============================================================================

const ENV_PROVIDER_TYPE = 'Idiomark_KEY_PROVIDER'

// AWS KMS
const ENV_AWS_REGION = 'AWS_KMS_REGION'
const ENV_AWS_KEY_ALIAS = 'AWS_KMS_KEY_ALIAS'
const ENV_AWS_KEY_ID = 'AWS_KMS_KEY_ID'

// Azure Key Vault
const ENV_AZURE_VAULT_URL = 'AZURE_KEY_VAULT_URL'
const ENV_AZURE_TENANT_ID = 'AZURE_TENANT_ID'
const ENV_AZURE_CLIENT_ID = 'AZURE_CLIENT_ID'

// SoftHSM
const ENV_SOFTHSM_MODULE = 'SOFTHSM2_MODULE'
const ENV_SOFTHSM_TOKEN = 'SOFTHSM2_TOKEN'
const ENV_SOFTHSM_PIN = 'SOFTHSM2_PIN'

// HashiCorp Vault
const ENV_VAULT_URL = 'VAULT_ADDR'
const ENV_VAULT_TOKEN = 'VAULT_TOKEN'
const ENV_VAULT_NAMESPACE = 'VAULT_NAMESPACE'

// ============================================================================
// Provider Registry
// ============================================================================

/**
 * Registry of available providers
 * Populated dynamically to allow tree-shaking unused providers
 */
const providerRegistry = new Map<ProviderType, () => Promise<KeyProvider>>()

/**
 * Register a provider factory function
 */
export function registerProvider(
  type: ProviderType,
  factory: () => Promise<KeyProvider>
): void {
  providerRegistry.set(type, factory)
}

// Register software provider (always available)
registerProvider('software', async () => new SoftwareKeyProvider())

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a key provider from configuration
 *
 * @param config - Provider configuration
 * @returns Configured key provider
 *
 * @example
 * ```ts
 * // Using environment variables
 * process.env.Idiomark_KEY_PROVIDER = 'aws-kms'
 * const provider = await createKeyProvider()
 *
 * // Using explicit config
 * const provider = await createKeyProvider({
 *   type: 'software'
 * })
 * ```
 */
export async function createKeyProvider(
  config?: KeyProviderConfig
): Promise<KeyProvider> {
  // Determine provider type from config or environment
  const providerType = config?.type ?? determineProviderType()

  // Check if provider is registered
  const factory = providerRegistry.get(providerType)

  if (factory) {
    return factory()
  }

  // Handle unregistered providers
  switch (providerType) {
    case 'software':
      return new SoftwareKeyProvider()

    case 'aws-kms':
      return createAWSKMSProvider(config?.aws)

    case 'azure-kv':
      return createAzureKVProvider(config?.azure)

    case 'softhsm':
      return createSoftHSMProvider(config?.softhsm)

    case 'vault-transit':
      return createVaultProvider(config?.vault)

    default:
      console.warn(
        `Unknown provider type: ${providerType}, falling back to software`
      )
      return new SoftwareKeyProvider()
  }
}

/**
 * Create a key provider synchronously (software only)
 *
 * For HSM providers, use the async createKeyProvider() instead.
 */
export function createKeyProviderSync(): KeyProvider {
  const providerType = determineProviderType()

  if (providerType !== 'software') {
    throw new Error(
      `Provider type '${providerType}' requires async initialization. ` +
      `Use createKeyProvider() instead.`
    )
  }

  return new SoftwareKeyProvider()
}

/**
 * Determine provider type from environment variables
 */
function determineProviderType(): ProviderType {
  const envType = process.env[ENV_PROVIDER_TYPE]?.toLowerCase()

  if (envType) {
    // Validate the type
    const validTypes: ProviderType[] = [
      'software',
      'softhsm',
      'vault-transit',
      'aws-kms',
      'azure-kv'
    ]

    if (validTypes.includes(envType as ProviderType)) {
      return envType as ProviderType
    }

    console.warn(
      `Invalid Idiomark_KEY_PROVIDER value: ${envType}. ` +
      `Valid options: ${validTypes.join(', ')}`
    )
  }

  // Default to software provider
  return 'software'
}

// ============================================================================
// Provider-Specific Factories (Lazy Loaded)
// ============================================================================

/**
 * Create AWS KMS provider
 *
 * Requires @aws-sdk/client-kms to be installed.
 * Configuration from environment or config parameter.
 */
async function createAWSKMSProvider(
  config?: KeyProviderConfig['aws']
): Promise<KeyProvider> {
  try {
    // Dynamic import to avoid bundling if not used
    const { AWSKMSProvider } = await import('./providers/aws-kms.js')

    return new AWSKMSProvider({
      region: config?.region ?? process.env[ENV_AWS_REGION],
      keyAlias: config?.keyAlias ?? process.env[ENV_AWS_KEY_ALIAS],
      keyId: config?.keyId ?? process.env[ENV_AWS_KEY_ID],
      accessKeyId: config?.accessKeyId,
      secretAccessKey: config?.secretAccessKey
    })
  } catch (error) {
    throw new Error(
      `Failed to load AWS KMS provider. ` +
      `Make sure @aws-sdk/client-kms is installed: npm install @aws-sdk/client-kms\n` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Create Azure Key Vault provider
 *
 * Requires @azure/keyvault-keys and @azure/identity to be installed.
 */
async function createAzureKVProvider(
  config?: KeyProviderConfig['azure']
): Promise<KeyProvider> {
  try {
    const { AzureKVProvider } = await import('./providers/azure-kv.js')

    return new AzureKVProvider({
      vaultUrl: config?.vaultUrl ?? process.env[ENV_AZURE_VAULT_URL] ?? '',
      tenantId: config?.tenantId ?? process.env[ENV_AZURE_TENANT_ID],
      clientId: config?.clientId ?? process.env[ENV_AZURE_CLIENT_ID],
      clientSecret: config?.clientSecret
    })
  } catch (error) {
    throw new Error(
      `Failed to load Azure Key Vault provider. ` +
      `Make sure @azure/keyvault-keys and @azure/identity are installed.\n` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Create SoftHSM provider
 *
 * Requires pkcs11js to be installed and SoftHSM2 to be configured.
 */
async function createSoftHSMProvider(
  config?: KeyProviderConfig['softhsm']
): Promise<KeyProvider> {
  try {
    const { SoftHSMProvider } = await import('./providers/softhsm.js')

    return new SoftHSMProvider({
      modulePath: config?.modulePath ?? process.env[ENV_SOFTHSM_MODULE],
      tokenLabel: config?.tokenLabel ?? process.env[ENV_SOFTHSM_TOKEN],
      pin: config?.pin ?? process.env[ENV_SOFTHSM_PIN],
      slot: config?.slot
    })
  } catch (error) {
    throw new Error(
      `Failed to load SoftHSM provider. ` +
      `Make sure pkcs11js is installed and SoftHSM2 is configured.\n` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Create HashiCorp Vault Transit provider
 *
 * Requires node-vault to be installed.
 */
async function createVaultProvider(
  config?: KeyProviderConfig['vault']
): Promise<KeyProvider> {
  try {
    const { VaultTransitProvider } = await import('./providers/vault.js')

    return new VaultTransitProvider({
      vaultUrl: config?.vaultUrl ?? process.env[ENV_VAULT_URL] ?? '',
      token: config?.token ?? process.env[ENV_VAULT_TOKEN],
      namespace: config?.namespace ?? process.env[ENV_VAULT_NAMESPACE],
      mountPath: config?.mountPath,
      usesHSMBackend: config?.usesHSMBackend
    })
  } catch (error) {
    throw new Error(
      `Failed to load Vault Transit provider. ` +
      `Make sure node-vault is installed: npm install node-vault\n` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check if a provider type is available
 */
export async function isProviderAvailable(type: ProviderType): Promise<boolean> {
  if (type === 'software') return true

  try {
    const factory = providerRegistry.get(type)
    if (factory) {
      await factory()
      return true
    }

    // Try to create the provider
    switch (type) {
      case 'aws-kms':
        await import('./providers/aws-kms.js')
        return true
      case 'azure-kv':
        await import('./providers/azure-kv.js')
        return true
      case 'softhsm':
        await import('./providers/softhsm.js')
        return true
      case 'vault-transit':
        await import('./providers/vault.js')
        return true
      default:
        return false
    }
  } catch {
    return false
  }
}

/**
 * Get list of available provider types
 */
export async function getAvailableProviders(): Promise<ProviderType[]> {
  const types: ProviderType[] = ['software']
  const checkTypes: ProviderType[] = ['aws-kms', 'azure-kv', 'softhsm', 'vault-transit']

  for (const type of checkTypes) {
    if (await isProviderAvailable(type)) {
      types.push(type)
    }
  }

  return types
}
