import { describe, it, expect, beforeEach } from 'vitest';
import { CiBuildIdGenerator } from '../../src/ci-build-id-generator.js';

describe('CiBuildIdGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new CiBuildIdGenerator();
  });

  describe('generateRandomId', () => {
    it('should generate a random string with default length of 8', () => {
      const id = generator.generateRandomId();
      
      expect(id).toHaveLength(8);
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[a-z]+$/);
    });

    it('should generate strings with specified lengths', () => {
      expect(generator.generateRandomId(6)).toHaveLength(6);
      expect(generator.generateRandomId(7)).toHaveLength(7);
      expect(generator.generateRandomId(9)).toHaveLength(9);
      expect(generator.generateRandomId(10)).toHaveLength(10);
    });

    it('should only contain lowercase letters', () => {
      const id = generator.generateRandomId();
      expect(id).toMatch(/^[a-z]+$/);
    });

    it('should throw error for invalid length types', () => {
      expect(() => generator.generateRandomId('8')).toThrow('Random ID length must be a number, got string');
      expect(() => generator.generateRandomId(null)).toThrow('Random ID length must be a number, got object');
      expect(() => generator.generateRandomId(undefined)).toThrow('Random ID length must be a number, got undefined');
      expect(() => generator.generateRandomId({})).toThrow('Random ID length must be a number, got object');
      expect(() => generator.generateRandomId([])).toThrow('Random ID length must be a number, got object');
    });

    it('should throw error for non-integer lengths', () => {
      expect(() => generator.generateRandomId(7.5)).toThrow('Random ID length must be an integer');
      expect(() => generator.generateRandomId(8.1)).toThrow('Random ID length must be an integer');
      expect(() => generator.generateRandomId(NaN)).toThrow('Random ID length must be an integer');
      expect(() => generator.generateRandomId(Infinity)).toThrow('Random ID length must be an integer');
    });

    it('should throw error for invalid lengths', () => {
      expect(() => generator.generateRandomId(5)).toThrow('Random ID length must be between 6 and 10 characters, got 5');
      expect(() => generator.generateRandomId(11)).toThrow('Random ID length must be between 6 and 10 characters, got 11');
      expect(() => generator.generateRandomId(0)).toThrow('Random ID length must be between 6 and 10 characters, got 0');
      expect(() => generator.generateRandomId(-1)).toThrow('Random ID length must be between 6 and 10 characters, got -1');
    });

    it('should generate different strings', () => {
      const id1 = generator.generateRandomId();
      const id2 = generator.generateRandomId();
      expect(id1).not.toBe(id2);
    });

    it('should validate generated ID format', () => {
      // Mock validateIdFormat to return false to test error handling
      const originalValidate = generator.validateIdFormat;
      generator.validateIdFormat = vi.fn().mockReturnValue(false);
      
      expect(() => generator.generateRandomId()).toThrow('Generated ID failed validation');
      
      // Restore original method
      generator.validateIdFormat = originalValidate;
    });

    it('should handle generation errors gracefully', () => {
      // Mock Math.random to throw an error
      const originalRandom = Math.random;
      Math.random = vi.fn().mockImplementation(() => {
        throw new Error('Random generation failed');
      });
      
      expect(() => generator.generateRandomId()).toThrow('Failed to generate random ID: Random generation failed');
      
      // Restore original method
      Math.random = originalRandom;
    });

    it('should generate valid IDs for all supported lengths', () => {
      for (let length = 6; length <= 10; length++) {
        const id = generator.generateRandomId(length);
        expect(id).toHaveLength(length);
        expect(id).toMatch(/^[a-z]+$/);
        expect(generator.validateIdFormat(id)).toBe(true);
      }
    });
  });

  describe('validateIdFormat', () => {
    it('should return true for valid IDs', () => {
      expect(generator.validateIdFormat('abcdef')).toBe(true);
      expect(generator.validateIdFormat('abcdefghij')).toBe(true);
    });

    it('should return false for invalid lengths', () => {
      expect(generator.validateIdFormat('abcde')).toBe(false);
      expect(generator.validateIdFormat('abcdefghijk')).toBe(false);
    });

    it('should return false for uppercase letters', () => {
      expect(generator.validateIdFormat('Abcdef')).toBe(false);
      expect(generator.validateIdFormat('ABCDEF')).toBe(false);
    });

    it('should return false for numbers and special characters', () => {
      expect(generator.validateIdFormat('abc123')).toBe(false);
      expect(generator.validateIdFormat('abc-def')).toBe(false);
      expect(generator.validateIdFormat('abc_def')).toBe(false);
    });

    it('should return false for non-string inputs', () => {
      expect(generator.validateIdFormat(123)).toBe(false);
      expect(generator.validateIdFormat(null)).toBe(false);
      expect(generator.validateIdFormat(undefined)).toBe(false);
    });
  });
});