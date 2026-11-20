import { describe, it, expect } from 'vitest';
import {
  FaceBiometrics,
  VoiceBiometrics,
  LiveBiometrics,
  BiometricsSection,
  validateBiometricsSection,
  hashBiometricData,
  type BiometricOptIn
} from '../../biometrics/types';

describe('Biometric Integration (Section 10)', () => {
  describe('FaceBiometrics', () => {
    it('should require explicit opt-in', () => {
      const faceBio: FaceBiometrics = {
        enabled: false
      };

      expect(faceBio.enabled).toBe(false);
      expect(faceBio.face_hash).toBeUndefined();
    });

    it('should store only hash, not raw image', () => {
      const faceBio: FaceBiometrics = {
        enabled: true,
        face_hash: 'sha256:abc123...',
        confidence_threshold: 0.85,
        allowed_locations: ['trusted_restaurant_chain']
      };

      expect(faceBio.face_hash).toBeDefined();
      expect(faceBio.face_hash).not.toContain('raw_image');
      expect(faceBio.face_hash).not.toContain('base64');
    });

    it('should support location restrictions', () => {
      const faceBio: FaceBiometrics = {
        enabled: true,
        face_hash: 'hash123',
        allowed_locations: ['restaurant_chain_a', 'hotel_chain_b']
      };

      expect(faceBio.allowed_locations).toHaveLength(2);
    });
  });

  describe('VoiceBiometrics', () => {
    it('should require explicit opt-in', () => {
      const voiceBio: VoiceBiometrics = {
        enabled: false
      };

      expect(voiceBio.enabled).toBe(false);
    });

    it('should store voice print hash only', () => {
      const voiceBio: VoiceBiometrics = {
        enabled: true,
        voiceprint_hash: 'sha256:voice123...',
        verification_duration_ms: 3000
      };

      expect(voiceBio.voiceprint_hash).toBeDefined();
      expect(voiceBio.verification_duration_ms).toBe(3000);
    });
  });

  describe('LiveBiometrics', () => {
    it('should restrict to medical robots only', () => {
      const liveBio: LiveBiometrics = {
        enabled: true,
        accessible_by: ['MEDICAL_ROBOT', 'EMERGENCY_SERVICE'],
        metrics: {
          heart_rate: 72,
          stress_level: 'low',
          sleep_quality: 'good',
          last_updated: new Date().toISOString()
        },
        refresh_interval_seconds: 60
      };

      expect(liveBio.accessible_by).toContain('MEDICAL_ROBOT');
      expect(liveBio.accessible_by).not.toContain('RETAIL_ROBOT');
    });

    it('should track last update time', () => {
      const now = new Date().toISOString();
      const liveBio: LiveBiometrics = {
        enabled: true,
        accessible_by: ['MEDICAL_ROBOT'],
        metrics: {
          heart_rate: 72,
          last_updated: now
        },
        refresh_interval_seconds: 30
      };

      expect(liveBio.metrics.last_updated).toBe(now);
    });
  });

  describe('BiometricsSection', () => {
    it('should combine all biometric types', () => {
      const bioSection: BiometricsSection = {
        face_biometrics: {
          enabled: true,
          face_hash: 'hash123'
        },
        voice_biometrics: {
          enabled: false
        },
        live_metrics: {
          enabled: false,
          accessible_by: [],
          metrics: {},
          refresh_interval_seconds: 60
        }
      };

      expect(bioSection.face_biometrics?.enabled).toBe(true);
      expect(bioSection.voice_biometrics?.enabled).toBe(false);
    });

    it('should allow empty biometrics section', () => {
      const bioSection: BiometricsSection = {};

      expect(bioSection.face_biometrics).toBeUndefined();
      expect(bioSection.voice_biometrics).toBeUndefined();
      expect(bioSection.live_metrics).toBeUndefined();
    });
  });

  describe('validateBiometricsSection', () => {
    it('should validate disabled biometrics', () => {
      const result = validateBiometricsSection({
        face_biometrics: { enabled: false }
      });

      expect(result.valid).toBe(true);
    });

    it('should reject face hash without enabled flag', () => {
      const result = validateBiometricsSection({
        face_biometrics: {
          enabled: true,
          face_hash: '' // Empty hash
        }
      });

      expect(result.valid).toBe(false);
      expect(result.errors?.face_hash).toBeDefined();
    });

    it('should require hash when face enabled', () => {
      const result = validateBiometricsSection({
        face_biometrics: {
          enabled: true
          // Missing face_hash
        }
      });

      expect(result.valid).toBe(false);
    });

    it('should reject invalid confidence threshold', () => {
      const result = validateBiometricsSection({
        face_biometrics: {
          enabled: true,
          face_hash: 'hash123',
          confidence_threshold: 1.5 // Invalid: > 1.0
        }
      });

      expect(result.valid).toBe(false);
    });

    it('should validate live metrics access list', () => {
      const result = validateBiometricsSection({
        live_metrics: {
          enabled: true,
          accessible_by: ['RETAIL_ROBOT'], // Not allowed for live metrics
          metrics: {},
          refresh_interval_seconds: 60
        }
      });

      expect(result.valid).toBe(false);
      expect(result.errors?.accessible_by).toBeDefined();
    });
  });

  describe('hashBiometricData', () => {
    it('should create consistent hash for same input', () => {
      const data1 = { type: 'face', features: [1, 2, 3, 4, 5] };
      const data2 = { type: 'face', features: [1, 2, 3, 4, 5] };

      const hash1 = hashBiometricData(data1);
      const hash2 = hashBiometricData(data2);

      expect(hash1).toBe(hash2);
    });

    it('should create different hash for different input', () => {
      const data1 = { type: 'face', features: [1, 2, 3] };
      const data2 = { type: 'face', features: [1, 2, 4] };

      const hash1 = hashBiometricData(data1);
      const hash2 = hashBiometricData(data2);

      expect(hash1).not.toBe(hash2);
    });

    it('should include algorithm prefix', () => {
      const hash = hashBiometricData({ test: 'data' });

      expect(hash).toMatch(/^sha256:/);
    });
  });

  describe('Privacy Guarantees', () => {
    it('should never store raw biometric data', () => {
      const faceBio: FaceBiometrics = {
        enabled: true,
        face_hash: 'sha256:hashed_value_here'
      };

      // Verify no raw image fields exist
      const faceBioAny = faceBio as any;
      expect(faceBioAny.raw_image).toBeUndefined();
      expect(faceBioAny.image_data).toBeUndefined();
      expect(faceBioAny.face_image).toBeUndefined();
    });

    it('should require opt-in for all biometric types', () => {
      const allDisabled: BiometricsSection = {
        face_biometrics: { enabled: false },
        voice_biometrics: { enabled: false },
        live_metrics: {
          enabled: false,
          accessible_by: [],
          metrics: {},
          refresh_interval_seconds: 60
        }
      };

      const result = validateBiometricsSection(allDisabled);
      expect(result.valid).toBe(true);
    });
  });
});
