/**
 * Emergency-Data Schema Tests (Section 14)
 *
 * Tests for emergency response data with strict access control
 */

import { describe, it, expect } from 'vitest'
import { validateEmergencyAccess, type EmergencyDataSection } from '../types-mcl'

describe('Emergency-Data', () => {
  describe('Access Control', () => {
    it('should only allow emergency service readers', () => {
      const emergencyData: EmergencyDataSection = {
        medical: {
          blood_type: 'O+',
          allergies: ['penicillin'],
          conditions: ['asthma'],
          medications: [],
          organ_donor: true
        },
        permissions: {
          allowed_readers: ['EMERGENCY_SERVICE'],
          require_auth_token: true,
          expire_after_seconds: 3600
        }
      }

      const result = validateEmergencyAccess(emergencyData, 'SERVICE_ROBOT')
      expect(result.allowed).toBe(false)
    })

    it('should allow emergency service readers', () => {
      const emergencyData: EmergencyDataSection = {
        medical: {
          blood_type: 'O+'
        },
        permissions: {
          allowed_readers: ['EMERGENCY_SERVICE'],
          require_auth_token: true
        }
      }

      const result = validateEmergencyAccess(emergencyData, 'EMERGENCY_SERVICE')
      expect(result.allowed).toBe(true)
    })

    it('should deny access when reader type not in allowed list', () => {
      const emergencyData: EmergencyDataSection = {
        medical: {
          blood_type: 'A-'
        },
        permissions: {
          allowed_readers: ['EMERGENCY_SERVICE'],
          require_auth_token: false
        }
      }

      const result = validateEmergencyAccess(emergencyData, 'GENERAL_HEALTHCARE')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('GENERAL_HEALTHCARE')
    })

    it('should provide reason when access is denied', () => {
      const emergencyData: EmergencyDataSection = {
        medical: {
          blood_type: 'B+'
        },
        permissions: {
          allowed_readers: ['EMERGENCY_SERVICE', 'PARAMEDIC'],
          require_auth_token: true
        }
      }

      const result = validateEmergencyAccess(emergencyData, 'INSURANCE_BOT')
      expect(result.allowed).toBe(false)
      expect(result.reason).toBeDefined()
      expect(result.reason).toContain('INSURANCE_BOT')
    })
  })

  describe('Multiple Allowed Readers', () => {
    it('should allow access for any reader in allowed list', () => {
      const emergencyData: EmergencyDataSection = {
        medical: {
          blood_type: 'O-'
        },
        permissions: {
          allowed_readers: ['EMERGENCY_SERVICE', 'PARAMEDIC', 'HOSPITAL_SYSTEM'],
          require_auth_token: true
        }
      }

      const paramedicResult = validateEmergencyAccess(emergencyData, 'PARAMEDIC')
      expect(paramedicResult.allowed).toBe(true)

      const hospitalResult = validateEmergencyAccess(emergencyData, 'HOSPITAL_SYSTEM')
      expect(hospitalResult.allowed).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should deny access when allowed_readers is empty', () => {
      const emergencyData: EmergencyDataSection = {
        medical: {
          blood_type: 'AB+'
        },
        permissions: {
          allowed_readers: [],
          require_auth_token: false
        }
      }

      const result = validateEmergencyAccess(emergencyData, 'EMERGENCY_SERVICE')
      expect(result.allowed).toBe(false)
    })

    it('should handle minimal medical data', () => {
      const emergencyData: EmergencyDataSection = {
        medical: {
          blood_type: 'O+'
        },
        permissions: {
          allowed_readers: ['EMERGENCY_SERVICE'],
          require_auth_token: false
        }
      }

      const result = validateEmergencyAccess(emergencyData, 'EMERGENCY_SERVICE')
      expect(result.allowed).toBe(true)
    })
  })

  describe('Identity Information', () => {
    it('should validate emergency data with identity information', () => {
      const emergencyData: EmergencyDataSection = {
        medical: {
          blood_type: 'O+',
          allergies: ['penicillin'],
          conditions: ['diabetes'],
          medications: [
            { name: 'Metformin', dosage: '500mg', frequency: 'twice daily' }
          ],
          organ_donor: false
        },
        identity: {
          full_name: 'John Doe',
          date_of_birth: '1985-03-15',
          emergency_contacts: [
            { name: 'Jane Doe', relationship: 'spouse', phone: '555-1234' }
          ]
        },
        permissions: {
          allowed_readers: ['EMERGENCY_SERVICE'],
          require_auth_token: true,
          expire_after_seconds: 1800
        }
      }

      const result = validateEmergencyAccess(emergencyData, 'EMERGENCY_SERVICE')
      expect(result.allowed).toBe(true)
    })
  })
})
