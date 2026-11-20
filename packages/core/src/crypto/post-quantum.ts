/**
 * Post-Quantum Cryptography Types
 *
 * Type definitions and placeholder functions for future post-quantum
 * cryptography implementation.
 *
 * Supported algorithms (NIST FIPS standardized):
 * - ML-KEM (FIPS 203, formerly Kyber) for key encapsulation
 * - ML-DSA (FIPS 204, formerly Dilithium) for digital signatures
 * - SLH-DSA (FIPS 205, formerly SPHINCS+) for hash-based signatures
 *
 * @module @idiomark/core/crypto/post-quantum
 */

// ============================================================================
// Algorithm Type Definitions
// ============================================================================

/**
 * ML-KEM algorithm variants (FIPS 203, formerly Kyber)
 * Key Encapsulation Mechanism for establishing shared secrets
 */
export type MLKEMVariant = 'ml-kem-512' | 'ml-kem-768' | 'ml-kem-1024'

/**
 * ML-DSA algorithm variants (FIPS 204, formerly Dilithium)
 * Lattice-based digital signatures
 */
export type MLDSAVariant = 'ml-dsa-44' | 'ml-dsa-65' | 'ml-dsa-87'

/**
 * SLH-DSA algorithm variants (FIPS 205, formerly SPHINCS+)
 * Hash-based digital signatures (stateless)
 *
 * Naming convention: slh-dsa-{param}[-fast|small]
 * - 's' suffix: small signature variant
 * - 'f' suffix: fast signing variant
 */
export type SLHDSAVariant =
  | 'slh-dsa-shake-128s'
  | 'slh-dsa-shake-128f'
  | 'slh-dsa-shake-192s'
  | 'slh-dsa-shake-192f'
  | 'slh-dsa-shake-256s'
  | 'slh-dsa-shake-256f'
  | 'slh-dsa-sha2-128s'
  | 'slh-dsa-sha2-128f'
  | 'slh-dsa-sha2-192s'
  | 'slh-dsa-sha2-192f'
  | 'slh-dsa-sha2-256s'
  | 'slh-dsa-sha2-256f'

/**
 * All supported post-quantum algorithms
 */
export type PostQuantumAlgorithm = MLKEMVariant | MLDSAVariant | SLHDSAVariant

/**
 * Key encapsulation algorithm types
 */
export type KeyEncapsulationAlgorithm = MLKEMVariant

/**
 * Digital signature algorithm types
 */
export type DigitalSignatureAlgorithm = MLDSAVariant | SLHDSAVariant

// ============================================================================
// ML-KEM Types (FIPS 203, formerly Kyber)
// ============================================================================

/**
 * ML-KEM key pair for key encapsulation
 *
 * Key sizes by variant:
 * - ml-kem-512: publicKey=800, secretKey=1632
 * - ml-kem-768: publicKey=1184, secretKey=2400
 * - ml-kem-1024: publicKey=1568, secretKey=3168
 */
export interface MLKEMKeyPair {
  /** Public key (800/1184/1568 bytes for 512/768/1024) */
  publicKey: Uint8Array
  /** Secret key (1632/2400/3168 bytes) */
  secretKey: Uint8Array
  /** Algorithm variant used */
  variant: MLKEMVariant
}

/**
 * ML-KEM encapsulation result
 *
 * Ciphertext sizes by variant:
 * - ml-kem-512: 768 bytes
 * - ml-kem-768: 1088 bytes
 * - ml-kem-1024: 1568 bytes
 *
 * Shared secret is always 32 bytes
 */
export interface MLKEMEncapsulation {
  /** Ciphertext containing the encapsulated key (768/1088/1568 bytes) */
  ciphertext: Uint8Array
  /** Shared secret derived from encapsulation (always 32 bytes) */
  sharedSecret: Uint8Array
}

/**
 * ML-KEM decapsulation result
 */
export interface MLKEMDecapsulation {
  /** Shared secret (always 32 bytes) */
  sharedSecret: Uint8Array
}

// ============================================================================
// ML-DSA Types (FIPS 204, formerly Dilithium)
// ============================================================================

