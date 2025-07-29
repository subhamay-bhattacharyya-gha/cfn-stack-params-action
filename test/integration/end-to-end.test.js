import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as core from '@actions/core';
import { run } from '../../src/main.js';
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

describe('End-to-End Integration Tests', () => {
  const testFixturesPath = path.join(process.cwd(), 'test', 'fixtures');
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Realistic Production Scenarios', () => {
    it('should handle complete microservice deployment workflow', async () => {
      // Simulate a realistic microservice deployment scenario
      const tempDir = path.join(process.cwd(), 'test', 'temp-microservice');
      
      try {
        await fs.mkdir(tempDir, { recursive: true });
        await fs.mkdir(path.join(tempDir, 'params'), { recursive: true });
        
        // Create realistic CloudFormation configuration
        const cfnConfig = {
          project: 'user-service',
          template: 'infrastructure/microservice.yaml',
          'stack-prefix': 'api'
        };
        
        await fs.writeFile(
          path.join(tempDir, 'cloudformation.json'),
          JSON.stringify(cfnConfig, null, 2)
        );
        
        // Create realistic default parameters
        const defaultParams = {
          VpcId: 'vpc-12345678',
          PrivateSubnetIds: 'subnet-12345678,subnet-87654321',
          PublicSubnetIds: 'subnet-abcdefgh,subnet-hgfedcba',
          InstanceType: 't3.micro',
          MinCapacity: 2,
          MaxCapacity: 10,
          DesiredCapacity: 2,
          DatabaseEngine: 'postgres',
          DatabaseVersion: '13.7',
          DatabaseInstanceClass: 'db.t3.micro',
          DatabaseAllocatedStorage: 20,
          DatabaseBackupRetention: 7,
          DatabaseMultiAZ: false,
          RedisNodeType: 'cache.t3.micro',
          RedisNumCacheNodes: 1,
          LogRetentionDays: 14,
          Environment: 'development',
          ProjectName: 'user-service',
          Owner: 'platform-team',
          CostCenter: 'engineering'
        };
        
        await fs.writeFile(
          path.join(tempDir, 'params', 'default.json'),
          JSON.stringify(defaultParams, null, 2)
        );
        
        // Create production environment overrides
        const prodParams = {
          InstanceType: 't3.large',
          MinCapacity: 3,
          MaxCapacity: 50,
          DesiredCapacity: 5,
          DatabaseInstanceClass: 'db.r5.large',
          DatabaseAllocatedStorage: 100,
          DatabaseBackupRetention: 30,
          DatabaseMultiAZ: true,
          RedisNodeType: 'cache.r5.large',
          RedisNumCacheNodes: 2,
          LogRetentionDays: 90,
          Environment: 'sb-prod-us-east-1',
          MonitoringEnabled: true,
          AlertingEmail: 'alerts@company.com',
          SSLCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
          DomainName: 'api.company.com',
          BackupSchedule: '0 2 * * *',
          MaintenanceWindow: 'sun:03:00-sun:04:00'
        };
        
        await fs.writeFile(
          path.join(tempDir, 'params', 'sb-prod-us-east-1.json'),
          JSON.stringify(prodParams, null, 2)
        );

        // Test production deployment
        core.getInput.mockImplementation((name) => {
          switch (name) {
            case 'cfn-directory': return tempDir;
            case 'ci-build': return 'false';
            case 'environment': return 'sb-prod-us-east-1';
            default: return '';
          }
        });

        await run();

        // Verify successful execution
        expect(core.setFailed).not.toHaveBeenCalled();
        
        // Verify all outputs are set
        expect(core.setOutput).toHaveBeenCalledWith('parameters', expect.any(String));
        expect(core.setOutput).toHaveBeenCalledWith('stack-name', 'user-service-api-sb-prod-us-east-1');
        expect(core.setOutput).toHaveBeenCalledWith('ci-build-id', '');

        // Verify parameter merging and formatting
        const parametersCall = core.setOutput.mock.calls.find(call => call[0] === 'parameters');
        const parameters = JSON.parse(parametersCall[1]);
        
        // Check production overrides
        const instanceType = parameters.find(p => p.ParameterName === 'InstanceType');
        expect(instanceType.ParameterValue).toBe('t3.large');
        
        const minCapacity = parameters.find(p => p.ParameterName === 'MinCapacity');
        expect(minCapacity.ParameterValue).toBe('3');
        
        const dbMultiAZ = parameters.find(p => p.ParameterName === 'DatabaseMultiAZ');
        expect(dbMultiAZ.ParameterValue).toBe('true');
        
        // Check production-only parameters
        const alertingEmail = parameters.find(p => p.ParameterName === 'AlertingEmail');
        expect(alertingEmail.ParameterValue).toBe('alerts@company.com');
        
        // Check default parameters that weren't overridden
        const vpcId = parameters.find(p => p.ParameterName === 'VpcId');
        expect(vpcId.ParameterValue).toBe('vpc-12345678');
        
        // Verify all parameters are properly formatted
        parameters.forEach(param => {
          expect(param).toHaveProperty('ParameterName');
          expect(param).toHaveProperty('ParameterValue');
          expect(typeof param.ParameterName).toBe('string');
          expect(typeof param.ParameterValue).toBe('string');
        });
        
      } finally {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle feature branch CI deployment workflow', async () => {
      const { execSync } = await import('child_process');
      execSync.mockReturnValue('feature/JIRA-456-implement-user-authentication\n');
      
      const tempDir = path.join(process.cwd(), 'test', 'temp-feature-branch');
      
      try {
        await fs.mkdir(tempDir, { recursive: true });
        await fs.mkdir(path.join(tempDir, 'params'), { recursive: true });
        
        // Create configuration for feature branch testing
        const cfnConfig = {
          project: 'auth-service',
          template: 'cloudformation/service.yaml',
          'stack-prefix': 'feature'
        };
        
        await fs.writeFile(
          path.join(tempDir, 'cloudformation.json'),
          JSON.stringify(cfnConfig, null, 2)
        );
        
        // Create minimal parameters for feature testing
        const defaultParams = {
          VpcId: 'vpc-test-12345',
          SubnetIds: 'subnet-test-123,subnet-test-456',
          InstanceType: 't3.nano',
          MinCapacity: 1,
          MaxCapacity: 2,
          DatabaseEngine: 'postgres',
          DatabaseInstanceClass: 'db.t3.micro',
          DatabaseAllocatedStorage: 20,
          Environment: 'feature-test',
          ProjectName: 'auth-service',
          TestDataEnabled: true,
          DebugMode: true
        };
        
        await fs.writeFile(
          path.join(tempDir, 'params', 'default.json'),
          JSON.stringify(defaultParams, null, 2)
        );

        // Test CI build deployment
        core.getInput.mockImplementation((name) => {
          switch (name) {
            case 'cfn-directory': return tempDir;
            case 'ci-build': return 'true';
            case 'environment': return 'ignored-in-ci-mode';
            default: return '';
          }
        });

        await run();

        // Verify successful execution
        expect(core.setFailed).not.toHaveBeenCalled();
        
        // Verify outputs for CI build
        expect(core.setOutput).toHaveBeenCalledWith('parameters', expect.any(String));
        expect(core.setOutput).toHaveBeenCalledWith('stack-name', 'auth-service-feature-feature-jira-456-implement-user-authentication');
        expect(core.setOutput).toHaveBeenCalledWith('ci-build-id', expect.stringMatching(/^[a-z]{6,10}$/));

        // Verify warning about ignored environment
        expect(core.warning).toHaveBeenCalledWith('Environment input is ignored when ci-build is true');
        
        // Verify parameters are correctly formatted
        const parametersCall = core.setOutput.mock.calls.find(call => call[0] === 'parameters');
        const parameters = JSON.parse(parametersCall[1]);
        
        const testDataParam = parameters.find(p => p.ParameterName === 'TestDataEnabled');
        expect(testDataParam.ParameterValue).toBe('true');
        
        const debugParam = parameters.find(p => p.ParameterName === 'DebugMode');
        expect(debugParam.ParameterValue).toBe('true');
        
      } finally {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle multi-environment deployment pipeline', async () => {
      const tempDir = path.join(process.cwd(), 'test', 'temp-multi-env');
      
      try {
        await fs.mkdir(tempDir, { recursive: true });
        await fs.mkdir(path.join(tempDir, 'params'), { recursive: true });
        
        // Create configuration
        const cfnConfig = {
          project: 'payment-service',
          template: 'infrastructure/payment-service.yaml',
          'stack-prefix': 'svc'
        };
        
        await fs.writeFile(
          path.join(tempDir, 'cloudformation.json'),
          JSON.stringify(cfnConfig, null, 2)
        );
        
        // Create default parameters
        const defaultParams = {
          VpcId: 'vpc-default',
          InstanceType: 't3.micro',
          DatabaseEngine: 'mysql',
          DatabaseVersion: '8.0',
          LogLevel: 'INFO',
          FeatureFlags: JSON.stringify({
            newPaymentFlow: false,
            enhancedSecurity: false
          })
        };
        
        await fs.writeFile(
          path.join(tempDir, 'params', 'default.json'),
          JSON.stringify(defaultParams, null, 2)
        );
        
        // Create development environment
        const devParams = {
          VpcId: 'vpc-dev-123',
          Environment: 'sb-devl-us-east-1',
          LogLevel: 'DEBUG',
          FeatureFlags: JSON.stringify({
            newPaymentFlow: true,
            enhancedSecurity: true
          })
        };
        
        await fs.writeFile(
          path.join(tempDir, 'params', 'sb-devl-us-east-1.json'),
          JSON.stringify(devParams, null, 2)
        );
        
        // Create staging environment
        const stagingParams = {
          VpcId: 'vpc-staging-456',
          Environment: 'sb-test-us-east-1',
          InstanceType: 't3.small',
          LogLevel: 'WARN',
          FeatureFlags: JSON.stringify({
            newPaymentFlow: true,
            enhancedSecurity: false
          })
        };
        
        await fs.writeFile(
          path.join(tempDir, 'params', 'sb-test-us-east-1.json'),
          JSON.stringify(stagingParams, null, 2)
        );

        // Test development deployment
        core.getInput.mockImplementation((name) => {
          switch (name) {
            case 'cfn-directory': return tempDir;
            case 'ci-build': return 'false';
            case 'environment': return 'sb-devl-us-east-1';
            default: return '';
          }
        });

        await run();

        expect(core.setFailed).not.toHaveBeenCalled();
        expect(core.setOutput).toHaveBeenCalledWith('stack-name', 'payment-service-svc-sb-devl-us-east-1');
        
        let parametersCall = core.setOutput.mock.calls.find(call => call[0] === 'parameters');
        let parameters = JSON.parse(parametersCall[1]);
        
        let logLevel = parameters.find(p => p.ParameterName === 'LogLevel');
        expect(logLevel.ParameterValue).toBe('DEBUG');
        
        // Reset mocks for staging test
        vi.clearAllMocks();
        
        // Test staging deployment
        core.getInput.mockImplementation((name) => {
          switch (name) {
            case 'cfn-directory': return tempDir;
            case 'ci-build': return 'false';
            case 'environment': return 'sb-test-us-east-1';
            default: return '';
          }
        });

        await run();

        expect(core.setFailed).not.toHaveBeenCalled();
        expect(core.setOutput).toHaveBeenCalledWith('stack-name', 'payment-service-svc-sb-test-us-east-1');
        
        parametersCall = core.setOutput.mock.calls.find(call => call[0] === 'parameters');
        parameters = JSON.parse(parametersCall[1]);
        
        logLevel = parameters.find(p => p.ParameterName === 'LogLevel');
        expect(logLevel.ParameterValue).toBe('WARN');
        
        const instanceType = parameters.find(p => p.ParameterName === 'InstanceType');
        expect(instanceType.ParameterValue).toBe('t3.small');
        
      } finally {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Performance and Scalability Tests', () => {
    it('should handle large-scale parameter sets efficiently', async () => {
      const tempDir = path.join(process.cwd(), 'test', 'temp-large-scale');
      
      try {
        await fs.mkdir(tempDir, { recursive: true });
        await fs.mkdir(path.join(tempDir, 'params'), { recursive: true });
        
        const cfnConfig = {
          project: 'large-scale-service',
          template: 'infrastructure/large-service.yaml',
          'stack-prefix': 'large'
        };
        
        await fs.writeFile(
          path.join(tempDir, 'cloudformation.json'),
          JSON.stringify(cfnConfig, null, 2)
        );
        
        // Create large parameter sets
        const largeDefaultParams = {};
        const largeEnvParams = {};
        
        for (let i = 0; i < 500; i++) {
          largeDefaultParams[`DefaultParam${i}`] = `default-value-${i}`;
          if (i % 3 === 0) {
            largeEnvParams[`DefaultParam${i}`] = `env-override-${i}`;
          }
          if (i % 5 === 0) {
            largeEnvParams[`EnvOnlyParam${i}`] = `env-only-${i}`;
          }
        }
        
        await fs.writeFile(
          path.join(tempDir, 'params', 'default.json'),
          JSON.stringify(largeDefaultParams, null, 2)
        );
        
        await fs.writeFile(
          path.join(tempDir, 'params', 'sb-large-us-east-1.json'),
          JSON.stringify(largeEnvParams, null, 2)
        );

        const startTime = Date.now();

        core.getInput.mockImplementation((name) => {
          switch (name) {
            case 'cfn-directory': return tempDir;
            case 'ci-build': return 'false';
            case 'environment': return 'sb-large-us-east-1';
            default: return '';
          }
        });

        await run();

        const endTime = Date.now();
        const executionTime = endTime - startTime;

        // Verify successful execution
        expect(core.setFailed).not.toHaveBeenCalled();
        
        // Verify performance (should complete within reasonable time)
        expect(executionTime).toBeLessThan(5000); // 5 seconds max
        
        // Verify correct parameter count
        const parametersCall = core.setOutput.mock.calls.find(call => call[0] === 'parameters');
        const parameters = JSON.parse(parametersCall[1]);
        
        // Should have 500 default params + env-only params
        const envOnlyCount = Math.floor(500 / 5);
        expect(parameters.length).toBe(500 + envOnlyCount);
        
        // Verify some overrides worked correctly
        const overriddenParam = parameters.find(p => p.ParameterName === 'DefaultParam0');
        expect(overriddenParam.ParameterValue).toBe('env-override-0');
        
      } finally {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
  });
});