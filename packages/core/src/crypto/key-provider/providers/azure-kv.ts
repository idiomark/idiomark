/**
 * Azure Key Vault Key Provider
 *
 * Provider for Azure Key Vault Managed HSM.
 * Azure Key Vault provides FIPS 140-2 Level 2/3 compliant HSM-backed key management.
 *
 * Costs:
 * - Standard tier: ~$1-3/month per key
 * - Managed HSM tier: ~$500/month (dedicated HSM)
 * - ~$0.03 per 10,000 operations
 *
 * Setup:
 * 1. Create Key Vault in Azure Portal
 * 2. Create a service principal with Key Vault access
 * 3. Set environment variables:
 *    - AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
 *    - AZURE_TENANT_ID=your-tenant-id
 *    - AZURE_CLIENT_ID=your-client-id
 *    - AZURE_CLIENT_SECRET=your-client-secret
 *
 * @module @idiomark/core/crypto/key-provider/providers/azure-kv
 */

import type {
  KeyProvider,
  KeyReference,
  KeyAlgorithm,
  KeyUsage,
  KeyInfo,
  SignResult,
  EncryptResult,
  AzureKVConfig,
  ProviderType
} from '../types.js'

// ============================================================================
// Azure SDK Types (lazy-loaded)
// ============================================================================

interface KeyClient {
  createKey(
    name: string,
    keyType: string,
    options?: {
      keyOps?: string[]
      tags?: Record<string, string>
    }
  ): Promise<{ name: string; key: { kid: string }; keyOperations?: string[] }>
  getKey(name: string): Promise<{ name: string; key: { kid: string; x?: string; y?: string } }>
  deleteKey(name: string): Promise<void>
  getCryptographyClient(keyName: string, options?: { keyVersion?: string }): CryptographyClient
}

interface CryptographyClient {
  sign(algorithm: string, digest: Uint8Array): Promise<{ result: Uint8Array; keyId: string }>
  verify(algorithm: string, digest: Uint8Array, signature: Uint8Array): Promise<{ result: boolean }>
  encrypt(algorithm: string, plaintext: Uint8Array): Promise<{ result: Uint8Array }>
  decrypt(algorithm: string, ciphertext: Uint8Array): Promise<{ result: Uint8Array }>
}

// ============================================================================
// Azure Key Vault Provider Implementation
// ============================================================================

/**
 * Azure Key Vault provider for HSM-backed cryptographic operations
 *
 * Uses Azure Key Vault for signing and encryption. Keys are generated and stored
 * in Azure HSMs and never leave Azure infrastructure.
 *
 * @example
 * ```ts
 * const provider = new AzureKVProvider({
 *   vaultUrl: 'https://your-vault.vault.azure.net/',
 *   tenantId: 'your-tenant-id',
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret'
 * })
 *
 * const keyRef = await provider.generateKey('ed25519', ['sign', 'verify'])
 * const signature = await provider.sign(keyRef, data)
 * ```
 */
export class AzureKVProvider implements KeyProvider {
  readonly name: ProviderType = 'azure-kv'

  private config: Required<AzureKVConfig>
  private keyClient: KeyClient | null = null
  private cryptoClients = new Map<string, CryptographyClient>()
  private keyCache = new Map<string, {
    name: string
    keyId: string
    algorithm: KeyAlgorithm
  }>()