/**
 * ML-DSA key pair for digital signatures
 *
 * Key sizes by variant:
 * - ml-dsa-44: publicKey=1312, secretKey=2560
 * - ml-dsa-65: publicKey=1952, secretKey=4032
 * - ml-dsa-87: publicKey=2592, secretKey=4896
 */
export interface MLDSAKeyPair {
  /** Public key (1312/1952/2592 bytes for 44/65/87) */
  publicKey: Uint8Array
  /** Secret key (2560/4032/4896 bytes) */
  secretKey: Uint8Array
  /** Algorithm variant used */
  variant: MLDSAVariant
}

/**
 * ML-DSA signature result
 *
 * Signature sizes by variant:
 * - ml-dsa-44: 2420 bytes
 * - ml-dsa-65: 3293 bytes
 * - ml-dsa-87: 4595 bytes
 */
export interface MLDSASignature {
  /** Digital signature bytes */
  signature: Uint8Array
  /** Original message that was signed */
  message: Uint8Array
  /** Signer's public key for verification */
  signerPublicKey: Uint8Array
  /** Algorithm variant used */
  variant: MLDSAVariant
}

/**
 * ML-DSA signing options
 */
export interface MLDSASignOptions {
  /** Context string for domain separation (max 255 bytes) */
  context?: Uint8Array
  /** Pre-hashed message (if using external hashing) */
  prehashed?: boolean
}

/**
 * ML-DSA verification result
 */
export interface MLDSAVerification {
  /** Whether the signature is valid */
  valid: boolean
  /** Original message */
  message: Uint8Array
  /** Signer's public key */
  signerPublicKey: Uint8Array
}

// ============================================================================
// SLH-DSA Types (FIPS 205, formerly SPHINCS+)
// ============================================================================

/**
 * SLH-DSA key pair for hash-based digital signatures
 *
 * Key sizes (all variants):
 * - slh-dsa-sha2-128*: publicKey=32, secretKey=64
 * - slh-dsa-sha2-192*: publicKey=48, secretKey=96
 * - slh-dsa-sha2-256*: publicKey=64, secretKey=128
 * - slh-dsa-shake-128*: publicKey=32, secretKey=64
 * - slh-dsa-shake-192*: publicKey=48, secretKey=96
 * - slh-dsa-shake-256*: publicKey=64, secretKey=128
 */
export interface SLHDSAKeyPair {
  /** Public key (32/48/64 bytes) */
  publicKey: Uint8Array
  /** Secret key (64/96/128 bytes) */
  secretKey: Uint8Array
  /** Algorithm variant used */
  variant: SLHDSAVariant
}

/**
 * SLH-DSA signature result
 *
 * Signature sizes vary significantly by variant:
 * - 's' (small) variants: 7856-29792 bytes
 * - 'f' (fast) variants: 17088-49856 bytes
 */
export interface SLHDSASignature {
  /** Digital signature bytes (large, hash-based) */
  signature: Uint8Array
  /** Original message that was signed */
  message: Uint8Array
  /** Signer's public key for verification */
  signerPublicKey: Uint8Array
  /** Algorithm variant used */
  variant: SLHDSAVariant
}

/**
 * SLH-DSA verification result
 */
export interface SLHDSAVerification {
  /** Whether the signature is valid */
  valid: boolean
  /** Original message */
  message: Uint8Array
  /** Signer's public key */
  signerPublicKey: Uint8Array
}

// ============================================================================
// Generic Post-Quantum Types
// ============================================================================

/**
 * Generic post-quantum key pair (algorithm-agnostic)
 */
export interface PostQuantumKeyPair {
  /** Public key for sharing */
  publicKey: Uint8Array
  /** Secret key (must be kept private) */
  secretKey: Uint8Array
  /** Algorithm used to generate the key pair */
  algorithm: PostQuantumAlgorithm
}

/**
 * Encapsulated secret from key encapsulation mechanism
 */
export interface EncapsulatedSecret {
  /** Ciphertext containing the encapsulated key */
  ciphertext: Uint8Array
  /** Shared secret derived from encapsulation */
  sharedSecret: Uint8Array
}

