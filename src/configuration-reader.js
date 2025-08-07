import fs from 'fs/promises';
import path from 'path';

/**
 * ConfigurationReader class for reading and validating CloudFormation configuration files
 */
class ConfigurationReader {
  /**
   * Read and validate the main CloudFormation configuration file
   * @param {string} folderPath - Path to the configuration folder
   * @returns {Promise<Object>} Parsed cloudformation.json content
   * @throws {Error} If file is missing, invalid JSON, or missing required fields
   */
  async readCloudFormationConfig(folderPath) {
    // Validate input parameters
    if (!folderPath || typeof folderPath !== 'string') {
      throw new Error('Folder path must be a valid string');
    }

    const configPath = path.join(folderPath, 'cloudformation.json');
    
    try {
      // Check if file exists and is accessible
      const stats = await fs.stat(configPath);
      if (!stats.isFile()) {
        throw new Error(`CloudFormation configuration path exists but is not a file: ${configPath}`);
      }

      const configContent = await fs.readFile(configPath, 'utf8');
      
      // Check for empty file
      if (!configContent.trim()) {
        throw new Error(`CloudFormation configuration file is empty: ${configPath}`);
      }

      let config;
      try {
        config = JSON.parse(configContent);
      } catch (parseError) {
        throw new Error(`Invalid JSON format in cloudformation.json at ${configPath}: ${parseError.message}. Please check the JSON syntax.`);
      }
      
      // Validate that config is an object
      if (!config || typeof config !== 'object' || Array.isArray(config)) {
        throw new Error(`CloudFormation configuration must be a JSON object, got ${typeof config}`);
      }

      // Validate required fields
      const requiredFields = ['project', 'template', 'stack-prefix'];
      this.validateJsonStructure(config, requiredFields);
      
      return config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`CloudFormation configuration file not found: ${configPath}. Please ensure the file exists in the specified directory.`);
      } else if (error.code === 'EACCES') {
        throw new Error(`Permission denied accessing CloudFormation configuration file: ${configPath}. Please check file permissions.`);
      } else if (error.code === 'EISDIR') {
        throw new Error(`Expected file but found directory: ${configPath}. Please ensure cloudformation.json is a file, not a directory.`);
      } else if (error.message.includes('Missing required field') || 
                 error.message.includes('Invalid JSON format') ||
                 error.message.includes('must be a JSON object') ||
                 error.message.includes('is empty') ||
                 error.message.includes('must be a valid string')) {
        throw error;
      } else {
        throw new Error(`Failed to read CloudFormation configuration from ${configPath}: ${error.message}`);
      }
    }
  }

  /**
   * Read default parameters from the params subfolder
   * @param {string} folderPath - Path to the configuration folder
   * @returns {Promise<Object>} Parsed default.json content
   * @throws {Error} If file is missing or contains invalid JSON
   */
  async readDefaultParameters(folderPath) {
    // Validate input parameters
    if (!folderPath || typeof folderPath !== 'string') {
      throw new Error('Folder path must be a valid string');
    }

    const defaultParamsPath = path.join(folderPath, 'params', 'default.json');
    
    try {
      // Check if file exists and is accessible
      const stats = await fs.stat(defaultParamsPath);
      if (!stats.isFile()) {
        throw new Error(`Default parameters path exists but is not a file: ${defaultParamsPath}`);
      }

      const paramsContent = await fs.readFile(defaultParamsPath, 'utf8');
      
      // Check for empty file (empty object is valid)
      if (!paramsContent.trim()) {
        throw new Error(`Default parameters file is empty: ${defaultParamsPath}. Expected at least an empty JSON object {}.`);
      }

      let params;
      try {
        params = JSON.parse(paramsContent);
      } catch (parseError) {
        throw new Error(`Invalid JSON format in default.json at ${defaultParamsPath}: ${parseError.message}. Please check the JSON syntax.`);
      }

      // Validate that params is an object
      if (!params || typeof params !== 'object' || Array.isArray(params)) {
        throw new Error(`Default parameters must be a JSON object, got ${typeof params}`);
      }

      return params;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Default parameters file not found: ${defaultParamsPath}. Please ensure the file exists in the params subdirectory.`);
      } else if (error.code === 'EACCES') {
        throw new Error(`Permission denied accessing default parameters file: ${defaultParamsPath}. Please check file permissions.`);
      } else if (error.code === 'EISDIR') {
        throw new Error(`Expected file but found directory: ${defaultParamsPath}. Please ensure default.json is a file, not a directory.`);
      } else if (error.message.includes('Invalid JSON format') ||
                 error.message.includes('must be a JSON object') ||
                 error.message.includes('is empty') ||
                 error.message.includes('must be a valid string')) {
        throw error;
      } else {
        throw new Error(`Failed to read default parameters from ${defaultParamsPath}: ${error.message}`);
      }
    }
  }

  /**
   * Read environment-specific parameters from the params subfolder
   * @param {string} folderPath - Path to the configuration folder
   * @param {string} environment - Environment name for the parameter file
   * @returns {Promise<Object|null>} Parsed environment-specific JSON content or null if file doesn't exist
   * @throws {Error} If file contains invalid JSON
   */
  async readEnvironmentParameters(folderPath, environment) {
    // Validate input parameters
    if (!folderPath || typeof folderPath !== 'string') {
      throw new Error('Folder path must be a valid string');
    }

    if (!environment || typeof environment !== 'string' || environment.trim() === '') {
      return null;
    }
    
    const envParamsPath = path.join(folderPath, 'params', `${environment}.json`);
    
    try {
      // Check if file exists and is accessible
      const stats = await fs.stat(envParamsPath);
      if (!stats.isFile()) {
        throw new Error(`Environment parameters path exists but is not a file: ${envParamsPath}`);
      }

      const paramsContent = await fs.readFile(envParamsPath, 'utf8');
      
      // Check for empty file (empty object is valid)
      if (!paramsContent.trim()) {
        throw new Error(`Environment parameters file is empty: ${envParamsPath}. Expected at least an empty JSON object {}.`);
      }

      let params;
      try {
        params = JSON.parse(paramsContent);
      } catch (parseError) {
        throw new Error(`Invalid JSON format in ${environment}.json at ${envParamsPath}: ${parseError.message}. Please check the JSON syntax.`);
      }

      // Validate that params is an object
      if (!params || typeof params !== 'object' || Array.isArray(params)) {
        throw new Error(`Environment parameters must be a JSON object, got ${typeof params}`);
      }

      return params;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Environment-specific file is optional, return null if not found
        return null;
      } else if (error.code === 'EACCES') {
        throw new Error(`Permission denied accessing environment parameters file: ${envParamsPath}. Please check file permissions.`);
      } else if (error.code === 'EISDIR') {
        throw new Error(`Expected file but found directory: ${envParamsPath}. Please ensure ${environment}.json is a file, not a directory.`);
      } else if (error.message.includes('Invalid JSON format') ||
                 error.message.includes('must be a JSON object') ||
                 error.message.includes('is empty') ||
                 error.message.includes('must be a valid string')) {
        throw error;
      } else {
        throw new Error(`Failed to read environment parameters from ${envParamsPath}: ${error.message}`);
      }
    }
  }

  /**
   * Read default tags from the tags subfolder
   * @param {string} folderPath - Path to the configuration folder
   * @returns {Promise<Object>} Parsed default.json content from tags directory
   * @throws {Error} If file is missing or contains invalid JSON
   */
  async readDefaultTags(folderPath) {
    // Validate input parameters
    if (!folderPath || typeof folderPath !== 'string') {
      throw new Error('Folder path must be a valid string');
    }

    const defaultTagsPath = path.join(folderPath, 'tags', 'default.json');
    
    try {
      // Check if file exists and is accessible
      const stats = await fs.stat(defaultTagsPath);
      if (!stats.isFile()) {
        throw new Error(`Default tags path exists but is not a file: ${defaultTagsPath}`);
      }

      const tagsContent = await fs.readFile(defaultTagsPath, 'utf8');
      
      // Check for empty file (empty object is valid)
      if (!tagsContent.trim()) {
        throw new Error(`Default tags file is empty: ${defaultTagsPath}. Expected at least an empty JSON object {}.`);
      }

      let tags;
      try {
        tags = JSON.parse(tagsContent);
      } catch (parseError) {
        throw new Error(`Invalid JSON format in default.json at ${defaultTagsPath}: ${parseError.message}. Please check the JSON syntax.`);
      }

      // Validate that tags is an object
      if (!tags || typeof tags !== 'object' || Array.isArray(tags)) {
        throw new Error(`Default tags must be a JSON object, got ${typeof tags}`);
      }

      return tags;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Tags are optional, return empty object if not found
        return {};
      } else if (error.code === 'EACCES') {
        throw new Error(`Permission denied accessing default tags file: ${defaultTagsPath}. Please check file permissions.`);
      } else if (error.code === 'EISDIR') {
        throw new Error(`Expected file but found directory: ${defaultTagsPath}. Please ensure default.json is a file, not a directory.`);
      } else if (error.message.includes('Invalid JSON format') ||
                 error.message.includes('must be a JSON object') ||
                 error.message.includes('is empty') ||
                 error.message.includes('must be a valid string')) {
        throw error;
      } else {
        throw new Error(`Failed to read default tags from ${defaultTagsPath}: ${error.message}`);
      }
    }
  }

  /**
   * Read environment-specific tags from the tags subfolder
   * @param {string} folderPath - Path to the configuration folder
   * @param {string} environment - Environment name for the tags file
   * @returns {Promise<Object|null>} Parsed environment-specific JSON content or null if file doesn't exist
   * @throws {Error} If file contains invalid JSON
   */
  async readEnvironmentTags(folderPath, environment) {
    // Validate input parameters
    if (!folderPath || typeof folderPath !== 'string') {
      throw new Error('Folder path must be a valid string');
    }

    if (!environment || typeof environment !== 'string' || environment.trim() === '') {
      return null;
    }
    
    const envTagsPath = path.join(folderPath, 'tags', `${environment}.json`);
    
    try {
      // Check if file exists and is accessible
      const stats = await fs.stat(envTagsPath);
      if (!stats.isFile()) {
        throw new Error(`Environment tags path exists but is not a file: ${envTagsPath}`);
      }

      const tagsContent = await fs.readFile(envTagsPath, 'utf8');
      
      // Check for empty file (empty object is valid)
      if (!tagsContent.trim()) {
        throw new Error(`Environment tags file is empty: ${envTagsPath}. Expected at least an empty JSON object {}.`);
      }

      let tags;
      try {
        tags = JSON.parse(tagsContent);
      } catch (parseError) {
        throw new Error(`Invalid JSON format in ${environment}.json at ${envTagsPath}: ${parseError.message}. Please check the JSON syntax.`);
      }

      // Validate that tags is an object
      if (!tags || typeof tags !== 'object' || Array.isArray(tags)) {
        throw new Error(`Environment tags must be a JSON object, got ${typeof tags}`);
      }

      return tags;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Environment-specific tags file is optional, return null if not found
        return null;
      } else if (error.code === 'EACCES') {
        throw new Error(`Permission denied accessing environment tags file: ${envTagsPath}. Please check file permissions.`);
      } else if (error.code === 'EISDIR') {
        throw new Error(`Expected file but found directory: ${envTagsPath}. Please ensure ${environment}.json is a file, not a directory.`);
      } else if (error.message.includes('Invalid JSON format') ||
                 error.message.includes('must be a JSON object') ||
                 error.message.includes('is empty') ||
                 error.message.includes('must be a valid string')) {
        throw error;
      } else {
        throw new Error(`Failed to read environment tags from ${envTagsPath}: ${error.message}`);
      }
    }
  }

  /**
   * Validate that a JSON object contains all required fields
   * @param {Object} data - The JSON object to validate
   * @param {string[]} requiredFields - Array of required field names
   * @throws {Error} If any required field is missing
   */
  validateJsonStructure(data, requiredFields) {
    for (const field of requiredFields) {
      if (!(field in data) || data[field] === null || data[field] === undefined || data[field] === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }
}

export default ConfigurationReader;