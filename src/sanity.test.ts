/**
 * Sanity tests for the library
 *
 * These tests verify that all modules can be imported correctly and
 * that the public API is properly exposed while internal utilities remain hidden.
 */

// Import using ES modules syntax
import { apiRequest, recurse, log } from './index'

// Import modules directly to verify they're the same instance
import * as apiUtils from './api-request'
import * as apiFixtures from './api-request/fixtures'
import * as recurseUtils from './recurse'
import * as recurseFixtures from './recurse/fixtures'
import * as logUtils from './log/index'
import * as logFixtures from './log/fixtures'

describe('sanity tests', () => {
  describe('API exports', () => {
    it('should properly export api-request utilities', () => {
      // Test main export function exists
      expect(typeof apiRequest).toBe('function')

      // Verify same instance as direct import
      expect(apiRequest).toBe(apiUtils.apiRequest)
    })

    it('should properly export api-request fixtures', () => {
      // Verify fixtures are exported
      expect(apiFixtures).toBeDefined()
      expect(apiFixtures.test).toBeDefined()
    })

    it('should properly export recurse utilities', () => {
      // Test main export function exists
      expect(typeof recurse).toBe('function')

      // Verify same instance as direct import
      expect(recurse).toBe(recurseUtils.recurse)
    })

    it('should properly export recurse fixtures', () => {
      // Verify fixtures are exported
      expect(recurseFixtures).toBeDefined()
      expect(recurseFixtures.test).toBeDefined()
    })

    it('should properly export log utilities', () => {
      // Test that log object exists
      expect(log).toBeDefined()

      // Test that it has all the expected methods
      expect(typeof log.info).toBe('function')
      expect(typeof log.step).toBe('function')
      expect(typeof log.success).toBe('function')
      expect(typeof log.warning).toBe('function')
      expect(typeof log.error).toBe('function')
      expect(typeof log.debug).toBe('function')

      // Verify same instance as direct import
      expect(log).toBe(logUtils.log)
    })
    it('should properly export log fixtures', () => {
      // Verify fixtures are exported
      expect(logFixtures).toBeDefined()
      expect(logFixtures.test).toBeDefined()
    })
  })

  describe('Encapsulation', () => {
    it('should not expose internal utilities in the public API', () => {
      // @ts-expect-error - We're testing that these don't exist in the exports
      expect(typeof globalThis.configureLogger).toBe('undefined')
      // @ts-expect-error - We're testing that these don't exist in the exports
      expect(typeof globalThis.getLogger).toBe('undefined')
      // @ts-expect-error - We're testing that these don't exist in the exports
      expect(typeof globalThis.consoleLogger).toBe('undefined')
    })
  })
})