// ============================================================================
// Algorithm Information Types
// ============================================================================

/**
 * Algorithm category for post-quantum crypto
 */
export type PostQuantumAlgorithmCategory =
  | 'key-encapsulation'
  | 'lattice-signature'
  | 'hash-signature'

/**
 * Detailed information about a post-quantum algorithm
 */
export interface PostQuantumAlgorithmInfo {
  /** Human-readable algorithm name */
  name: string
  /** FIPS standard number */
  fipsStandard: '203' | '204' | '205'
  /** Original name before NIST standardization */
  legacyName: string
  /** Algorithm category */
  category: PostQuantumAlgorithmCategory
  /** Classical security level in bits */
  securityLevel: number
  /** Public key size in bytes */
  publicKeySize: number
  /** Secret key size in bytes */
  secretKeySize: number
  /** Ciphertext size for KEM algorithms (bytes) */
  ciphertextSize?: number
  /** Signature size for signature algorithms (bytes) */
  signatureSize?: number
  /** Shared secret size for KEM algorithms (bytes) */
  sharedSecretSize?: number
  /** NIST security level (1, 2, 3, 4, 5) */
  nistLevel: 1 | 2 | 3 | 4 | 5
  /** Description of the algorithm */
  description: string
}

// ============================================================================
// Algorithm Information Constants
// ============================================================================

/**
 * Detailed information about all supported post-quantum algorithms
 */
