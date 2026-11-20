/**
 * Key Provider Types and Interfaces
 *
 * This module defines the abstraction layer for cryptographic key management,
 * supporting both software-based and hardware security module (HSM) backends.
 *
 * @module @idiomark/core/crypto/key-provider
 */

// ============================================================================
// Key Types
// ============================================================================

/**
 * Supported cryptographic algorithms
 */
export type KeyAlgorithm = 'ed25519' | 'secp256k1' | 'x25519' | 'aes-256-gcm'

/**
 * Key usage capabilities
 */
export type KeyUsage = 'sign' | 'verify' | 'encrypt' | 'decrypt' | 'deriveKey'

/**
 * Key provider types
 */
export type ProviderType = 'software' | 'softhsm' | 'vault-transit' | 'aws-kms' | 'azure-kv'

// ============================================================================
// Key Reference
// ============================================================================

/**
 * Reference to a cryptographic key
 *
 * This is the primary handle for keys in the system. For HSM-backed keys,
 * this contains only a reference - the actual key material never leaves the HSM.
 */
export interface KeyReference {
  /** Unique identifier for this key */
  id: string

  /** Cryptographic algorithm */
  algorithm: KeyAlgorithm

  /** Provider that manages this key */
  provider: ProviderType

  /** Whether the key can be exported (always false for HSM keys) */
  extractable: boolean

  /** When the key was created */
  createdAt: Date

  /** Whether the key is backed by hardware security */
  hsmBacked: boolean

  /** Public key in hex format (always available) */
  publicKeyHex?: string

  /** Provider-specific metadata */
  metadata?: Record<string, unknown>
}

/**
 * Information about a key (for display/audit purposes)
 */
export interface KeyInfo {
  id: string
  algorithm: KeyAlgorithm
  provider: ProviderType
  hsmBacked: boolean
  extractable: boolean
  createdAt: Date
  usage: KeyUsage[]
  publicKeyHex?: string
  metadata?: Record<string, unknown>
}

// ============================================================================
// Operation Results
// ============================================================================

/**
 * Result of a signing operation
 */
export interface SignResult {
  /** The signature bytes */
  signature: Uint8Array

  /** Algorithm used for signing */
  algorithm: string

  /** Reference to the key used */
  keyReference: KeyReference

  /** When the signature was created */
  timestamp: Date
}

/**
 * Result of an encryption operation
 */
export interface EncryptResult {
  /** Encrypted data */
  ciphertext: Uint8Array

  /** Initialization vector (if applicable) */
  iv?: Uint8Array

  /** Authentication tag (for authenticated encryption) */
  tag?: Uint8Array

  /** Reference to the key used */
  keyReference: KeyReference
}

/**
 * Result of a key derivation operation
 */
export interface DeriveResult {
  /** Derived key reference */
  keyReference: KeyReference

  /** Shared secret (only for non-HSM key agreement) */
  sharedSecret?: Uint8Array
}

// ============================================================================
// Key Provider Interface
// ============================================================================

/**
 * Interface for cryptographic key providers
 *
 * Implementations can be software-based (keys in memory) or HSM-backed
 * (keys in hardware security modules).
 *
 * @example
 * ```ts
 * const provider = createKeyProvider('software')
 * const keyRef = await provider.generateKey('ed25519', ['sign', 'verify'])
 * const signature = await provider.sign(keyRef, data)
 * ```
 */
export interface KeyProvider {
  /** Provider name/identifier */
  readonly name: ProviderType

  // ==========================================================================
  // Key Lifecycle
  // ==========================================================================

  /**
   * Generate a new cryptographic key
   *
   * For HSM providers, the key is generated inside the HSM and never leaves.
   * For software providers, the key is stored in memory.
   */
  generateKey(algorithm: KeyAlgorithm, usage: KeyUsage[]): Promise<KeyReference>

  /**
   * Import an existing key
   *
   * Note: Many HSMs do not support key import for security reasons.
   * Check supportsKeyImport() before calling.
   */
  importKey?(key: Uint8Array, algorithm: KeyAlgorithm, usage: KeyUsage[]): Promise<KeyReference>

  /**
   * Delete a key
   *
   * For HSM providers, this permanently destroys the key in the HSM.
   */
  deleteKey(keyRef: KeyReference): Promise<void>

  // ==========================================================================
  // Cryptographic Operations
  // ==========================================================================

  /**
   * Sign data with a private key
   */
  sign(keyRef: KeyReference, data: Uint8Array): Promise<SignResult>

  /**
   * Verify a signature
   */
  verify(keyRef: KeyReference, signature: Uint8Array, data: Uint8Array): Promise<boolean>

  /**
   * Encrypt data with a public key (asymmetric) or symmetric key
   */
  encrypt?(keyRef: KeyReference, plaintext: Uint8Array): Promise<EncryptResult>

  /**
   * Decrypt data with a private key (asymmetric) or symmetric key
   */
  decrypt?(keyRef: KeyReference, ciphertext: Uint8Array, iv?: Uint8Array, tag?: Uint8Array): Promise<Uint8Array>

  /**
   * Derive a shared secret or key (for DH key exchange)
   */
  deriveKey?(keyRef: KeyReference, peerPublicKey: Uint8Array): Promise<DeriveResult>

  // ==========================================================================
  // Provider Capabilities
  // ==========================================================================

  /**
   * Check if this provider is backed by hardware security
   */
  isHSMBacked(): boolean

  /**
   * Check if this provider supports a specific algorithm
   */
  supportsAlgorithm(algorithm: KeyAlgorithm): boolean

  /**
   * Check if this provider supports key import
   */
  supportsKeyImport(): boolean

  /**
   * Get information about a key
   */
  getKeyInfo(keyRef: KeyReference): Promise<KeyInfo>
}

// ============================================================================
// Provider Configuration
// ============================================================================

/**
 * Configuration for AWS KMS provider
 */
export interface AWSKMSConfig {
  region?: string
  keyAlias?: string
  keyId?: string
  accessKeyId?: string
  secretAccessKey?: string
}

/**
 * Configuration for Azure Key Vault provider
 */
export interface AzureKVConfig {
  vaultUrl: string
  tenantId?: string
  clientId?: string
  clientSecret?: string
}

/**
 * Configuration for SoftHSM provider
 */
export interface SoftHSMConfig {
  modulePath?: string
  tokenLabel?: string
  pin?: string
  slot?: number
}

/**
 * Configuration for HashiCorp Vault Transit provider
 */
export interface VaultTransitConfig {
  vaultUrl: string
  token?: string
  namespace?: string
  mountPath?: string
  usesHSMBackend?: boolean
}

/**
 * Combined provider configuration
 */
export interface KeyProviderConfig {
  type?: ProviderType
  aws?: AWSKMSConfig
  azure?: AzureKVConfig
  softhsm?: SoftHSMConfig
  vault?: VaultTransitConfig
}

// ============================================================================
// Migration Types
// ============================================================================

/**
 * Result of a key migration operation
 */
export interface MigrationResult {
  /** Whether the migration succeeded */
  success: boolean

  /** Reference to the new key in the target provider */
  newKeyRef?: KeyReference

  /** Reference to the old key (if preserved) */
  oldKeyRef?: KeyReference

  /** Whether documents need to be re-signed with the new key */
  requiresResign: boolean

  /** When the migration occurred */
  migratedAt: Date

  /** Error message if migration failed */
  error?: string
}
