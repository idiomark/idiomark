/**
 * Biometric Integration Types (Section 10)
 *
 * IMPORTANT: All biometric data is opt-in only.
 * Only cryptographic hashes are stored, never raw biometric data.
 */

import { createHash } from 'crypto';

// ============================================================================
// FACE BIOMETRICS
// ============================================================================

/**
 * Face recognition biometrics - OPT-IN ONLY
 *
 * Security: Stores only cryptographic hash of facial features,
 * never raw image data.
 */
export interface FaceBiometrics {
  /** MUST be explicitly enabled by user */
  enabled: boolean;

  /** Cryptographic hash of facial features (NOT raw image) */
  face_hash?: string;

  /** Minimum confidence for successful recognition (0.0-1.0) */
  confidence_threshold?: number;

  /** Restrict recognition to specific locations */
  allowed_locations?: string[];
}

// ============================================================================
// VOICE BIOMETRICS
// ============================================================================

/**
 * Voice recognition biometrics - OPT-IN ONLY
 *
 * Security: Stores only voice print hash, never audio recordings.
 */
export interface VoiceBiometrics {
  /** MUST be explicitly enabled by user */
  enabled: boolean;

  /** Cryptographic hash of vocal features */
  voiceprint_hash?: string;

  /** Duration to listen for verification (ms) */
  verification_duration_ms?: number;
}

// ============================================================================
// LIVE BIOMETRICS
// ============================================================================

/**
 * Live biometric metrics from wearables - OPT-IN ONLY
 *
 * SECURITY: Only accessible by medical robots and emergency services.
 */
export interface LiveBiometrics {
  /** MUST be explicitly enabled by user */
  enabled: boolean;

  /** Who can access this data - restricted list */
  accessible_by: Array<'MEDICAL_ROBOT' | 'EMERGENCY_SERVICE'>;

  /** Current live metrics */
  metrics: {
    /** Heart rate from wearable */
    heart_rate?: number;

    /** Stress level assessment */
    stress_level?: 'low' | 'medium' | 'high';

    /** Sleep quality from tracker */
    sleep_quality?: 'poor' | 'fair' | 'good';

    /** When metrics were last updated */
    last_updated?: string;

    /** Additional metrics */
    [key: string]: unknown;
  };

  /** How often robots can check for updates (seconds) */
  refresh_interval_seconds: number;
}

// ============================================================================
// BIOMETRICS SECTION
// ============================================================================

/**
 * Complete biometrics section (Section 10 of Idiomark)
 *
 * All fields are optional and require explicit opt-in.
 */
export interface BiometricsSection {
  /** Face recognition - opt-in */
  face_biometrics?: FaceBiometrics;

  /** Voice recognition - opt-in */
  voice_biometrics?: VoiceBiometrics;

  /** Live health metrics - opt-in, medical only */
  live_metrics?: LiveBiometrics;
}

// ============================================================================
// VALIDATION RESULT
// ============================================================================

/**
 * Result of biometrics validation
 */
export interface BiometricsValidationResult {
  valid: boolean;
  errors?: Record<string, string>;
}

// ============================================================================
// OPT-IN TYPE
// ============================================================================

/**
 * Generic opt-in status for biometrics
 */
export type BiometricOptIn = {
  type: 'face' | 'voice' | 'live_metrics';
  enabled: boolean;
  consent_timestamp: string;
  consent_scope?: string[];
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates a biometrics section
 *
 * @param section - Biometrics section to validate
 * @returns Validation result
 */
export function validateBiometricsSection(
  section: BiometricsSection
): BiometricsValidationResult {
  const errors: Record<string, string> = {};

  // Validate face biometrics
  if (section.face_biometrics?.enabled) {
    if (!section.face_biometrics.face_hash) {
      errors.face_hash = 'face_hash is required when face_biometrics is enabled';
    } else if (section.face_biometrics.face_hash.trim() === '') {
      errors.face_hash = 'face_hash cannot be empty';
    }

    if (section.face_biometrics.confidence_threshold !== undefined) {
      const threshold = section.face_biometrics.confidence_threshold;
      if (threshold < 0 || threshold > 1) {
        errors.confidence_threshold = 'confidence_threshold must be between 0 and 1';
      }
    }
  }

  // Validate voice biometrics
  if (section.voice_biometrics?.enabled) {
    if (!section.voice_biometrics.voiceprint_hash) {
      errors.voiceprint_hash = 'voiceprint_hash is required when voice_biometrics is enabled';
    }

    if (section.voice_biometrics.verification_duration_ms !== undefined) {
      if (section.voice_biometrics.verification_duration_ms < 1000) {
        errors.verification_duration_ms = 'verification_duration_ms must be at least 1000ms';
      }
    }
  }

  // Validate live metrics
  if (section.live_metrics?.enabled) {
    const allowedAccessors = ['MEDICAL_ROBOT', 'EMERGENCY_SERVICE'];
    const hasInvalidAccessor = section.live_metrics.accessible_by.some(
      a => !allowedAccessors.includes(a)
    );

    if (hasInvalidAccessor) {
      errors.accessible_by = 'live_metrics can only be accessed by MEDICAL_ROBOT or EMERGENCY_SERVICE';
    }

    if (section.live_metrics.refresh_interval_seconds < 10) {
      errors.refresh_interval_seconds = 'refresh_interval_seconds must be at least 10 seconds';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  };
}

// ============================================================================
// HASHING
// ============================================================================

/**
 * Creates a cryptographic hash of biometric data
 *
 * IMPORTANT: This should be called on the client side before
 * sending any biometric data to servers. Never transmit raw biometric data.
 *
 * @param data - Biometric feature data to hash
 * @returns SHA-256 hash with algorithm prefix
 */
export function hashBiometricData(data: unknown): string {
  const jsonString = JSON.stringify(data, Object.keys(data as object).sort());
  const hash = createHash('sha256').update(jsonString).digest('hex');
  return `sha256:${hash}`;
}

/**
 * Verifies biometric hash format
 */
export function isValidBiometricHash(hash: string): boolean {
  // Must start with algorithm prefix and have valid hex after
  const validPrefixes = ['sha256:', 'sha512:', 'blake2b:'];

  for (const prefix of validPrefixes) {
    if (hash.startsWith(prefix)) {
      const hexPart = hash.slice(prefix.length);
      return /^[a-f0-9]{64,128}$/.test(hexPart);
    }
  }

  return false;
}
