/**
 * HashiCorp Vault Transit Key Provider
 *
 * Provider for HashiCorp Vault's Transit secrets engine.
 * Vault Transit provides encryption-as-a-service with keys that never leave Vault.
 *
 * Vault can be self-hosted (free) or use HSM backends for FIPS compliance.
 * This makes it ideal for production deployments that need compliance but
 * don't want to pay for cloud HSM services.
 *
 * Setup:
 * 1. Install Vault: https://www.vaultproject.io/downloads
 * 2. Enable Transit engine: `vault secrets enable transit`
 * 3. Set environment variables:
 *    - VAULT_ADDR=http://localhost:8200
 *    - VAULT_TOKEN=your-token
 *
 * @module @idiomark/core/crypto/key-provider/providers/vault
 */

import type {
  KeyProvider,
  KeyReference,
  KeyAlgorithm,
  KeyUsage,
  KeyInfo,
  SignResult,
  EncryptResult,
  VaultTransitConfig,
  ProviderType
} from '../types.js'

// ============================================================================
// Vault API Types
// ============================================================================

interface VaultResponse<T> {
  request_id: string
  lease_id: string
  renewable: boolean
  lease_duration: number
  data: T
  wrap_info: null | {
    token: string
    ttl: number
    creation_time: string
    wrapped_accessor: string
  }
  warnings: string[] | null
  auth: null | {
    client_token: string
    accessor: string
    policies: string[]
  }
}

interface TransitKeyData {
  name: string
  type: string
  keys: Record<string, {
    public_key: string
    creation_time: string
  }>
  latest_version: number
  min_enabled_version: number
  min_decryption_version: number
  supports_encryption: boolean
  supports_decryption: boolean
  supports_signing: boolean
  supports_derivation: boolean
}

interface SignData {
  signature: string
  key_version: number
}

interface EncryptData {
  ciphertext: string
  key_version: number
}

interface DecryptData {
  plaintext: string
  key_version: number
}

// ============================================================================
// Vault Transit Provider Implementation
// ============================================================================

/**
 * HashiCorp Vault Transit secrets engine provider
 *
 * Uses Vault's Transit engine for cryptographic operations.
 * Keys are managed by Vault and never exposed to the application.
 *
 * @example
 * ```ts
 * const provider = new VaultTransitProvider({
 *   vaultUrl: 'http://localhost:8200',
 *   token: 'your-vault-token',
 *   mountPath: 'transit'
 * })
 *
 * const keyRef = await provider.generateKey('ed25519', ['sign', 'verify'])
 * const signature = await provider.sign(keyRef, data)
 * ```
 */
export class VaultTransitProvider implements KeyProvider {
  readonly name: ProviderType = 'vault-transit'

  private config: Required<VaultTransitConfig>
  private keyCache = new Map<string, { name: string; type: string; version: number }>()

  constructor(config: VaultTransitConfig) {
    this.config = {
      vaultUrl: config.vaultUrl?.replace(/\/$/, '') ?? 'http://localhost:8200',
      token: config.token ?? '',
      namespace: config.namespace ?? '',
      mountPath: config.mountPath ?? 'transit',
      usesHSMBackend: config.usesHSMBackend ?? false
    }
  }

  // ==========================================================================
  // Key Lifecycle
  // ==========================================================================

  async generateKey(algorithm: KeyAlgorithm, usage: KeyUsage[]): Promise<KeyReference> {
    const keyName = this.generateKeyName()
    const keyType = this.mapAlgorithmToVaultType(algorithm, usage)

    // Create key in Vault Transit
    const response = await this.vaultRequest<{ name: string }>(
      'POST',
      `/keys/${keyName}`,
      {
        type: keyType,
        exportable: false,
        allow_plaintext_backup: false
      }
    )

    // Cache key info
    this.keyCache.set(keyName, {
      name: keyName,
      type: keyType,
      version: 1
    })

    // Get public key
    const publicKeyHex = await this.getPublicKey(keyName)

    return {
      id: keyName,
      algorithm,
      provider: 'vault-transit',
      extractable: false,
      createdAt: new Date(),
      hsmBacked: this.config.usesHSMBackend,
      publicKeyHex
    }
  }

  async importKey(
    _key: Uint8Array,
    _algorithm: KeyAlgorithm,
    _usage: KeyUsage[]
  ): Promise<KeyReference> {
    // Vault Transit can import keys, but we disable it for security
    throw new Error(
      'Key import is disabled for Vault Transit provider. ' +
      'Generate new keys in Vault for best security.'
    )
  }

  async deleteKey(keyRef: KeyReference): Promise<void> {
    try {
      // Delete all versions of the key
      await this.vaultRequest('DELETE', `/keys/${keyRef.id}`)
      this.keyCache.delete(keyRef.id)
    } catch {
      // Key may not exist, ignore
    }
  }

  // ==========================================================================
  // Cryptographic Operations
  // ==========================================================================

  async sign(keyRef: KeyReference, data: Uint8Array): Promise<SignResult> {
    // Vault requires base64-encoded input
    const base64Data = this.uint8ArrayToBase64(data)

    const response = await this.vaultRequest<SignData>(
      'POST',
      `/sign/${keyRef.id}`,
      {
        input: base64Data,
        prehashed: false
      }
    )

    // Vault returns signature in format: vault:v1:base64signature
    const signatureBase64 = response.signature.split(':').pop() ?? ''
    const signature = this.base64ToUint8Array(signatureBase64)

    return {
      signature,
      algorithm: keyRef.algorithm,
      keyReference: keyRef,
      timestamp: new Date()
    }
  }

