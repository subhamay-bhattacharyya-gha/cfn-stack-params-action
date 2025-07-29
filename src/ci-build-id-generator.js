/**
 * CiBuildIdGenerator - Generates random CI build identifiers
 * 
 * This module provides functionality to generate random lowercase alphabetic strings
 * for CI build identification purposes.
 */
export class CiBuildIdGenerator {
  /**
   * Generates a random ID string with lowercase alphabets
   * @param {number} length - Length of the random string (default: 8, range: 6-10)
   * @returns {string} Random lowercase alphabetic string
   */
  generateRandomId(length = 8) {
    // Validate input parameter
    if (typeof length !== 'number') {
      throw new Error(`Random ID length must be a number, got ${typeof length}`);
    }

    if (!Number.isInteger(length)) {
      throw new Error('Random ID length must be an integer');
    }

    if (length < 6 || length > 10) {
      throw new Error(`Random ID length must be between 6 and 10 characters, got ${length}`);
    }

    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    
    try {
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * alphabet.length);
        result += alphabet[randomIndex];
      }
    } catch (error) {
      throw new Error(`Failed to generate random ID: ${error.message}`);
    }
    
    // Validate the generated result
    if (!this.validateIdFormat(result)) {
      throw new Error(`Generated ID failed validation: ${result}`);
    }
    
    return result;
  }

  /**
   * Validates that an ID string meets the format requirements
   * @param {string} id - The ID string to validate
   * @returns {boolean} True if valid, false otherwise
   */
  validateIdFormat(id) {
    if (typeof id !== 'string') {
      return false;
    }
    
    // Check length is within range
    if (id.length < 6 || id.length > 10) {
      return false;
    }
    
    // Check contains only lowercase letters
    const lowercaseAlphabetRegex = /^[a-z]+$/;
    return lowercaseAlphabetRegex.test(id);
  }
}