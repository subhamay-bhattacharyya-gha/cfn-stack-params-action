import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ConfigurationReader from '../../src/configuration-reader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ConfigurationReader', () => {
  let configReader;
  let testDir;

  beforeEach(async () => {
    configReader = new ConfigurationReader();
    testDir = path.join(__dirname, '../fixtures/test-config');
    
    // Create test directory structure
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'params'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('readCloudFormationConfig', () => {
    it('should successfully read valid cloudformation.json', async () => {
      const validConfig = {
        project: 'test-project',
        template: 'template.yaml',
        'stack-prefix': 'test-stack'
      };

      await fs.writeFile(
        path.join(testDir, 'cloudformation.json'),
        JSON.stringify(validConfig)
      );

      const result = await configReader.readCloudFormationConfig(testDir);
      expect(result).toEqual(validConfig);
    });

    it('should throw error for invalid folder path input', async () => {
      await expect(configReader.readCloudFormationConfig(null))
        .rejects.toThrow('Folder path must be a valid string');
      
      await expect(configReader.readCloudFormationConfig(undefined))
        .rejects.toThrow('Folder path must be a valid string');
      
      await expect(configReader.readCloudFormationConfig(123))
        .rejects.toThrow('Folder path must be a valid string');
      
      await expect(configReader.readCloudFormationConfig(''))
        .rejects.toThrow('Folder path must be a valid string');
    });

    it('should throw error when cloudformation.json is missing', async () => {
      await expect(configReader.readCloudFormationConfig(testDir))
        .rejects.toThrow('CloudFormation configuration file not found');
    });

    it('should throw error when cloudformation.json path is a directory', async () => {
      await fs.mkdir(path.join(testDir, 'cloudformation.json'));

      await expect(configReader.readCloudFormationConfig(testDir))
        .rejects.toThrow('CloudFormation configuration path exists but is not a file');
    });

    it('should throw error when cloudformation.json is empty', async () => {
      await fs.writeFile(path.join(testDir, 'cloudformation.json'), '');

      await expect(configReader.readCloudFormationConfig(testDir))
        .rejects.toThrow('CloudFormation configuration file is empty');
    });

    it('should throw error when cloudformation.json has only whitespace', async () => {
      await fs.writeFile(path.join(testDir, 'cloudformation.json'), '   \n\t  ');

      await expect(configReader.readCloudFormationConfig(testDir))
        .rejects.toThrow('CloudFormation configuration file is empty');
    });

    it('should throw error when cloudformation.json has invalid JSON', async () => {
      await fs.writeFile(
        path.join(testDir, 'cloudformation.json'),
        '{ invalid json }'
      );

      await expect(configReader.readCloudFormationConfig(testDir))
        .rejects.toThrow('Invalid JSON format in cloudformation.json');
    });

    it('should throw error when cloudformation.json contains an array', async () => {
      await fs.writeFile(
        path.join(testDir, 'cloudformation.json'),
        JSON.stringify(['not', 'an', 'object'])
      );

      await expect(configReader.readCloudFormationConfig(testDir))
        .rejects.toThrow('CloudFormation configuration must be a JSON object, got object');
    });

    it('should throw error when cloudformation.json contains a primitive', async () => {
      await fs.writeFile(
        path.join(testDir, 'cloudformation.json'),
        JSON.stringify('not an object')
      );

      await expect(configReader.readCloudFormationConfig(testDir))
        .rejects.toThrow('CloudFormation configuration must be a JSON object, got string');
    });

    it('should throw error when project field is missing', async () => {
      const invalidConfig = {
        template: 'template.yaml',
        'stack-prefix': 'test-stack'
      };

      await fs.writeFile(
        path.join(testDir, 'cloudformation.json'),
        JSON.stringify(invalidConfig)
      );

      await expect(configReader.readCloudFormationConfig(testDir))
        .rejects.toThrow('Missing required field: project');
    });

    it('should throw error when template field is missing', async () => {
      const invalidConfig = {
        project: 'test-project',
        'stack-prefix': 'test-stack'
      };

      await fs.writeFile(
        path.join(testDir, 'cloudformation.json'),
        JSON.stringify(invalidConfig)
      );

      await expect(configReader.readCloudFormationConfig(testDir))
        .rejects.toThrow('Missing required field: template');
    });

    it('should throw error when stack-prefix field is missing', async () => {
      const invalidConfig = {
        project: 'test-project',
        template: 'template.yaml'
      };

      await fs.writeFile(
        path.join(testDir, 'cloudformation.json'),
        JSON.stringify(invalidConfig)
      );

      await expect(configReader.readCloudFormationConfig(testDir))
        .rejects.toThrow('Missing required field: stack-prefix');
    });

    it('should throw error when required field is empty string', async () => {
      const invalidConfig = {
        project: '',
        template: 'template.yaml',
        'stack-prefix': 'test-stack'
      };

      await fs.writeFile(
        path.join(testDir, 'cloudformation.json'),
        JSON.stringify(invalidConfig)
      );

      await expect(configReader.readCloudFormationConfig(testDir))
        .rejects.toThrow('Missing required field: project');
    });

    it('should throw error when required field is null', async () => {
      const invalidConfig = {
        project: 'test-project',
        template: null,
        'stack-prefix': 'test-stack'
      };

      await fs.writeFile(
        path.join(testDir, 'cloudformation.json'),
        JSON.stringify(invalidConfig)
      );

      await expect(configReader.readCloudFormationConfig(testDir))
        .rejects.toThrow('Missing required field: template');
    });

    it('should provide helpful error messages with file paths', async () => {
      const expectedPath = path.join(testDir, 'cloudformation.json');
      
      await expect(configReader.readCloudFormationConfig(testDir))
        .rejects.toThrow(`CloudFormation configuration file not found: ${expectedPath}. Please ensure the file exists in the specified directory.`);
    });

    it('should handle JSON parsing errors with context', async () => {
      await fs.writeFile(
        path.join(testDir, 'cloudformation.json'),
        '{"project": "test", "template": "test.yaml", "stack-prefix": "api",}'
      );

      const expectedPath = path.join(testDir, 'cloudformation.json');
      await expect(configReader.readCloudFormationConfig(testDir))
        .rejects.toThrow(`Invalid JSON format in cloudformation.json at ${expectedPath}`);
    });
  });

  describe('readDefaultParameters', () => {
    it('should successfully read valid default.json', async () => {
      const defaultParams = {
        param1: 'value1',
        param2: 'value2'
      };

      await fs.writeFile(
        path.join(testDir, 'params', 'default.json'),
        JSON.stringify(defaultParams)
      );

      const result = await configReader.readDefaultParameters(testDir);
      expect(result).toEqual(defaultParams);
    });

    it('should throw error for invalid folder path input', async () => {
      await expect(configReader.readDefaultParameters(null))
        .rejects.toThrow('Folder path must be a valid string');
      
      await expect(configReader.readDefaultParameters(undefined))
        .rejects.toThrow('Folder path must be a valid string');
      
      await expect(configReader.readDefaultParameters(123))
        .rejects.toThrow('Folder path must be a valid string');
      
      await expect(configReader.readDefaultParameters(''))
        .rejects.toThrow('Folder path must be a valid string');
    });

    it('should throw error when default.json is missing', async () => {
      const expectedPath = path.join(testDir, 'params', 'default.json');
      await expect(configReader.readDefaultParameters(testDir))
        .rejects.toThrow(`Default parameters file not found: ${expectedPath}. Please ensure the file exists in the params subdirectory.`);
    });

    it('should throw error when default.json path is a directory', async () => {
      await fs.mkdir(path.join(testDir, 'params', 'default.json'));

      await expect(configReader.readDefaultParameters(testDir))
        .rejects.toThrow('Default parameters path exists but is not a file');
    });

    it('should throw error when default.json is empty', async () => {
      await fs.writeFile(path.join(testDir, 'params', 'default.json'), '');

      await expect(configReader.readDefaultParameters(testDir))
        .rejects.toThrow('Default parameters file is empty');
    });

    it('should throw error when default.json has only whitespace', async () => {
      await fs.writeFile(path.join(testDir, 'params', 'default.json'), '   \n\t  ');

      await expect(configReader.readDefaultParameters(testDir))
        .rejects.toThrow('Default parameters file is empty');
    });

    it('should throw error when default.json has invalid JSON', async () => {
      await fs.writeFile(
        path.join(testDir, 'params', 'default.json'),
        '{ invalid json }'
      );

      const expectedPath = path.join(testDir, 'params', 'default.json');
      await expect(configReader.readDefaultParameters(testDir))
        .rejects.toThrow(`Invalid JSON format in default.json at ${expectedPath}`);
    });

    it('should throw error when default.json contains an array', async () => {
      await fs.writeFile(
        path.join(testDir, 'params', 'default.json'),
        JSON.stringify(['not', 'an', 'object'])
      );

      await expect(configReader.readDefaultParameters(testDir))
        .rejects.toThrow('Default parameters must be a JSON object, got object');
    });

    it('should throw error when default.json contains a primitive', async () => {
      await fs.writeFile(
        path.join(testDir, 'params', 'default.json'),
        JSON.stringify('not an object')
      );

      await expect(configReader.readDefaultParameters(testDir))
        .rejects.toThrow('Default parameters must be a JSON object, got string');
    });

    it('should handle empty default.json object', async () => {
      await fs.writeFile(
        path.join(testDir, 'params', 'default.json'),
        '{}'
      );

      const result = await configReader.readDefaultParameters(testDir);
      expect(result).toEqual({});
    });

    it('should provide helpful error messages with file paths', async () => {
      const expectedPath = path.join(testDir, 'params', 'default.json');
      
      await expect(configReader.readDefaultParameters(testDir))
        .rejects.toThrow(`Default parameters file not found: ${expectedPath}. Please ensure the file exists in the params subdirectory.`);
    });
  });

  describe('readEnvironmentParameters', () => {
    it('should successfully read valid environment-specific file', async () => {
      const envParams = {
        param1: 'env-value1',
        param3: 'env-value3'
      };

      await fs.writeFile(
        path.join(testDir, 'params', 'sb-devl-us-east-1.json'),
        JSON.stringify(envParams)
      );

      const result = await configReader.readEnvironmentParameters(testDir, 'sb-devl-us-east-1');
      expect(result).toEqual(envParams);
    });

    it('should throw error for invalid folder path input', async () => {
      await expect(configReader.readEnvironmentParameters(null, 'test'))
        .rejects.toThrow('Folder path must be a valid string');
      
      await expect(configReader.readEnvironmentParameters(undefined, 'test'))
        .rejects.toThrow('Folder path must be a valid string');
      
      await expect(configReader.readEnvironmentParameters(123, 'test'))
        .rejects.toThrow('Folder path must be a valid string');
      
      await expect(configReader.readEnvironmentParameters('', 'test'))
        .rejects.toThrow('Folder path must be a valid string');
    });

    it('should return null when environment parameter is not provided', async () => {
      const result1 = await configReader.readEnvironmentParameters(testDir, null);
      expect(result1).toBeNull();
      
      const result2 = await configReader.readEnvironmentParameters(testDir, undefined);
      expect(result2).toBeNull();
      
      const result3 = await configReader.readEnvironmentParameters(testDir, '');
      expect(result3).toBeNull();
      
      const result4 = await configReader.readEnvironmentParameters(testDir, '   ');
      expect(result4).toBeNull();
    });

    it('should return null when environment parameter is not a string', async () => {
      const result1 = await configReader.readEnvironmentParameters(testDir, 123);
      expect(result1).toBeNull();
      
      const result2 = await configReader.readEnvironmentParameters(testDir, {});
      expect(result2).toBeNull();
      
      const result3 = await configReader.readEnvironmentParameters(testDir, []);
      expect(result3).toBeNull();
    });

    it('should return null when environment-specific file is missing', async () => {
      const result = await configReader.readEnvironmentParameters(testDir, 'non-existent-env');
      expect(result).toBeNull();
    });

    it('should throw error when environment file path is a directory', async () => {
      await fs.mkdir(path.join(testDir, 'params', 'test-env.json'));

      await expect(configReader.readEnvironmentParameters(testDir, 'test-env'))
        .rejects.toThrow('Environment parameters path exists but is not a file');
    });

    it('should throw error when environment file is empty', async () => {
      await fs.writeFile(path.join(testDir, 'params', 'empty-env.json'), '');

      await expect(configReader.readEnvironmentParameters(testDir, 'empty-env'))
        .rejects.toThrow('Environment parameters file is empty');
    });

    it('should throw error when environment file has only whitespace', async () => {
      await fs.writeFile(path.join(testDir, 'params', 'whitespace-env.json'), '   \n\t  ');

      await expect(configReader.readEnvironmentParameters(testDir, 'whitespace-env'))
        .rejects.toThrow('Environment parameters file is empty');
    });

    it('should throw error when environment file has invalid JSON', async () => {
      await fs.writeFile(
        path.join(testDir, 'params', 'sb-test-us-east-1.json'),
        '{ invalid json }'
      );

      const expectedPath = path.join(testDir, 'params', 'sb-test-us-east-1.json');
      await expect(configReader.readEnvironmentParameters(testDir, 'sb-test-us-east-1'))
        .rejects.toThrow(`Invalid JSON format in sb-test-us-east-1.json at ${expectedPath}`);
    });

    it('should throw error when environment file contains an array', async () => {
      await fs.writeFile(
        path.join(testDir, 'params', 'array-env.json'),
        JSON.stringify(['not', 'an', 'object'])
      );

      await expect(configReader.readEnvironmentParameters(testDir, 'array-env'))
        .rejects.toThrow('Environment parameters must be a JSON object, got object');
    });

    it('should throw error when environment file contains a primitive', async () => {
      await fs.writeFile(
        path.join(testDir, 'params', 'primitive-env.json'),
        JSON.stringify('not an object')
      );

      await expect(configReader.readEnvironmentParameters(testDir, 'primitive-env'))
        .rejects.toThrow('Environment parameters must be a JSON object, got string');
    });

    it('should handle empty environment-specific object', async () => {
      await fs.writeFile(
        path.join(testDir, 'params', 'sb-prod-us-east-1.json'),
        '{}'
      );

      const result = await configReader.readEnvironmentParameters(testDir, 'sb-prod-us-east-1');
      expect(result).toEqual({});
    });

    it('should provide helpful error messages with file paths', async () => {
      await fs.writeFile(
        path.join(testDir, 'params', 'malformed.json'),
        '{"key": "value",}'
      );

      const expectedPath = path.join(testDir, 'params', 'malformed.json');
      await expect(configReader.readEnvironmentParameters(testDir, 'malformed'))
        .rejects.toThrow(`Invalid JSON format in malformed.json at ${expectedPath}`);
    });
  });

  describe('validateJsonStructure', () => {
    it('should pass validation when all required fields are present', () => {
      const data = {
        field1: 'value1',
        field2: 'value2',
        field3: 'value3'
      };

      expect(() => {
        configReader.validateJsonStructure(data, ['field1', 'field2']);
      }).not.toThrow();
    });

    it('should throw error when required field is missing', () => {
      const data = {
        field1: 'value1'
      };

      expect(() => {
        configReader.validateJsonStructure(data, ['field1', 'field2']);
      }).toThrow('Missing required field: field2');
    });

    it('should throw error when required field is null', () => {
      const data = {
        field1: 'value1',
        field2: null
      };

      expect(() => {
        configReader.validateJsonStructure(data, ['field1', 'field2']);
      }).toThrow('Missing required field: field2');
    });

    it('should throw error when required field is undefined', () => {
      const data = {
        field1: 'value1',
        field2: undefined
      };

      expect(() => {
        configReader.validateJsonStructure(data, ['field1', 'field2']);
      }).toThrow('Missing required field: field2');
    });

    it('should throw error when required field is empty string', () => {
      const data = {
        field1: 'value1',
        field2: ''
      };

      expect(() => {
        configReader.validateJsonStructure(data, ['field1', 'field2']);
      }).toThrow('Missing required field: field2');
    });

    it('should pass validation with empty required fields array', () => {
      const data = {
        field1: 'value1'
      };

      expect(() => {
        configReader.validateJsonStructure(data, []);
      }).not.toThrow();
    });
  });
});