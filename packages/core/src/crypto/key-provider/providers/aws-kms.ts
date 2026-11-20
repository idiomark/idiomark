/**
 * AWS KMS Key Provider
 *
 * Provider for AWS Key Management Service (KMS).
 * AWS KMS provides FIPS 140-2 Level 2 compliant HSM-backed key management.
 *
 * Costs:
 * - ~$1/month per key
 * - ~$0.03 per 10,000 API requests
 * - Free tier: 20,000 requests/month for first 12 months
 *
 * Setup:
 * 1. Create KMS key in AWS Console or via CLI
 * 2. Set environment variables:
 *    - AWS_KMS_REGION=us-east-1
 *    - AWS_KMS_KEY_ALIAS=alias/idiomark-identity
 *    - AWS_ACCESS_KEY_ID=your-access-key
 *    - AWS_SECRET_ACCESS_KEY=your-secret-key
 *
 * @module @idiomark/core/crypto/key-provider/providers/aws-kms
 */

import type {
  KeyProvider,
  KeyReference,
  KeyAlgorithm,
  KeyUsage,
  KeyInfo,
  SignResult,
  EncryptResult,
  AWSKMSConfig,
  ProviderType
} from '../types.js'

// ============================================================================
// AWS SDK Types (lazy-loaded)
// ============================================================================

interface KMSClient {
  send(command: unknown): Promise<unknown>
}

interface SignCommandInput {
  KeyId: string
  Message: Uint8Array | Buffer
  MessageType: 'RAW' | 'DIGEST'
  SigningAlgorithm: string
}

interface VerifyCommandInput {
  KeyId: string
  Message: Uint8Array | Buffer
  MessageType: 'RAW' | 'DIGEST'
  Signature: Uint8Array | Buffer
  SigningAlgorithm: string
}

interface GetPublicKeyCommandInput {
  KeyId: string
}

// ============================================================================
// AWS KMS Provider Implementation
// ============================================================================

/**
 * AWS KMS provider for HSM-backed cryptographic operations
 *
 * Uses AWS KMS for signing and encryption. Keys are generated and stored
 * in AWS HSMs and never leave AWS infrastructure.
 *
 * @example
 * ```ts
 * const provider = new AWSKMSProvider({
 *   region: 'us-east-1',
 *   keyAlias: 'alias/idiomark-identity'
 * })
 *
 * const keyRef = await provider.generateKey('ed25519', ['sign', 'verify'])
 * const signature = await provider.sign(keyRef, data)
 * ```
 */
export class AWSKMSProvider implements KeyProvider {
  readonly name: ProviderType = 'aws-kms'

  private config: Required<Omit<AWSKMSConfig, 'accessKeyId' | 'secretAccessKey'>> & {
    accessKeyId?: string
    secretAccessKey?: string
  }
  private kmsClient: KMSClient | null = null
  private keyCache = new Map<string, {
    keyId: string
    keyArn: string
    algorithm: KeyAlgorithm
    publicKey?: Uint8Array
  }>()

