/**
 * Key Provider Module
 *
 * Abstraction layer for cryptographic key management supporting both
 * software-based and hardware security module (HSM) backends.
 *
 * @module @idiomark/core/crypto/key-provider
 *
 * @example
 * ```ts
 * import { createKeyProvider } from '@idiomark/core/crypto/key-provider'
 *
 * // Create provider (uses Idiomark_KEY_PROVIDER env var)
 * const provider = await createKeyProvider()
 *
 * // Generate a signing key
 * const keyRef = await provider.generateKey('ed25519', ['sign', 'verify'])
 *
 * // Sign data
 * const data = new TextEncoder().encode('Hello, world!')
 * const result = await provider.sign(keyRef, data)
 *
 * // Verify signature
 * const valid = await provider.verify(keyRef, result.signature, data)
 * ```
 */

// Types
export type {
  KeyAlgorithm,
  KeyUsage,
  ProviderType,
  KeyReference,
  KeyInfo,
  SignResult,
  EncryptResult,
  DeriveResult,
  KeyProvider,
  KeyProviderConfig,
  AWSKMSConfig,
  AzureKVConfig,
  SoftHSMConfig,
  VaultTransitConfig,
  MigrationResult
} from './types.js'

// Software Provider
export { SoftwareKeyProvider, createSoftwareProvider } from './software-provider.js'

// Factory Functions
export {
  createKeyProvider,
  createKeyProviderSync,
  registerProvider,
  isProviderAvailable,
  getAvailableProviders
} from './provider-factory.js'

// Migration
export { migrateToHSM, createMigrationPlan } from './migration.js'
