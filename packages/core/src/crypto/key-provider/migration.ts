/**
 * Key Migration Utilities
 *
 * Tools for migrating keys from software storage to HSM providers.
 *
 * @module @idiomark/core/crypto/key-provider/migration
 */

import type {
  KeyProvider,
  KeyReference,
  KeyAlgorithm,
  KeyUsage,
  MigrationResult
} from './types.js'

/**
 * Legacy key pair format (from current Idiomark Protocol implementation)
 */
export interface LegacyKeyPair {
  publicKey: string
  privateKey: string
  keyType: KeyAlgorithm
  keyId: string
  createdAt: Date
}

/**
 * Migration plan describing what will happen
 */
export interface MigrationPlan {
  /** Source provider type */
  sourceType: string

  /** Target provider type */
  targetType: string

  /** Whether keys can be imported (preserving identity) */
  canImport: boolean

  /** Whether new keys will be generated */
  requiresNewKey: boolean

  /** Whether documents need re-signing */
  requiresResign: boolean

  /** Estimated impact */
  impact: 'low' | 'medium' | 'high'

  /** Human-readable description */
  description: string
}

/**
 * Create a migration plan for moving keys to an HSM provider
 *
 * This helps users understand what will happen before they commit to migration.
 *
 * @param sourceProvider - Current key provider
 * @param targetProvider - Target HSM provider
 * @returns Migration plan
 */
export async function createMigrationPlan(
  sourceProvider: KeyProvider,
  targetProvider: KeyProvider
): Promise<MigrationPlan> {
  const canImport = targetProvider.supportsKeyImport()
  const sourceIsHSM = sourceProvider.isHSMBacked()
  const targetIsHSM = targetProvider.isHSMBacked()

  let impact: 'low' | 'medium' | 'high'
  let description: string

  if (sourceIsHSM && targetIsHSM) {
    impact = 'high'
    description =
      'Migrating between HSM providers requires generating new keys ' +
      'and re-signing all documents. Consider keeping both keys during transition.'
  } else if (canImport && !sourceIsHSM) {
    impact = 'low'
    description =
      'Keys will be imported to the HSM, preserving your identity. ' +
      'No re-signing required.'
  } else if (!canImport && !sourceIsHSM) {
    impact = 'medium'
    description =
      'Software keys cannot be imported to this HSM. ' +
      'New keys will be generated, and documents must be re-signed.'
  } else {
    impact = 'medium'
    description =
      'Migration will generate new keys in the target provider. ' +
      'Existing signatures remain valid for verification.'
  }

  return {
    sourceType: sourceProvider.name,
    targetType: targetProvider.name,
    canImport,
    requiresNewKey: !canImport || sourceIsHSM,
    requiresResign: !canImport || sourceIsHSM,
    impact,
    description
  }
}

/**
 * Migrate a key from software to HSM
 *
 * @param legacyKey - Current key pair in legacy format
 * @param targetProvider - Target HSM provider
 * @param options - Migration options
 * @returns Migration result
 *
 * @example
 * ```ts
 * const plan = await createMigrationPlan(softwareProvider, hsmProvider)
 * console.log(plan.description)
 *
 * if (plan.requiresResign) {
 *   console.log('Warning: Documents will need to be re-signed')
 * }
 *
 * const result = await migrateToHSM(currentKey, hsmProvider)
 * if (result.success) {
 *   console.log('Key migrated:', result.newKeyRef.id)
 * }
 * ```
 */
export async function migrateToHSM(
  legacyKey: LegacyKeyPair,
  targetProvider: KeyProvider,
  options?: {
    /** Preserve old key reference for verification */
    preserveOldKey?: boolean
    /** Key usage for the new key */
    usage?: KeyUsage[]
  }
): Promise<MigrationResult> {
  const migratedAt = new Date()
  const usage = options?.usage ?? ['sign', 'verify']

  try {
    // Try to import the key if supported
    if (targetProvider.supportsKeyImport()) {
      // Convert hex private key to bytes
      const privateKeyBytes = hexToBytes(legacyKey.privateKey)

      const newKeyRef = await targetProvider.importKey!(
        privateKeyBytes,
        legacyKey.keyType,
        usage
      )

      return {
        success: true,
        newKeyRef,
        requiresResign: false,
        migratedAt
      }
    }

    // Cannot import - generate new key
    const newKeyRef = await targetProvider.generateKey(legacyKey.keyType, usage)

    // Create old key reference for verification
    const oldKeyRef: KeyReference = {
      id: legacyKey.keyId,
      algorithm: legacyKey.keyType,
      provider: 'software',
      extractable: true,
      createdAt: legacyKey.createdAt,
      hsmBacked: false,
      publicKeyHex: legacyKey.publicKey
    }

    return {
      success: true,
      newKeyRef,
      oldKeyRef: options?.preserveOldKey ? oldKeyRef : undefined,
      requiresResign: true,
      migratedAt
    }
  } catch (error) {
    return {
      success: false,
      requiresResign: false,
      migratedAt,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Migrate a key reference from one provider to another
 *
 * @param keyRef - Key reference to migrate
 * @param sourceProvider - Current provider
 * @param targetProvider - Target provider
 * @returns Migration result
 */
export async function migrateKeyReference(
  keyRef: KeyReference,
  sourceProvider: KeyProvider,
  targetProvider: KeyProvider
): Promise<MigrationResult> {
  const migratedAt = new Date()

  try {
    // Get key info from source
    const keyInfo = await sourceProvider.getKeyInfo(keyRef)

    // Try to export and import
    if (
      sourceProvider instanceof Object &&
      'exportKey' in sourceProvider &&
      typeof (sourceProvider as any).exportKey === 'function' &&
      targetProvider.supportsKeyImport()
    ) {
      const privateKey = await (sourceProvider as any).exportKey(keyRef)
      const newKeyRef = await targetProvider.importKey!(
        privateKey,
        keyInfo.algorithm,
        keyInfo.usage
      )

      return {
        success: true,
        newKeyRef,
        oldKeyRef: keyRef,
        requiresResign: false,
        migratedAt
      }
    }

    // Cannot transfer - generate new key
    const newKeyRef = await targetProvider.generateKey(
      keyInfo.algorithm,
      keyInfo.usage
    )

    return {
      success: true,
      newKeyRef,
      oldKeyRef: keyRef,
      requiresResign: true,
      migratedAt
    }
  } catch (error) {
    return {
      success: false,
      requiresResign: false,
      migratedAt,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}