export const PQ_ALGORITHMS: Record<PostQuantumAlgorithm, PostQuantumAlgorithmInfo> = {
  // ML-KEM variants (FIPS 203, formerly Kyber)
  'ml-kem-512': {
    name: 'ML-KEM-512',
    fipsStandard: '203',
    legacyName: 'Kyber-512',
    category: 'key-encapsulation',
    securityLevel: 128,
    publicKeySize: 800,
    secretKeySize: 1632,
    ciphertextSize: 768,
    sharedSecretSize: 32,
    nistLevel: 1,
    description: 'ML-KEM with 512-bit polynomial dimension. Fastest variant, suitable for high-performance applications with moderate security requirements.'
  },
  'ml-kem-768': {
    name: 'ML-KEM-768',
    fipsStandard: '203',
    legacyName: 'Kyber-768',
    category: 'key-encapsulation',
    securityLevel: 192,
    publicKeySize: 1184,
    secretKeySize: 2400,
    ciphertextSize: 1088,
    sharedSecretSize: 32,
    nistLevel: 3,
    description: 'ML-KEM with 768-bit polynomial dimension. Balanced security and performance, recommended for most applications.'
  },
  'ml-kem-1024': {
    name: 'ML-KEM-1024',
    fipsStandard: '203',
    legacyName: 'Kyber-1024',
    category: 'key-encapsulation',
    securityLevel: 256,
    publicKeySize: 1568,
    secretKeySize: 3168,
    ciphertextSize: 1568,
    sharedSecretSize: 32,
    nistLevel: 5,
    description: 'ML-KEM with 1024-bit polynomial dimension. Highest security level, larger keys and ciphertext.'
  },

  // ML-DSA variants (FIPS 204, formerly Dilithium)
  'ml-dsa-44': {
    name: 'ML-DSA-44',
    fipsStandard: '204',
    legacyName: 'Dilithium2',
    category: 'lattice-signature',
    securityLevel: 128,
    publicKeySize: 1312,
    secretKeySize: 2560,
    signatureSize: 2420,
    nistLevel: 2,
    description: 'ML-DSA with smallest parameter set. Recommended for applications requiring smaller signatures with 128-bit security.'
  },
  'ml-dsa-65': {
    name: 'ML-DSA-65',
    fipsStandard: '204',
    legacyName: 'Dilithium3',
    category: 'lattice-signature',
    securityLevel: 192,
    publicKeySize: 1952,
    secretKeySize: 4032,
    signatureSize: 3293,
    nistLevel: 3,
    description: 'ML-DSA with medium parameter set. Balanced choice for most signature applications with 192-bit security.'
  },
  'ml-dsa-87': {
    name: 'ML-DSA-87',
    fipsStandard: '204',
    legacyName: 'Dilithium5',
    category: 'lattice-signature',
    securityLevel: 256,
    publicKeySize: 2592,
    secretKeySize: 4896,
    signatureSize: 4595,
    nistLevel: 5,
    description: 'ML-DSA with largest parameter set. Highest security level at 256-bit, with larger keys and signatures.'
  },

  // SLH-DSA SHA2 variants (FIPS 205, formerly SPHINCS+)
  'slh-dsa-sha2-128s': {
    name: 'SLH-DSA-SHA2-128s',
    fipsStandard: '205',
    legacyName: 'SPHINCS+-SHA2-128s-simple',
    category: 'hash-signature',
    securityLevel: 128,
    publicKeySize: 32,
    secretKeySize: 64,
    signatureSize: 7856,
    nistLevel: 1,
    description: 'SLH-DSA with SHA-256, small signature variant. Compact signatures but slower signing.'
  },
  'slh-dsa-sha2-128f': {
    name: 'SLH-DSA-SHA2-128f',
    fipsStandard: '205',
    legacyName: 'SPHINCS+-SHA2-128f-simple',
    category: 'hash-signature',
    securityLevel: 128,
    publicKeySize: 32,
    secretKeySize: 64,
    signatureSize: 17088,
    nistLevel: 1,
    description: 'SLH-DSA with SHA-256, fast variant. Faster signing but larger signatures.'
  },
  'slh-dsa-sha2-192s': {
    name: 'SLH-DSA-SHA2-192s',
    fipsStandard: '205',
    legacyName: 'SPHINCS+-SHA2-192s-simple',
    category: 'hash-signature',
    securityLevel: 192,
    publicKeySize: 48,
    secretKeySize: 96,
    signatureSize: 16224,
    nistLevel: 3,
    description: 'SLH-DSA with SHA-512/256, small signature variant at 192-bit security.'
  },
  'slh-dsa-sha2-192f': {
    name: 'SLH-DSA-SHA2-192f',
    fipsStandard: '205',
    legacyName: 'SPHINCS+-SHA2-192f-simple',
    category: 'hash-signature',
    securityLevel: 192,
    publicKeySize: 48,
    secretKeySize: 96,
    signatureSize: 35664,
    nistLevel: 3,
    description: 'SLH-DSA with SHA-512/256, fast variant at 192-bit security.'
  },
  'slh-dsa-sha2-256s': {
    name: 'SLH-DSA-SHA2-256s',
    fipsStandard: '205',
    legacyName: 'SPHINCS+-SHA2-256s-simple',
    category: 'hash-signature',
    securityLevel: 256,
    publicKeySize: 64,
    secretKeySize: 128,
    signatureSize: 29792,
    nistLevel: 5,
    description: 'SLH-DSA with SHA-512, small signature variant at 256-bit security.'
  },
  'slh-dsa-sha2-256f': {
    name: 'SLH-DSA-SHA2-256f',
    fipsStandard: '205',
    legacyName: 'SPHINCS+-SHA2-256f-simple',
    category: 'hash-signature',
    securityLevel: 256,
    publicKeySize: 64,
    secretKeySize: 128,
    signatureSize: 49856,
    nistLevel: 5,
    description: 'SLH-DSA with SHA-512, fast variant at 256-bit security. Largest signatures.'
  },

  // SLH-DSA SHAKE variants (FIPS 205, formerly SPHINCS+)
  'slh-dsa-shake-128s': {
    name: 'SLH-DSA-SHAKE-128s',
    fipsStandard: '205',
    legacyName: 'SPHINCS+-SHAKE-128s-simple',
    category: 'hash-signature',
    securityLevel: 128,
    publicKeySize: 32,
    secretKeySize: 64,
    signatureSize: 7856,
    nistLevel: 1,
    description: 'SLH-DSA with SHAKE128, small signature variant. Uses extendable-output function.'
  },
  'slh-dsa-shake-128f': {
    name: 'SLH-DSA-SHAKE-128f',
    fipsStandard: '205',
    legacyName: 'SPHINCS+-SHAKE-128f-simple',
    category: 'hash-signature',
    securityLevel: 128,
    publicKeySize: 32,
    secretKeySize: 64,
    signatureSize: 17088,
    nistLevel: 1,
    description: 'SLH-DSA with SHAKE128, fast variant. Uses extendable-output function.'
  },
  'slh-dsa-shake-192s': {
    name: 'SLH-DSA-SHAKE-192s',
    fipsStandard: '205',
    legacyName: 'SPHINCS+-SHAKE-192s-simple',
    category: 'hash-signature',
    securityLevel: 192,
    publicKeySize: 48,
    secretKeySize: 96,
    signatureSize: 16224,
    nistLevel: 3,
    description: 'SLH-DSA with SHAKE256 (192-bit output), small signature variant.'
  },
  'slh-dsa-shake-192f': {
    name: 'SLH-DSA-SHAKE-192f',
    fipsStandard: '205',
    legacyName: 'SPHINCS+-SHAKE-192f-simple',
    category: 'hash-signature',
    securityLevel: 192,
    publicKeySize: 48,
    secretKeySize: 96,
    signatureSize: 35664,
    nistLevel: 3,
    description: 'SLH-DSA with SHAKE256 (192-bit output), fast variant.'
  },
  'slh-dsa-shake-256s': {
    name: 'SLH-DSA-SHAKE-256s',
    fipsStandard: '205',
    legacyName: 'SPHINCS+-SHAKE-256s-simple',
    category: 'hash-signature',
    securityLevel: 256,
    publicKeySize: 64,
    secretKeySize: 128,
    signatureSize: 29792,
    nistLevel: 5,
    description: 'SLH-DSA with SHAKE256 (256-bit output), small signature variant.'
  },
  'slh-dsa-shake-256f': {
    name: 'SLH-DSA-SHAKE-256f',
    fipsStandard: '205',
    legacyName: 'SPHINCS+-SHAKE-256f-simple',
    category: 'hash-signature',
    securityLevel: 256,
    publicKeySize: 64,
    secretKeySize: 128,
    signatureSize: 49856,
    nistLevel: 5,
    description: 'SLH-DSA with SHAKE256 (256-bit output), fast variant with largest signatures.'
  }
}

