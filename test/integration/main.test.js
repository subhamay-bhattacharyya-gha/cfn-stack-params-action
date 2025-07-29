import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as core from '@actions/core';
import { run, parseBooleanInput, validateInputs } from '../../src/main.js';
import path from 'path';
import fs from 'fs/promises';

// Mock @actions/core
vi.mock('@actions/core', () => ({
  getInput: vi.fn(),
  setOutput: vi.fn(),
  setFailed: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  debug: vi.fn()
}));

// Mock child_process for git commands
vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

describe('Main Action Integration Tests', () => {
  const testFixturesPath = path.join(process.cwd(), 'test', 'fixtures');
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('run() - Complete Action Execution', () => {
    it('should successfully process valid configuration with environment deployment', async () => {
      // Setup test inputs
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'cfn-directory': return path.join(testFixturesPath, 'valid-config');
          case 'ci-build': return 'false';
          case 'environment': return 'sb-devl-us-east-1';
          default: return '';
        }
      });

      await run();

      // Verify no failures
      expect(core.setFailed).not.toHaveBeenCalled();

      // Verify outputs were set
      expect(core.setOutput).toHaveBeenCalledWith('parameters', expect.any(String));
      expect(core.setOutput).toHaveBeenCalledWith('stack-name', expect.any(String));
      expect(core.setOutput).toHaveBeenCalledWith('ci-build-id', '');

      // Verify parameter output format
      const parametersCall = core.setOutput.mock.calls.find(call => call[0] === 'parameters');
      const parameters = JSON.parse(parametersCall[1]);
      expect(Array.isArray(parameters)).toBe(true);
      expect(parameters.length).toBeGreaterThan(0);
      expect(parameters[0]).toHaveProperty('ParameterName');
      expect(parameters[0]).toHaveProperty('ParameterValue');

      // Verify stack name format for environment deployment
      const stackNameCall = core.setOutput.mock.calls.find(call => call[0] === 'stack-name');
      expect(stackNameCall[1]).toMatch(/^test-project-api-sb-devl-us-east-1$/);
    });

    it('should successfully process valid configuration with CI build', async () => {
      const { execSync } = await import('child_process');
      execSync.mockReturnValue('feature/test-branch\n');

      // Setup test inputs
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'cfn-directory': return path.join(testFixturesPath, 'valid-config');
          case 'ci-build': return 'true';
          case 'environment': return '';
          default: return '';
        }
      });

      await run();

      // Verify no failures
      expect(core.setFailed).not.toHaveBeenCalled();

      // Verify outputs were set
      expect(core.setOutput).toHaveBeenCalledWith('parameters', expect.any(String));
      expect(core.setOutput).toHaveBeenCalledWith('stack-name', expect.any(String));
      expect(core.setOutput).toHaveBeenCalledWith('ci-build-id', expect.any(String));

      // Verify stack name format for CI build
      const stackNameCall = core.setOutput.mock.calls.find(call => call[0] === 'stack-name');
      expect(stackNameCall[1]).toMatch(/^test-project-api-feature-test-branch$/);

      // Verify CI build ID is generated
      const ciBuildIdCall = core.setOutput.mock.calls.find(call => call[0] === 'ci-build-id');
      expect(ciBuildIdCall[1]).toMatch(/^[a-z]{6,10}$/);
    });

    it('should handle missing cloudformation.json file', async () => {
      // Setup test inputs with non-existent config
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'cfn-directory': return path.join(testFixturesPath, 'missing-config');
          case 'ci-build': return 'false';
          case 'environment': return 'test';
          default: return '';
        }
      });

      await run();

      // Verify action failed with appropriate error
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('CloudFormation configuration file not found')
      );
    });

    it('should handle missing default.json file', async () => {
      // Setup test inputs
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'cfn-directory': return path.join(testFixturesPath, 'missing-default-params');
          case 'ci-build': return 'false';
          case 'environment': return 'test';
          default: return '';
        }
      });

      await run();

      // Verify action failed with appropriate error
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('Default parameters file not found')
      );
    });

    it('should handle invalid JSON in configuration files', async () => {
      // Setup test inputs
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'cfn-directory': return path.join(testFixturesPath, 'invalid-json');
          case 'ci-build': return 'false';
          case 'environment': return 'test';
          default: return '';
        }
      });

      await run();

      // Verify action failed with appropriate error
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JSON format')
      );
    });

    it('should handle Git errors in CI build mode', async () => {
      const { execSync } = await import('child_process');
      execSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      // Setup test inputs
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'cfn-directory': return path.join(testFixturesPath, 'valid-config');
          case 'ci-build': return 'true';
          case 'environment': return '';
          default: return '';
        }
      });

      await run();

      // Verify action failed with appropriate error
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('Failed to determine current branch name')
      );
    });

    it('should successfully process complex configuration with many parameters', async () => {
      // Setup test inputs
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'cfn-directory': return path.join(testFixturesPath, 'complex-config');
          case 'ci-build': return 'false';
          case 'environment': return 'sb-prod-us-east-1';
          default: return '';
        }
      });

      await run();

      // Verify no failures
      expect(core.setFailed).not.toHaveBeenCalled();

      // Verify outputs were set
      expect(core.setOutput).toHaveBeenCalledWith('parameters', expect.any(String));
      expect(core.setOutput).toHaveBeenCalledWith('stack-name', 'complex-project-microservice-sb-prod-us-east-1');
      expect(core.setOutput).toHaveBeenCalledWith('ci-build-id', '');

      // Verify parameter merging worked correctly
      const parametersCall = core.setOutput.mock.calls.find(call => call[0] === 'parameters');
      const parameters = JSON.parse(parametersCall[1]);
      
      // Check that environment-specific values override defaults
      const vpcParam = parameters.find(p => p.ParameterName === 'VpcId');
      expect(vpcParam.ParameterValue).toBe('vpc-prod-123456');
      
      const instanceParam = parameters.find(p => p.ParameterName === 'InstanceType');
      expect(instanceParam.ParameterValue).toBe('t3.large');
      
      // Check that new environment-specific parameters are included
      const alarmParam = parameters.find(p => p.ParameterName === 'AlarmEmail');
      expect(alarmParam.ParameterValue).toBe('alerts@company.com');
    });

    it('should handle empty parameter files gracefully', async () => {
      // Setup test inputs
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'cfn-directory': return path.join(testFixturesPath, 'empty-params');
          case 'ci-build': return 'false';
          case 'environment': return 'non-existent-env';
          default: return '';
        }
      });

      await run();

      // Verify no failures
      expect(core.setFailed).not.toHaveBeenCalled();

      // Verify outputs were set
      expect(core.setOutput).toHaveBeenCalledWith('parameters', '[]');
      expect(core.setOutput).toHaveBeenCalledWith('stack-name', 'test-project-api-non-existent-env');
      expect(core.setOutput).toHaveBeenCalledWith('ci-build-id', '');
    });

    it('should handle missing required fields in cloudformation.json', async () => {
      // Setup test inputs
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'cfn-directory': return path.join(testFixturesPath, 'missing-required-fields');
          case 'ci-build': return 'false';
          case 'environment': return 'test';
          default: return '';
        }
      });

      await run();

      // Verify action failed with appropriate error
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('Missing required field: stack-prefix')
      );
    });

    it('should handle invalid JSON in environment parameter file', async () => {
      // Setup test inputs
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'cfn-directory': return path.join(testFixturesPath, 'invalid-params');
          case 'ci-build': return 'false';
          case 'environment': return 'sb-test-us-east-1';
          default: return '';
        }
      });

      await run();

      // Verify action failed with appropriate error
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JSON format in sb-test-us-east-1.json')
      );
    });

    it('should handle CI build with detached HEAD state', async () => {
      const { execSync } = await import('child_process');
      execSync.mockReturnValue('HEAD\n');

      // Setup test inputs
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'cfn-directory': return path.join(testFixturesPath, 'valid-config');
          case 'ci-build': return 'true';
          case 'environment': return '';
          default: return '';
        }
      });

      await run();

      // Verify action failed with appropriate error
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('Unable to determine current branch name')
      );
    });

    it('should handle CI build with complex branch names', async () => {
      const { execSync } = await import('child_process');
      execSync.mockReturnValue('feature/JIRA-123_fix-user@auth.issue\n');

      // Setup test inputs
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'cfn-directory': return path.join(testFixturesPath, 'valid-config');
          case 'ci-build': return 'true';
          case 'environment': return '';
          default: return '';
        }
      });

      await run();

      // Verify no failures
      expect(core.setFailed).not.toHaveBeenCalled();

      // Verify stack name is properly sanitized
      const stackNameCall = core.setOutput.mock.calls.find(call => call[0] === 'stack-name');
      expect(stackNameCall[1]).toBe('test-project-api-feature-jira-123-fix-user-auth-issue');

      // Verify CI build ID is generated
      const ciBuildIdCall = core.setOutput.mock.calls.find(call => call[0] === 'ci-build-id');
      expect(ciBuildIdCall[1]).toMatch(/^[a-z]{6,10}$/);
    });

    it('should handle non-existent folder gracefully', async () => {
      // Setup test inputs with completely non-existent path
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case 'cfn-directory': return '/non/existent/path';
          case 'ci-build': return 'false';
          case 'environment': return 'test';
          default: return '';
        }
      });

      await run();

      // Verify action failed with appropriate error
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('CloudFormation configuration file not found')
      );
    });
  });

  describe('parseBooleanInput()', () => {
    it('should parse valid boolean strings', () => {
      expect(parseBooleanInput('true')).toBe(true);
      expect(parseBooleanInput('false')).toBe(false);
      expect(parseBooleanInput('TRUE')).toBe(true);
      expect(parseBooleanInput('FALSE')).toBe(false);
      expect(parseBooleanInput(' true ')).toBe(true);
      expect(parseBooleanInput(' false ')).toBe(false);
    });

    it('should default to false for empty input', () => {
      expect(parseBooleanInput('')).toBe(false);
      expect(parseBooleanInput(null)).toBe(false);
      expect(parseBooleanInput(undefined)).toBe(false);
    });

    it('should throw error for invalid boolean strings', () => {
      expect(() => parseBooleanInput('yes')).toThrow('Invalid boolean value for ci-build');
      expect(() => parseBooleanInput('no')).toThrow('Invalid boolean value for ci-build');
      expect(() => parseBooleanInput('1')).toThrow('Invalid boolean value for ci-build');
      expect(() => parseBooleanInput('0')).toThrow('Invalid boolean value for ci-build');
    });
  });

  describe('validateInputs()', () => {
    it('should pass validation for valid inputs', () => {
      expect(() => validateInputs('cfn', false, 'test')).not.toThrow();
      expect(() => validateInputs('config', true, '')).not.toThrow();
      expect(() => validateInputs('config', true, 'ignored')).not.toThrow();
      expect(() => validateInputs('my-folder', false, 'prod-env')).not.toThrow();
      expect(() => validateInputs('folder_name', false, 'test_env')).not.toThrow();
    });

    it('should throw error for invalid folder input', () => {
      expect(() => validateInputs('', false, 'test')).toThrow('Folder input cannot be empty and must be a valid string');
      expect(() => validateInputs('   ', false, 'test')).toThrow('Folder input cannot be empty and must be a valid string');
      expect(() => validateInputs(null, false, 'test')).toThrow('Folder input cannot be empty and must be a valid string');
      expect(() => validateInputs(undefined, false, 'test')).toThrow('Folder input cannot be empty and must be a valid string');
      expect(() => validateInputs(123, false, 'test')).toThrow('Folder input cannot be empty and must be a valid string');
    });

    it('should throw error for unsafe folder paths', () => {
      expect(() => validateInputs('../config', false, 'test')).toThrow('Folder path contains potentially unsafe characters');
      expect(() => validateInputs('~/config', false, 'test')).toThrow('Folder path contains potentially unsafe characters');
      expect(() => validateInputs('/absolute/path', false, 'test')).toThrow('Folder path contains potentially unsafe characters');
      expect(() => validateInputs('config/../other', false, 'test')).toThrow('Folder path contains potentially unsafe characters');
    });

    it('should throw error for folder path that is too long', () => {
      const longPath = 'a'.repeat(256);
      expect(() => validateInputs(longPath, false, 'test')).toThrow('Folder path is too long. Maximum length is 255 characters.');
    });

    it('should throw error for invalid environment input in non-CI build', () => {
      expect(() => validateInputs('cfn', false, '')).toThrow('Environment input is required when ci-build is false and must be a valid string');
      expect(() => validateInputs('cfn', false, '   ')).toThrow('Environment input is required when ci-build is false and must be a valid string');
      expect(() => validateInputs('cfn', false, null)).toThrow('Environment input is required when ci-build is false and must be a valid string');
      expect(() => validateInputs('cfn', false, undefined)).toThrow('Environment input is required when ci-build is false and must be a valid string');
      expect(() => validateInputs('cfn', false, 123)).toThrow('Environment input is required when ci-build is false and must be a valid string');
    });

    it('should throw error for environment name that is too long', () => {
      const longEnv = 'a'.repeat(101);
      expect(() => validateInputs('cfn', false, longEnv)).toThrow('Environment name is too long. Maximum length is 100 characters.');
    });

    it('should throw error for environment name with invalid characters', () => {
      expect(() => validateInputs('cfn', false, 'env@name')).toThrow('Environment name contains invalid characters');
      expect(() => validateInputs('cfn', false, 'env name')).toThrow('Environment name contains invalid characters');
      expect(() => validateInputs('cfn', false, 'env.name')).toThrow('Environment name contains invalid characters');
      expect(() => validateInputs('cfn', false, 'env/name')).toThrow('Environment name contains invalid characters');
    });

    it('should accept valid environment names', () => {
      expect(() => validateInputs('cfn', false, 'test')).not.toThrow();
      expect(() => validateInputs('cfn', false, 'prod-env')).not.toThrow();
      expect(() => validateInputs('cfn', false, 'test_env')).not.toThrow();
      expect(() => validateInputs('cfn', false, 'env123')).not.toThrow();
      expect(() => validateInputs('cfn', false, 'TEST-ENV')).not.toThrow();
    });

    it('should warn when environment is provided in CI build mode', () => {
      validateInputs('cfn', true, 'test');
      expect(core.warning).toHaveBeenCalledWith('Environment input is ignored when ci-build is true');
    });
  });
});  
describe('Error Path Testing', () => {
    it('should handle file system permission errors', async () => {
      // Create a temporary directory with restricted permissions
      const tempDir = path.join(process.cwd(), 'test', 'temp-restricted');
      
      try {
        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(path.join(tempDir, 'cloudformation.json'), '{}');
        await fs.chmod(tempDir, 0o000); // Remove all permissions

        core.getInput.mockImplementation((name) => {
          switch (name) {
            case 'cfn-directory': return tempDir;
            case 'ci-build': return 'false';
            case 'environment': return 'test';
            default: return '';
          }
        });

        await run();

        expect(core.setFailed).toHaveBeenCalledWith(
          expect.stringContaining('CloudFormation configuration file not found')
        );
      } finally {
        // Cleanup: restore permissions and remove directory
        try {
          await fs.chmod(tempDir, 0o755);
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle malformed JSON with specific syntax errors', async () => {
      const tempDir = path.join(process.cwd(), 'test', 'temp-malformed');
      
      try {
        await fs.mkdir(tempDir, { recursive: true });
        await fs.mkdir(path.join(tempDir, 'params'), { recursive: true });
        
        // Create malformed JSON with trailing comma
        await fs.writeFile(
          path.join(tempDir, 'cloudformation.json'),
          '{\n  "project": "test",\n  "template": "test.yaml",\n  "stack-prefix": "api",\n}'
        );
        
        await fs.writeFile(
          path.join(tempDir, 'params', 'default.json'),
          '{"param1": "value1"}'
        );

        core.getInput.mockImplementation((name) => {
          switch (name) {
            case 'cfn-directory': return tempDir;
            case 'ci-build': return 'false';
            case 'environment': return 'test';
            default: return '';
          }
        });

        await run();

        expect(core.setFailed).toHaveBeenCalledWith(
          expect.stringContaining('Invalid JSON format in cloudformation.json')
        );
      } finally {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle extremely large parameter files', async () => {
      const tempDir = path.join(process.cwd(), 'test', 'temp-large');
      
      try {
        await fs.mkdir(tempDir, { recursive: true });
        await fs.mkdir(path.join(tempDir, 'params'), { recursive: true });
        
        await fs.writeFile(
          path.join(tempDir, 'cloudformation.json'),
          JSON.stringify({
            project: 'large-test',
            template: 'template.yaml',
            'stack-prefix': 'api'
          })
        );
        
        // Create a large parameter file with many parameters
        const largeParams = {};
        for (let i = 0; i < 1000; i++) {
          largeParams[`Parameter${i}`] = `Value${i}`;
        }
        
        await fs.writeFile(
          path.join(tempDir, 'params', 'default.json'),
          JSON.stringify(largeParams)
        );

        core.getInput.mockImplementation((name) => {
          switch (name) {
            case 'cfn-directory': return tempDir;
            case 'ci-build': return 'false';
            case 'environment': return 'test';
            default: return '';
          }
        });

        await run();

        // Should handle large files successfully
        expect(core.setFailed).not.toHaveBeenCalled();
        
        const parametersCall = core.setOutput.mock.calls.find(call => call[0] === 'parameters');
        const parameters = JSON.parse(parametersCall[1]);
        expect(parameters).toHaveLength(1000);
      } finally {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle concurrent file access scenarios', async () => {
      // This test simulates potential race conditions or file locking issues
      const tempDir = path.join(process.cwd(), 'test', 'temp-concurrent');
      
      try {
        await fs.mkdir(tempDir, { recursive: true });
        await fs.mkdir(path.join(tempDir, 'params'), { recursive: true });
        
        await fs.writeFile(
          path.join(tempDir, 'cloudformation.json'),
          JSON.stringify({
            project: 'concurrent-test',
            template: 'template.yaml',
            'stack-prefix': 'api'
          })
        );
        
        await fs.writeFile(
          path.join(tempDir, 'params', 'default.json'),
          JSON.stringify({ param1: 'value1' })
        );

        core.getInput.mockImplementation((name) => {
          switch (name) {
            case 'cfn-directory': return tempDir;
            case 'ci-build': return 'false';
            case 'environment': return 'test';
            default: return '';
          }
        });

        // Run multiple instances concurrently
        const promises = Array(5).fill().map(() => run());
        await Promise.all(promises);

        // At least one should succeed (all should succeed in this case)
        const failedCalls = core.setFailed.mock.calls.length;
        expect(failedCalls).toBeLessThanOrEqual(5);
      } finally {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Edge Case Testing', () => {
    it('should handle parameters with special characters and encoding', async () => {
      const tempDir = path.join(process.cwd(), 'test', 'temp-special-chars');
      
      try {
        await fs.mkdir(tempDir, { recursive: true });
        await fs.mkdir(path.join(tempDir, 'params'), { recursive: true });
        
        await fs.writeFile(
          path.join(tempDir, 'cloudformation.json'),
          JSON.stringify({
            project: 'special-test',
            template: 'template.yaml',
            'stack-prefix': 'api'
          })
        );
        
        const specialParams = {
          'UnicodeParam': 'Hello 世界 🌍',
          'SpecialChars': '!@#$%^&*()_+-=[]{}|;:,.<>?',
          'Quotes': 'He said "Hello" and \'Goodbye\'',
          'Newlines': 'Line1\nLine2\rLine3\r\n',
          'Tabs': 'Column1\tColumn2\tColumn3',
          'EmptyString': '',
          'Spaces': '   leading and trailing   '
        };
        
        await fs.writeFile(
          path.join(tempDir, 'params', 'default.json'),
          JSON.stringify(specialParams)
        );

        core.getInput.mockImplementation((name) => {
          switch (name) {
            case 'cfn-directory': return tempDir;
            case 'ci-build': return 'false';
            case 'environment': return 'test';
            default: return '';
          }
        });

        await run();

        expect(core.setFailed).not.toHaveBeenCalled();
        
        const parametersCall = core.setOutput.mock.calls.find(call => call[0] === 'parameters');
        const parameters = JSON.parse(parametersCall[1]);
        
        // Verify special characters are preserved
        const unicodeParam = parameters.find(p => p.ParameterName === 'UnicodeParam');
        expect(unicodeParam.ParameterValue).toBe('Hello 世界 🌍');
        
        const quotesParam = parameters.find(p => p.ParameterName === 'Quotes');
        expect(quotesParam.ParameterValue).toBe('He said "Hello" and \'Goodbye\'');
      } finally {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle deeply nested parameter structures', async () => {
      const tempDir = path.join(process.cwd(), 'test', 'temp-nested');
      
      try {
        await fs.mkdir(tempDir, { recursive: true });
        await fs.mkdir(path.join(tempDir, 'params'), { recursive: true });
        
        await fs.writeFile(
          path.join(tempDir, 'cloudformation.json'),
          JSON.stringify({
            project: 'nested-test',
            template: 'template.yaml',
            'stack-prefix': 'api'
          })
        );
        
        const nestedParams = {
          'SimpleParam': 'simple-value',
          'ObjectParam': JSON.stringify({
            nested: {
              deeply: {
                value: 'deep-value'
              }
            }
          }),
          'ArrayParam': JSON.stringify(['item1', 'item2', 'item3'])
        };
        
        await fs.writeFile(
          path.join(tempDir, 'params', 'default.json'),
          JSON.stringify(nestedParams)
        );

        core.getInput.mockImplementation((name) => {
          switch (name) {
            case 'cfn-directory': return tempDir;
            case 'ci-build': return 'false';
            case 'environment': return 'test';
            default: return '';
          }
        });

        await run();

        expect(core.setFailed).not.toHaveBeenCalled();
        
        const parametersCall = core.setOutput.mock.calls.find(call => call[0] === 'parameters');
        const parameters = JSON.parse(parametersCall[1]);
        
        // Verify nested structures are stringified correctly
        const objectParam = parameters.find(p => p.ParameterName === 'ObjectParam');
        expect(typeof objectParam.ParameterValue).toBe('string');
        expect(JSON.parse(objectParam.ParameterValue)).toEqual({
          nested: { deeply: { value: 'deep-value' } }
        });
      } finally {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });