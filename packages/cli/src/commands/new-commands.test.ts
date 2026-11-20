import { describe, it, expect } from 'vitest'
import { clone } from './clone'
import { become } from './become'
import { whoami } from './whoami'
import { doctor } from './doctor'
import { diff } from './diff'
import { merge } from './merge'

describe('New CLI Commands', () => {
  describe('clone', () => {
    it('should export clone function', () => {
      expect(clone).toBeInstanceOf(Function)
    })
  })

  describe('become', () => {
    it('should export become function', () => {
      expect(become).toBeInstanceOf(Function)
    })
  })

  describe('whoami', () => {
    it('should export whoami function', () => {
      expect(whoami).toBeInstanceOf(Function)
    })
  })

  describe('doctor', () => {
    it('should export doctor function', () => {
      expect(doctor).toBeInstanceOf(Function)
    })
  })

  describe('diff', () => {
    it('should export diff function', () => {
      expect(diff).toBeInstanceOf(Function)
    })
  })

  describe('merge', () => {
    it('should export merge function', () => {
      expect(merge).toBeInstanceOf(Function)
    })
  })
})