  constructor(config: AzureKVConfig) {
    this.config = {
      vaultUrl: config.vaultUrl?.replace(/\/$/, '') ?? '',
      tenantId: config.tenantId ?? '',
      clientId: config.clientId ?? '',
      clientSecret: config.clientSecret ?? ''
    }
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  private async getKeyClient(): Promise<KeyClient> {
    if (this.keyClient) return this.keyClient

    try {
      const { KeyClient } = await import('@azure/keyvault-keys')
      const { DefaultAzureCredential, ClientSecretCredential } = await import('@azure/identity')

      const credential = this.config.clientId && this.config.clientSecret
        ? new ClientSecretCredential(
            this.config.tenantId,
            this.config.clientId,
            this.config.clientSecret
          )
        : new DefaultAzureCredential()

      this.keyClient = new KeyClient(this.config.vaultUrl, credential) as any
      return this.keyClient!
    } catch (error) {
      throw new Error(
        `Failed to load Azure Key Vault client. ` +
        `Install: npm install @azure/keyvault-keys @azure/identity\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private async getCryptoClient(keyName: string): Promise<CryptographyClient> {
    if (this.cryptoClients.has(keyName)) {
      return this.cryptoClients.get(keyName)!
    }

    const keyClient = await this.getKeyClient()

    try {
      // getCryptographyClient is on KeyClient instance
      const cryptoClient = await (keyClient as any).getCryptographyClient(keyName)
      this.cryptoClients.set(keyName, cryptoClient)
      return cryptoClient
    } catch (error) {
      throw new Error(
        `Failed to get cryptography client for key ${keyName}: ` +
        `${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // ==========================================================================
  // Key Lifecycle
  // ==========================================================================

  async generateKey(algorithm: KeyAlgorithm, usage: KeyUsage[]): Promise<KeyReference> {
    const keyClient = await this.getKeyClient()
    const keyName = this.generateKeyName()
    const keyType = this.getKeyType(algorithm)
    const keyOps = this.mapUsageToKeyOps(usage)

    try {
      const key = await keyClient.createKey(keyName, keyType, {
        keyOps,
        tags: {
          'idiomark-protocol': 'true',
          algorithm
        }
      })

      const keyId = key.key.kid

      // Cache key info
      this.keyCache.set(keyName, {
        name: keyName,
        keyId,
        algorithm
      })

      return {
        id: keyName,
        algorithm,
        provider: 'azure-kv',
        extractable: false,
        createdAt: new Date(),
        hsmBacked: true,
        metadata: { keyId }
      }
    } catch (error) {
      throw new Error(
        `Failed to create Key Vault key: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async importKey(
    _key: Uint8Array,
    _algorithm: KeyAlgorithm,
    _usage: KeyUsage[]
  ): Promise<KeyReference> {
    // Azure Key Vault supports key import, but we disable it for security
    throw new Error(
      'Key import is disabled for Azure Key Vault provider. ' +
      'Generate new keys in Key Vault for best security.'
    )
  }

  async deleteKey(keyRef: KeyReference): Promise<void> {
    const keyClient = await this.getKeyClient()

    try {
      await keyClient.deleteKey(keyRef.id)
      this.keyCache.delete(keyRef.id)
      this.cryptoClients.delete(keyRef.id)
    } catch (error) {
      throw new Error(
        `Failed to delete Key Vault key: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // ==========================================================================
  // Cryptographic Operations
  // ==========================================================================

  async sign(keyRef: KeyReference, data: Uint8Array): Promise<SignResult> {
    const cryptoClient = await this.getCryptoClient(keyRef.id)
    const algorithm = this.getSignAlgorithm(keyRef.algorithm)

    try {
      // Azure requires hashed input for some algorithms
      const result = await cryptoClient.sign(algorithm, data)

      return {
        signature: new Uint8Array(result.result),
        algorithm: keyRef.algorithm,
        keyReference: keyRef,
        timestamp: new Date()
      }
    } catch (error) {
      throw new Error(
        `Failed to sign with Key Vault: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async verify(
    keyRef: KeyReference,
    signature: Uint8Array,
    data: Uint8Array
  ): Promise<boolean> {
    const cryptoClient = await this.getCryptoClient(keyRef.id)
    const algorithm = this.getSignAlgorithm(keyRef.algorithm)

    try {
      const result = await cryptoClient.verify(algorithm, data, signature)
      return result.result
    } catch {
      return false
    }
  }

  async encrypt(keyRef: KeyReference, plaintext: Uint8Array): Promise<EncryptResult> {
    const cryptoClient = await this.getCryptoClient(keyRef.id)

    try {
      const result = await cryptoClient.encrypt('RSA-OAEP', plaintext)

      return {
        ciphertext: new Uint8Array(result.result),
        keyReference: keyRef
      }
    } catch (error) {
      throw new Error(
        `Failed to encrypt with Key Vault: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async decrypt(
    keyRef: KeyReference,
    ciphertext: Uint8Array,
    _iv?: Uint8Array,
    _tag?: Uint8Array
  ): Promise<Uint8Array> {
    const cryptoClient = await this.getCryptoClient(keyRef.id)

    try {
      const result = await cryptoClient.decrypt('RSA-OAEP', ciphertext)
      return new Uint8Array(result.result)
    } catch (error) {
      throw new Error(
        `Failed to decrypt with Key Vault: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async deriveKey(
    _keyRef: KeyReference,
    _peerPublicKey: Uint8Array
  ): Promise<{ keyReference: KeyReference; sharedSecret?: Uint8Array }> {
    // Azure Key Vault doesn't directly support ECDH in the standard way
    throw new Error('Key derivation not supported by Azure Key Vault provider')
  }

  // ==========================================================================
  // Provider Capabilities
  // ==========================================================================

  isHSMBacked(): boolean {
    return true
  }

  supportsAlgorithm(algorithm: KeyAlgorithm): boolean {
    return ['ed25519', 'secp256k1', 'aes-256-gcm'].includes(algorithm)
  }

  supportsKeyImport(): boolean {
    return false // Disabled for security
  }

  async getKeyInfo(keyRef: KeyReference): Promise<KeyInfo> {
    const keyClient = await this.getKeyClient()

    try {
      const key = await keyClient.getKey(keyRef.id)

      return {
        id: keyRef.id,
        algorithm: keyRef.algorithm,
        provider: 'azure-kv',
        hsmBacked: true,
        extractable: false,
        createdAt: new Date(),
        usage: (key as any).keyOperations || ['sign', 'verify'],
        metadata: {
          keyId: key.key.kid
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to get key info: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private generateKeyName(): string {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return `idiomark-${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}`
  }

  private getKeyType(algorithm: KeyAlgorithm): string {
    switch (algorithm) {
      case 'ed25519':
        return 'EC' // Azure uses EC for Ed25519
      case 'secp256k1':
        return 'EC'
      case 'aes-256-gcm':
        return 'oct' // Symmetric key
      default:
        return 'EC'
    }
  }

  private mapUsageToKeyOps(usage: KeyUsage[]): string[] {
    const ops: string[] = []

    if (usage.includes('sign')) ops.push('sign')
    if (usage.includes('verify')) ops.push('verify')
    if (usage.includes('encrypt')) ops.push('encrypt')
    if (usage.includes('decrypt')) ops.push('decrypt')
    if (usage.includes('deriveKey')) ops.push('deriveKey')

    return ops
  }

  private getSignAlgorithm(algorithm: KeyAlgorithm): string {
    switch (algorithm) {
      case 'ed25519':
        return 'ES256K' // ECDSA with secp256k1
      case 'secp256k1':
        return 'ES256K'
      default:
        return 'ES256'
    }
  }
}
