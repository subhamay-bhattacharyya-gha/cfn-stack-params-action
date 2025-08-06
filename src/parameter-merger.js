/**
 * ParameterMerger module for merging default and environment-specific parameters
 * and formatting them for CloudFormation deployment
 */
export class ParameterMerger {
  /**
   * Merges default parameters with environment-specific parameters
   * Environment parameters take precedence over default parameters for matching keys
   * 
   * @param {Object} defaultParams - Default parameters object
   * @param {Object|null} envParams - Environment-specific parameters object (can be null)
   * @returns {Object} Merged parameters object
   */
  mergeParameters(defaultParams, envParams) {
    // Validate default parameters
    if (!defaultParams || typeof defaultParams !== 'object' || Array.isArray(defaultParams)) {
      throw new Error('Default parameters must be a valid object (not an array)');
    }

    // Validate environment parameters if provided
    if (envParams !== null && envParams !== undefined && 
        (typeof envParams !== 'object' || Array.isArray(envParams))) {
      throw new Error('Environment parameters must be a valid object (not an array) or null');
    }

    try {
      // If no environment parameters, return default parameters
      if (!envParams || typeof envParams !== 'object') {
        return { ...defaultParams };
      }

      // Validate parameter keys and values
      this.validateParameterObject(defaultParams, 'default');
      this.validateParameterObject(envParams, 'environment');

      // Merge parameters with environment values overriding defaults
      return {
        ...defaultParams,
        ...envParams
      };
    } catch (error) {
      throw new Error(`Failed to merge parameters: ${error.message}`);
    }
  }

  /**
   * Formats merged parameters for CloudFormation deployment
   * Converts key-value pairs to CloudFormation parameter array format
   * 
   * @param {Object} mergedParams - Merged parameters object
   * @returns {Array} Array of CloudFormation parameter objects
   */
  formatForCloudFormation(mergedParams) {
    // Validate input parameters
    if (!mergedParams || typeof mergedParams !== 'object' || Array.isArray(mergedParams)) {
      throw new Error('Merged parameters must be a valid object (not an array)');
    }

    try {
      // Validate parameter structure before formatting
      this.validateParameterObject(mergedParams, 'merged');

      return Object.entries(mergedParams).map(([key, value]) => {
        // Validate parameter name
        if (!key || typeof key !== 'string' || key.trim() === '') {
          throw new Error(`Invalid parameter name: ${key}. Parameter names must be non-empty strings.`);
        }

        // Convert value to string, handling different types appropriately
        let stringValue;
        if (value === null || value === undefined) {
          throw new Error(`Parameter '${key}' has null or undefined value. All parameters must have valid values.`);
        } else if (typeof value === 'object') {
          // For objects and arrays, stringify them
          stringValue = JSON.stringify(value);
        } else {
          stringValue = String(value);
        }

        return {
          ParameterName: key,
          ParameterValue: stringValue
        };
      });
    } catch (error) {
      throw new Error(`Failed to format parameters for CloudFormation: ${error.message}`);
    }
  }

  /**
   * Formats merged tags for CloudFormation deployment
   * Converts key-value pairs to CloudFormation tags array format
   * 
   * @param {Object} mergedTags - Merged tags object
   * @returns {Array} Array of CloudFormation tag objects
   */
  formatTagsForCloudFormation(mergedTags) {
    // Validate input tags
    if (!mergedTags || typeof mergedTags !== 'object' || Array.isArray(mergedTags)) {
      throw new Error('Merged tags must be a valid object (not an array)');
    }

    try {
      // Validate tags structure before formatting
      this.validateTagsObject(mergedTags, 'merged');

      return Object.entries(mergedTags).map(([key, value]) => {
        // Validate tag name
        if (!key || typeof key !== 'string' || key.trim() === '') {
          throw new Error(`Invalid tag name: ${key}. Tag names must be non-empty strings.`);
        }

        // Convert value to string, handling different types appropriately
        let stringValue;
        if (value === null || value === undefined) {
          throw new Error(`Tag '${key}' has null or undefined value. All tags must have valid values.`);
        } else if (typeof value === 'object') {
          // For objects and arrays, stringify them
          stringValue = JSON.stringify(value);
        } else {
          stringValue = String(value);
        }

        return {
          Key: key,
          Value: stringValue
        };
      });
    } catch (error) {
      throw new Error(`Failed to format tags for CloudFormation: ${error.message}`);
    }
  }

  /**
   * Validates tags object structure and content
   * @param {Object} tags - Tags object to validate
   * @param {string} type - Type of tags (for error messages)
   * @throws {Error} If tags are invalid
   */
  validateTagsObject(tags, type) {
    if (!tags || typeof tags !== 'object' || Array.isArray(tags)) {
      throw new Error(`${type} tags must be a valid object`);
    }

    const keys = Object.keys(tags);
    
    // Check for reasonable number of tags (CloudFormation limit is 50)
    if (keys.length > 50) {
      throw new Error(`Too many ${type} tags (${keys.length}). Maximum supported is 50 tags.`);
    }

    // Validate each tag
    for (const key of keys) {
      // Validate tag name
      if (!key || typeof key !== 'string' || key.trim() === '') {
        throw new Error(`Invalid ${type} tag name: '${key}'. Tag names must be non-empty strings.`);
      }

      if (key.length > 128) {
        throw new Error(`${type} tag name '${key}' is too long (${key.length} characters). Maximum length is 128 characters.`);
      }

      const value = tags[key];
      
      // Validate tag value
      if (value === null || value === undefined) {
        throw new Error(`${type} tag '${key}' has null or undefined value`);
      }

      // Check value length when converted to string
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (stringValue.length > 256) {
        throw new Error(`${type} tag '${key}' value is too long (${stringValue.length} characters). Maximum length is 256 characters.`);
      }
    }
  }

  /**
   * Validates parameter object structure and content
   * @param {Object} params - Parameters object to validate
   * @param {string} type - Type of parameters (for error messages)
   * @throws {Error} If parameters are invalid
   */
  validateParameterObject(params, type) {
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
      throw new Error(`${type} parameters must be a valid object`);
    }

    const keys = Object.keys(params);
    
    // Check for reasonable number of parameters
    if (keys.length > 200) {
      throw new Error(`Too many ${type} parameters (${keys.length}). Maximum supported is 200 parameters.`);
    }

    // Validate each parameter
    for (const key of keys) {
      // Validate parameter name
      if (!key || typeof key !== 'string' || key.trim() === '') {
        throw new Error(`Invalid ${type} parameter name: '${key}'. Parameter names must be non-empty strings.`);
      }

      if (key.length > 255) {
        throw new Error(`${type} parameter name '${key}' is too long (${key.length} characters). Maximum length is 255 characters.`);
      }

      // Check for valid parameter name characters (CloudFormation compatible)
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(key)) {
        throw new Error(`${type} parameter name '${key}' contains invalid characters. Parameter names must start with a letter and contain only alphanumeric characters.`);
      }

      const value = params[key];
      
      // Validate parameter value
      if (value === null || value === undefined) {
        throw new Error(`${type} parameter '${key}' has null or undefined value`);
      }

      // Check value length when converted to string
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (stringValue.length > 4096) {
        throw new Error(`${type} parameter '${key}' value is too long (${stringValue.length} characters). Maximum length is 4096 characters.`);
      }
    }
  }
}