  async verify(
    keyRef: KeyReference,
    signature: Uint8Array,
    data: Uint8Array
  ): Promise<boolean> {
    const base64Data = this.uint8ArrayToBase64(data)
    const base64Signature = this.uint8ArrayToBase64(signature)

    try {
      await this.vaultRequest<void>(
        'POST',
        `/verify/${keyRef.id}`,
        {
          input: base64Data,
          signature: `vault:v1:${base64Signature}`
        }
      )
      return true
    } catch {
      return false
    }
  }

  async encrypt(keyRef: KeyReference, plaintext: Uint8Array): Promise<EncryptResult> {
    if (keyRef.algorithm !== 'aes-256-gcm') {
      throw new Error(`Encryption not supported for: ${keyRef.algorithm}`)
    }

    const base64Plaintext = this.uint8ArrayToBase64(plaintext)

    const response = await this.vaultRequest<EncryptData>(
      'POST',
      `/encrypt/${keyRef.id}`,
      {
        plaintext: base64Plaintext
      }
    )

    // Vault returns ciphertext in format: vault:v1:base64ciphertext
    const ciphertextBase64 = response.ciphertext.split(':').pop() ?? ''
    const ciphertext = this.base64ToUint8Array(ciphertextBase64)

    return {
      ciphertext,
      keyReference: keyRef
    }
  }

  async decrypt(
    keyRef: KeyReference,
    ciphertext: Uint8Array,
    _iv?: Uint8Array,
    _tag?: Uint8Array
  ): Promise<Uint8Array> {
    if (keyRef.algorithm !== 'aes-256-gcm') {
      throw new Error(`Decryption not supported for: ${keyRef.algorithm}`)
    }

    const base64Ciphertext = this.uint8ArrayToBase64(ciphertext)

    const response = await this.vaultRequest<DecryptData>(
      'POST',
      `/decrypt/${keyRef.id}`,
      {
        ciphertext: `vault:v1:${base64Ciphertext}`
      }
    )

    return this.base64ToUint8Array(response.plaintext)
  }

  async deriveKey(
    _keyRef: KeyReference,
    _peerPublicKey: Uint8Array
  ): Promise<{ keyReference: KeyReference; sharedSecret?: Uint8Array }> {
    // Vault Transit doesn't directly support ECDH key derivation
    throw new Error('Key derivation not supported by Vault Transit provider')
  }

  // ==========================================================================
  // Provider Capabilities
  // ==========================================================================

  isHSMBacked(): boolean {
    return this.config.usesHSMBackend
  }

  supportsAlgorithm(algorithm: KeyAlgorithm): boolean {
    // Vault Transit supports these types
    return ['ed25519', 'aes-256-gcm'].includes(algorithm)
  }

  supportsKeyImport(): boolean {
    return false // Disabled for security
  }

  async getKeyInfo(keyRef: KeyReference): Promise<KeyInfo> {
    const keyData = await this.vaultRequest<TransitKeyData>(
      'GET',
      `/keys/${keyRef.id}`
    )

    const latestVersion = keyData.latest_version
    const publicKey = keyData.keys[latestVersion.toString()]?.public_key

    return {
      id: keyRef.id,
      algorithm: keyRef.algorithm,
      provider: 'vault-transit',
      hsmBacked: this.config.usesHSMBackend,
      extractable: false,
      createdAt: new Date(keyData.keys['1']?.creation_time ?? Date.now()),
      usage: [
        keyData.supports_signing ? 'sign' : null,
        keyData.supports_signing ? 'verify' : null,
        keyData.supports_encryption ? 'encrypt' : null,
        keyData.supports_decryption ? 'decrypt' : null
      ].filter(Boolean) as KeyUsage[],
      publicKeyHex: publicKey
    }
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private async vaultRequest<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.vaultUrl}/v1/${this.config.mountPath}${path}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.config.token) {
      headers['X-Vault-Token'] = this.config.token
    }

    if (this.config.namespace) {
      headers['X-Vault-Namespace'] = this.config.namespace
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Vault request failed: ${response.status} ${errorText}`)
    }

    if (method === 'DELETE') {
      return {} as T
    }

    const json = await response.json() as VaultResponse<T>
    return json.data
  }

  private async getPublicKey(keyName: string): Promise<string | undefined> {
    try {
      const keyData = await this.vaultRequest<TransitKeyData>(
        'GET',
        `/keys/${keyName}`
      )

      const latestVersion = keyData.latest_version
      const publicKey = keyData.keys[latestVersion.toString()]?.public_key

      // Convert PEM to hex if needed
      if (publicKey?.startsWith('-----BEGIN')) {
        // For now, return the PEM as-is
        // In production, would parse and convert to hex
        return publicKey
      }

      return publicKey
    } catch {
      return undefined
    }
  }

  private mapAlgorithmToVaultType(
    algorithm: KeyAlgorithm,
    usage: KeyUsage[]
  ): string {
    const needsSigning = usage.includes('sign') || usage.includes('verify')
    const needsEncryption = usage.includes('encrypt') || usage.includes('decrypt')

    if (needsSigning) {
      switch (algorithm) {
        case 'ed25519':
          return 'ed25519'
        case 'secp256k1':
          return 'ecdsa-p256' // Vault doesn't support secp256k1 directly
        default:
          return 'ed25519'
      }
    }

    if (needsEncryption) {
      return 'aes256-gcm96'
    }

    return 'aes256-gcm96'
  }

  private generateKeyName(): string {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return `idiomark-${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}`
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('base64')
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    return new Uint8Array(Buffer.from(base64, 'base64'))
  }
}