  constructor(config: AWSKMSConfig = {}) {
    this.config = {
      region: config.region ?? 'us-east-1',
      keyAlias: config.keyAlias ?? 'alias/idiomark-default',
      keyId: config.keyId ?? '',
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  private async getClient(): Promise<KMSClient> {
    if (this.kmsClient) return this.kmsClient

    try {
      // Dynamic import to avoid bundling if not used
      const { KMSClient: KMS } = await import('@aws-sdk/client-kms')

      const clientConfig: {
        region: string
        credentials?: { accessKeyId: string; secretAccessKey: string }
      } = {
        region: this.config.region
      }

      if (this.config.accessKeyId && this.config.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey
        }
      }

      this.kmsClient = new KMS(clientConfig as any)
      return this.kmsClient
    } catch (error) {
      throw new Error(
        `Failed to load AWS KMS client. ` +
        `Install: npm install @aws-sdk/client-kms\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // ==========================================================================
  // Key Lifecycle
  // ==========================================================================

  async generateKey(algorithm: KeyAlgorithm, usage: KeyUsage[]): Promise<KeyReference> {
    const client = await this.getClient()

    // Determine key spec based on algorithm
    const keySpec = this.getKeySpec(algorithm, usage)
    const keyUsage = usage.includes('encrypt') ? 'ENCRYPT_DECRYPT' : 'SIGN_VERIFY'

    try {
      const { CreateKeyCommand } = await import('@aws-sdk/client-kms')

      const response = await client.send(new CreateKeyCommand({
        Description: `Idiomark Protocol ${algorithm} key`,
        KeyUsage: keyUsage,
        KeySpec: keySpec,
        Origin: 'AWS_KMS',
        Tags: [
          { TagKey: 'Idiomark-Protocol', TagValue: 'true' },
          { TagKey: 'Algorithm', TagValue: algorithm }
        ]
      } as any)) as { KeyMetadata: { KeyId: string; Arn: string } }

      const keyId = response.KeyMetadata.KeyId
      const keyArn = response.KeyMetadata.Arn

      // Create alias for easier reference
      const { CreateAliasCommand } = await import('@aws-sdk/client-kms')
      const aliasName = `alias/idiomark-${keyId.substring(0, 8)}`

      try {
        await client.send(new CreateAliasCommand({
          AliasName: aliasName,
          TargetKeyId: keyId
        }))
      } catch {
        // Alias may already exist, ignore
      }

      // Cache key info
      this.keyCache.set(keyId, {
        keyId,
        keyArn,
        algorithm
      })

      // Get public key
      const publicKeyHex = await this.getPublicKey(keyId)

      return {
        id: keyId,
        algorithm,
        provider: 'aws-kms',
        extractable: false,
        createdAt: new Date(),
        hsmBacked: true,
        publicKeyHex,
        metadata: { keyArn, alias: aliasName }
      }
    } catch (error) {
      throw new Error(
        `Failed to generate KMS key: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async importKey(
    _key: Uint8Array,
    _algorithm: KeyAlgorithm,
    _usage: KeyUsage[]
  ): Promise<KeyReference> {
    // AWS KMS supports key import, but we disable it for security
    throw new Error(
      'Key import is disabled for AWS KMS provider. ' +
      'Generate new keys in KMS for best security. ' +
      'If you need to import keys, use AWS Console with key wrapping.'
    )
  }

  async deleteKey(keyRef: KeyReference): Promise<void> {
    const client = await this.getClient()

    try {
      const { ScheduleKeyDeletionCommand } = await import('@aws-sdk/client-kms')

      // Schedule deletion (7-day waiting period)
      await client.send(new ScheduleKeyDeletionCommand({
        KeyId: keyRef.id,
        PendingWindowInDays: 7
      }))

      this.keyCache.delete(keyRef.id)
    } catch (error) {
      throw new Error(
        `Failed to delete KMS key: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // ==========================================================================
  // Cryptographic Operations
  // ==========================================================================

  async sign(keyRef: KeyReference, data: Uint8Array): Promise<SignResult> {
    const client = await this.getClient()
    const signingAlgorithm = this.getSigningAlgorithm(keyRef.algorithm)

    try {
      const { SignCommand } = await import('@aws-sdk/client-kms')

      const response = await client.send(new SignCommand({
        KeyId: keyRef.id,
        Message: Buffer.from(data),
        MessageType: 'RAW',
        SigningAlgorithm: signingAlgorithm
      } as any)) as { Signature: Uint8Array; KeyId: string }

      return {
        signature: new Uint8Array(response.Signature),
        algorithm: keyRef.algorithm,
        keyReference: keyRef,
        timestamp: new Date()
      }
    } catch (error) {
      throw new Error(
        `Failed to sign with KMS: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async verify(
    keyRef: KeyReference,
    signature: Uint8Array,
    data: Uint8Array
  ): Promise<boolean> {
    const client = await this.getClient()
    const signingAlgorithm = this.getSigningAlgorithm(keyRef.algorithm)

    try {
      const { VerifyCommand } = await import('@aws-sdk/client-kms')

      const response = await client.send(new VerifyCommand({
        KeyId: keyRef.id,
        Message: Buffer.from(data),
        MessageType: 'RAW',
        Signature: Buffer.from(signature),
        SigningAlgorithm: signingAlgorithm
      } as any)) as { SignatureValid: boolean }

      return response.SignatureValid
    } catch {
      return false
    }
  }

  async encrypt(keyRef: KeyReference, plaintext: Uint8Array): Promise<EncryptResult> {
    const client = await this.getClient()

    try {
      const { EncryptCommand } = await import('@aws-sdk/client-kms')

      const response = await client.send(new EncryptCommand({
        KeyId: keyRef.id,
        Plaintext: Buffer.from(plaintext)
      })) as { CiphertextBlob: Uint8Array }

      return {
        ciphertext: new Uint8Array(response.CiphertextBlob),
        keyReference: keyRef
      }
    } catch (error) {
      throw new Error(
        `Failed to encrypt with KMS: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async decrypt(
    keyRef: KeyReference,
    ciphertext: Uint8Array,
    _iv?: Uint8Array,
    _tag?: Uint8Array
  ): Promise<Uint8Array> {
    const client = await this.getClient()

    try {
      const { DecryptCommand } = await import('@aws-sdk/client-kms')

      const response = await client.send(new DecryptCommand({
        KeyId: keyRef.id,
        CiphertextBlob: Buffer.from(ciphertext)
      })) as { Plaintext: Uint8Array }

      return new Uint8Array(response.Plaintext)
    } catch (error) {
      throw new Error(
        `Failed to decrypt with KMS: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async deriveKey(
    _keyRef: KeyReference,
    _peerPublicKey: Uint8Array
  ): Promise<{ keyReference: KeyReference; sharedSecret?: Uint8Array }> {
    // AWS KMS doesn't directly support ECDH key derivation in the standard way
    throw new Error('Key derivation not supported by AWS KMS provider')
  }

  // ==========================================================================
  // Provider Capabilities
  // ==========================================================================

  isHSMBacked(): boolean {
    return true
  }

  supportsAlgorithm(algorithm: KeyAlgorithm): boolean {
    // AWS KMS supports these for signing
    return ['ed25519', 'secp256k1'].includes(algorithm)
  }

  supportsKeyImport(): boolean {
    return false // Disabled for security
  }

  async getKeyInfo(keyRef: KeyReference): Promise<KeyInfo> {
    const client = await this.getClient()

    try {
      const { DescribeKeyCommand } = await import('@aws-sdk/client-kms')

      const response = await client.send(new DescribeKeyCommand({
        KeyId: keyRef.id
      })) as { KeyMetadata: { KeyId: string; Arn: string; Enabled: boolean; CreationDate: Date } }

      const publicKeyHex = await this.getPublicKey(keyRef.id)

      return {
        id: keyRef.id,
        algorithm: keyRef.algorithm,
        provider: 'aws-kms',
        hsmBacked: true,
        extractable: false,
        createdAt: response.KeyMetadata.CreationDate,
        usage: ['sign', 'verify'],
        publicKeyHex,
        metadata: {
          keyArn: response.KeyMetadata.Arn,
          enabled: response.KeyMetadata.Enabled
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

  private async getPublicKey(keyId: string): Promise<string | undefined> {
    const client = await this.getClient()

    try {
      const { GetPublicKeyCommand } = await import('@aws-sdk/client-kms')

      const response = await client.send(new GetPublicKeyCommand({
        KeyId: keyId
      })) as { PublicKey: Uint8Array }

      return Buffer.from(response.PublicKey).toString('hex')
    } catch {
      return undefined
    }
  }

  private getKeySpec(algorithm: KeyAlgorithm, usage: KeyUsage[]): string {
    const needsSigning = usage.includes('sign') || usage.includes('verify')

    if (needsSigning) {
      switch (algorithm) {
        case 'ed25519':
          return 'ECC_NIST_P256' // Note: AWS doesn't have Ed25519, use P-256
        case 'secp256k1':
          return 'ECC_SECG_P256K1'
        default:
          return 'ECC_NIST_P256'
      }
    }

    return 'AES_256'
  }

  private getSigningAlgorithm(algorithm: KeyAlgorithm): string {
    switch (algorithm) {
      case 'ed25519':
        return 'ECDSA_SHA_256' // Note: AWS doesn't have Ed25519, use ECDSA
      case 'secp256k1':
        return 'ECDSA_SHA_256'
      default:
        return 'ECDSA_SHA_256'
    }
  }
}