/**
 * Get algorithm information by variant name
 */
export function getAlgorithmInfo(algorithm: PostQuantumAlgorithm): PostQuantumAlgorithmInfo {
  return PQ_ALGORITHMS[algorithm]
}

/**
 * Get all algorithms of a specific category
 */
export function getAlgorithmsByCategory(
  category: PostQuantumAlgorithmCategory
): PostQuantumAlgorithm[] {
  return Object.entries(PQ_ALGORITHMS)
    .filter(([, info]) => info.category === category)
    .map(([name]) => name as PostQuantumAlgorithm)
}

/**
 * Get all algorithms at a specific NIST security level
 */
export function getAlgorithmsByNistLevel(level: 1 | 2 | 3 | 4 | 5): PostQuantumAlgorithm[] {
  return Object.entries(PQ_ALGORITHMS)
    .filter(([, info]) => info.nistLevel === level)
    .map(([name]) => name as PostQuantumAlgorithm)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if post-quantum crypto is supported
 *
 * Note: Currently returns false as implementation is pending.
 * Future implementation will use @noble/post-quantum or native WebCrypto.
 *
 * @returns boolean indicating support
 */
export function isPostQuantumSupported(): boolean {
  // Post-quantum crypto is not yet implemented
  // Will return true when @noble/post-quantum is integrated
  return false
}

/**
 * Get list of supported post-quantum algorithms
 *
 * @returns Array of algorithm names that could be supported
 */
export function getSupportedAlgorithms(): PostQuantumAlgorithm[] {
  return Object.keys(PQ_ALGORITHMS) as PostQuantumAlgorithm[]
}

/**
 * Get list of ML-KEM variants
 */
export function getMLKEMVariants(): MLKEMVariant[] {
  return ['ml-kem-512', 'ml-kem-768', 'ml-kem-1024']
}

/**
 * Get list of ML-DSA variants
 */
export function getMLDSAVariants(): MLDSAVariant[] {
  return ['ml-dsa-44', 'ml-dsa-65', 'ml-dsa-87']
}

/**
 * Get list of SLH-DSA variants
 */
export function getSLHDSAVariants(): SLHDSAVariant[] {
  return [
    'slh-dsa-sha2-128s',
    'slh-dsa-sha2-128f',
    'slh-dsa-sha2-192s',
    'slh-dsa-sha2-192f',
    'slh-dsa-sha2-256s',
    'slh-dsa-sha2-256f',
    'slh-dsa-shake-128s',
    'slh-dsa-shake-128f',
    'slh-dsa-shake-192s',
    'slh-dsa-shake-192f',
    'slh-dsa-shake-256s',
    'slh-dsa-shake-256f'
  ]
}

/**
 * Check if an algorithm is a key encapsulation mechanism
 */
export function isKEMAlgorithm(algorithm: PostQuantumAlgorithm): algorithm is MLKEMVariant {
  return getMLKEMVariants().includes(algorithm as MLKEMVariant)
}

/**
 * Check if an algorithm is a digital signature algorithm
 */
export function isSignatureAlgorithm(algorithm: PostQuantumAlgorithm): algorithm is DigitalSignatureAlgorithm {
  return (
    getMLDSAVariants().includes(algorithm as MLDSAVariant) ||
    getSLHDSAVariants().includes(algorithm as SLHDSAVariant)
  )
}

/**
 * Check if an algorithm is a lattice-based signature
 */
export function isLatticeSignature(algorithm: PostQuantumAlgorithm): algorithm is MLDSAVariant {
  return getMLDSAVariants().includes(algorithm as MLDSAVariant)
}

/**
 * Check if an algorithm is a hash-based signature
 */
export function isHashSignature(algorithm: PostQuantumAlgorithm): algorithm is SLHDSAVariant {
  return getSLHDSAVariants().includes(algorithm as SLHDSAVariant)
}

// ============================================================================
// Future Implementation Placeholders (not exported until implemented)
// ============================================================================

/**
 * Generate a post-quantum key pair (future implementation)
 *
 * @param _algorithm - The post-quantum algorithm to use
 * @returns Promise resolving to key pair
 */
// export async function generatePostQuantumKeyPair(
//   algorithm: PostQuantumAlgorithm
// ): Promise<PostQuantumKeyPair> {
//   // Implementation using @noble/post-quantum
//   throw new Error('Post-quantum crypto not yet implemented')
// }

/**
 * Encapsulate a shared secret using ML-KEM (future implementation)
 *
 * @param _publicKey - The recipient's public key
 * @returns Promise resolving to encapsulated secret
 */
// export async function encapsulateSecret(
//   publicKey: Uint8Array
// ): Promise<EncapsulatedSecret> {
//   throw new Error('Post-quantum crypto not yet implemented')
// }

/**
 * Decapsulate a shared secret using ML-KEM (future implementation)
 *
 * @param _ciphertext - The encapsulated ciphertext
 * @param _secretKey - The recipient's secret key
 * @returns Promise resolving to shared secret
 */
// export async function decapsulateSecret(
//   ciphertext: Uint8Array,
//   secretKey: Uint8Array
// ): Promise<Uint8Array> {
//   throw new Error('Post-quantum crypto not yet implemented')
// }

/**
 * Sign a message using ML-DSA (future implementation)
 *
 * @param _message - Message to sign
 * @param _secretKey - Signer's secret key
 * @returns Promise resolving to signature
 */
// export async function postQuantumSign(
//   message: Uint8Array,
//   secretKey: Uint8Array
// ): Promise<Uint8Array> {
//   throw new Error('Post-quantum crypto not yet implemented')
// }

/**
 * Verify a signature using ML-DSA (future implementation)
 *
 * @param _message - Original message
 * @param _signature - Signature to verify
 * @param _publicKey - Signer's public key
 * @returns Promise resolving to boolean
 */
// export async function postQuantumVerify(
//   message: Uint8Array,
//   signature: Uint8Array,
//   publicKey: Uint8Array
// ): Promise<boolean> {
//   throw new Error('Post-quantum crypto not yet implemented')
// }
