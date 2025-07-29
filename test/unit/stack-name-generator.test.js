import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StackNameGenerator } from '../../src/stack-name-generator.js';
import { execSync } from 'child_process';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

describe('StackNameGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new StackNameGenerator();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateStackName', () => {
    describe('CI build mode', () => {
      it('should generate stack name with branch name for CI builds', async () => {
        execSync.mockReturnValue('feature/user-auth\n');
        
        const result = await generator.generateStackName('myproject', 'api', true, 'dev');
        
        expect(result).toBe('myproject-api-feature-user-auth');
        expect(execSync).toHaveBeenCalledWith('git rev-parse --abbrev-ref HEAD', {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      });

      it('should sanitize branch names with special characters', async () => {
        execSync.mockReturnValue('feature/fix_bug@123\n');
        
        const result = await generator.generateStackName('myproject', 'api', true, 'dev');
        
        expect(result).toBe('myproject-api-feature-fix-bug-123');
      });

      it('should handle branch names with multiple consecutive special characters', async () => {
        execSync.mockReturnValue('feature///fix___bug\n');
        
        const result = await generator.generateStackName('myproject', 'api', true, 'dev');
        
        expect(result).toBe('myproject-api-feature-fix-bug');
      });

      it('should throw error when git command fails', async () => {
        execSync.mockImplementation(() => {
          throw new Error('Git command failed');
        });
        
        await expect(generator.generateStackName('myproject', 'api', true, 'dev'))
          .rejects.toThrow('Failed to determine current branch name: Git command failed');
      });

      it('should throw error when branch name is HEAD (detached state)', async () => {
        execSync.mockReturnValue('HEAD\n');
        
        await expect(generator.generateStackName('myproject', 'api', true, 'dev'))
          .rejects.toThrow('Unable to determine current branch name');
      });

      it('should throw error when branch name is empty', async () => {
        execSync.mockReturnValue('\n');
        
        await expect(generator.generateStackName('myproject', 'api', true, 'dev'))
          .rejects.toThrow('Unable to determine current branch name');
      });
    });

    describe('Environment deployment mode', () => {
      it('should generate stack name with environment for non-CI builds', async () => {
        const result = await generator.generateStackName('myproject', 'api', false, 'production');
        
        expect(result).toBe('myproject-api-production');
        expect(execSync).not.toHaveBeenCalled();
      });

      it('should handle different environment names', async () => {
        const environments = ['dev', 'test', 'staging', 'prod'];
        
        for (const env of environments) {
          const result = await generator.generateStackName('myproject', 'api', false, env);
          expect(result).toBe(`myproject-api-${env}`);
        }
      });

      it('should throw error when environment is missing for non-CI builds', async () => {
        await expect(generator.generateStackName('myproject', 'api', false, ''))
          .rejects.toThrow('Environment is required for non-CI build stack name generation');
        
        await expect(generator.generateStackName('myproject', 'api', false, null))
          .rejects.toThrow('Environment is required for non-CI build stack name generation');
        
        await expect(generator.generateStackName('myproject', 'api', false, undefined))
          .rejects.toThrow('Environment is required for non-CI build stack name generation');
      });
    });

    describe('Input validation', () => {
      it('should throw error when project is missing or invalid', async () => {
        await expect(generator.generateStackName('', 'api', false, 'dev'))
          .rejects.toThrow('Project name is required and must be a non-empty string');
        
        await expect(generator.generateStackName(null, 'api', false, 'dev'))
          .rejects.toThrow('Project name is required and must be a non-empty string');
        
        await expect(generator.generateStackName(undefined, 'api', false, 'dev'))
          .rejects.toThrow('Project name is required and must be a non-empty string');
        
        await expect(generator.generateStackName(123, 'api', false, 'dev'))
          .rejects.toThrow('Project name is required and must be a non-empty string');
        
        await expect(generator.generateStackName('   ', 'api', false, 'dev'))
          .rejects.toThrow('Project name is required and must be a non-empty string');
      });

      it('should throw error when stack prefix is missing or invalid', async () => {
        await expect(generator.generateStackName('myproject', '', false, 'dev'))
          .rejects.toThrow('Stack prefix is required and must be a non-empty string');
        
        await expect(generator.generateStackName('myproject', null, false, 'dev'))
          .rejects.toThrow('Stack prefix is required and must be a non-empty string');
        
        await expect(generator.generateStackName('myproject', undefined, false, 'dev'))
          .rejects.toThrow('Stack prefix is required and must be a non-empty string');
        
        await expect(generator.generateStackName('myproject', 123, false, 'dev'))
          .rejects.toThrow('Stack prefix is required and must be a non-empty string');
        
        await expect(generator.generateStackName('myproject', '   ', false, 'dev'))
          .rejects.toThrow('Stack prefix is required and must be a non-empty string');
      });

      it('should throw error when CI build flag is not boolean', async () => {
        await expect(generator.generateStackName('myproject', 'api', 'true', 'dev'))
          .rejects.toThrow('CI build flag must be a boolean value');
        
        await expect(generator.generateStackName('myproject', 'api', 1, 'dev'))
          .rejects.toThrow('CI build flag must be a boolean value');
        
        await expect(generator.generateStackName('myproject', 'api', null, 'dev'))
          .rejects.toThrow('CI build flag must be a boolean value');
      });

      it('should throw error for invalid project name characters', async () => {
        await expect(generator.generateStackName('my_project', 'api', false, 'dev'))
          .rejects.toThrow('Project name contains invalid characters');
        
        await expect(generator.generateStackName('my.project', 'api', false, 'dev'))
          .rejects.toThrow('Project name contains invalid characters');
        
        await expect(generator.generateStackName('my project', 'api', false, 'dev'))
          .rejects.toThrow('Project name contains invalid characters');
        
        await expect(generator.generateStackName('my@project', 'api', false, 'dev'))
          .rejects.toThrow('Project name contains invalid characters');
      });

      it('should throw error for invalid stack prefix characters', async () => {
        await expect(generator.generateStackName('myproject', 'api_v1', false, 'dev'))
          .rejects.toThrow('Stack prefix contains invalid characters');
        
        await expect(generator.generateStackName('myproject', 'api.v1', false, 'dev'))
          .rejects.toThrow('Stack prefix contains invalid characters');
        
        await expect(generator.generateStackName('myproject', 'api v1', false, 'dev'))
          .rejects.toThrow('Stack prefix contains invalid characters');
      });

      it('should throw error for project name that is too long', async () => {
        const longProject = 'a'.repeat(51);
        await expect(generator.generateStackName(longProject, 'api', false, 'dev'))
          .rejects.toThrow('Project name is too long (51 characters). Maximum length is 50 characters.');
      });

      it('should throw error for stack prefix that is too long', async () => {
        const longPrefix = 'a'.repeat(51);
        await expect(generator.generateStackName('myproject', longPrefix, false, 'dev'))
          .rejects.toThrow('Stack prefix is too long (51 characters). Maximum length is 50 characters.');
      });

      it('should throw error for environment name that is too long', async () => {
        const longEnv = 'a'.repeat(51);
        await expect(generator.generateStackName('myproject', 'api', false, longEnv))
          .rejects.toThrow('Environment name is too long (51 characters). Maximum length is 50 characters.');
      });

      it('should throw error for invalid environment name characters', async () => {
        await expect(generator.generateStackName('myproject', 'api', false, 'dev_env'))
          .rejects.toThrow('Environment name contains invalid characters');
        
        await expect(generator.generateStackName('myproject', 'api', false, 'dev.env'))
          .rejects.toThrow('Environment name contains invalid characters');
        
        await expect(generator.generateStackName('myproject', 'api', false, 'dev env'))
          .rejects.toThrow('Environment name contains invalid characters');
      });

      it('should throw error when environment is missing for non-CI builds', async () => {
        await expect(generator.generateStackName('myproject', 'api', false, ''))
          .rejects.toThrow('Environment is required for non-CI build stack name generation and must be a non-empty string');
        
        await expect(generator.generateStackName('myproject', 'api', false, null))
          .rejects.toThrow('Environment is required for non-CI build stack name generation and must be a non-empty string');
        
        await expect(generator.generateStackName('myproject', 'api', false, undefined))
          .rejects.toThrow('Environment is required for non-CI build stack name generation and must be a non-empty string');
        
        await expect(generator.generateStackName('myproject', 'api', false, 123))
          .rejects.toThrow('Environment is required for non-CI build stack name generation and must be a non-empty string');
      });

      it('should throw error when generated stack name is too long', async () => {
        const longProject = 'a'.repeat(50);
        const longPrefix = 'b'.repeat(50);
        const longEnv = 'c'.repeat(50);
        
        await expect(generator.generateStackName(longProject, longPrefix, false, longEnv))
          .rejects.toThrow('Generated stack name is too long');
      });

      it('should accept valid names', async () => {
        await expect(generator.generateStackName('my-project', 'api-v1', false, 'dev-env'))
          .resolves.toBe('my-project-api-v1-dev-env');
        
        await expect(generator.generateStackName('project123', 'api456', false, 'env789'))
          .resolves.toBe('project123-api456-env789');
      });
    });
  });

  describe('getCurrentBranchName', () => {
    it('should return current branch name', async () => {
      execSync.mockReturnValue('main\n');
      
      const result = await generator.getCurrentBranchName();
      
      expect(result).toBe('main');
      expect(execSync).toHaveBeenCalledWith('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000
      });
    });

    it('should trim whitespace from branch name', async () => {
      execSync.mockReturnValue('  feature/test  \n');
      
      const result = await generator.getCurrentBranchName();
      
      expect(result).toBe('feature/test');
    });

    it('should throw error when git command is not found', async () => {
      const error = new Error('Command not found');
      error.code = 'ENOENT';
      execSync.mockImplementation(() => {
        throw error;
      });
      
      await expect(generator.getCurrentBranchName())
        .rejects.toThrow('Git command not found. Please ensure Git is installed and available in PATH.');
    });

    it('should throw error when git command times out', async () => {
      const error = new Error('Command timed out');
      error.signal = 'SIGTERM';
      error.killed = true;
      execSync.mockImplementation(() => {
        throw error;
      });
      
      await expect(generator.getCurrentBranchName())
        .rejects.toThrow('Git command timed out. The repository may be corrupted or inaccessible.');
    });

    it('should throw error when not in a git repository', async () => {
      const error = new Error('Not a git repository');
      error.status = 128;
      execSync.mockImplementation(() => {
        throw error;
      });
      
      await expect(generator.getCurrentBranchName())
        .rejects.toThrow('Not a Git repository or Git repository is corrupted. Please ensure you are running this action in a valid Git repository.');
    });

    it('should throw error when git version is too old', async () => {
      const error = new Error('Invalid command');
      error.status = 129;
      execSync.mockImplementation(() => {
        throw error;
      });
      
      await expect(generator.getCurrentBranchName())
        .rejects.toThrow('Invalid Git command or Git version is too old. Please ensure you have a recent version of Git installed.');
    });

    it('should throw error when branch name is HEAD (detached state)', async () => {
      execSync.mockReturnValue('HEAD');
      
      await expect(generator.getCurrentBranchName())
        .rejects.toThrow('Unable to determine current branch name. You may be in a detached HEAD state or the repository may not have any commits.');
    });

    it('should throw error when branch name is empty', async () => {
      execSync.mockReturnValue('');
      
      await expect(generator.getCurrentBranchName())
        .rejects.toThrow('Unable to determine current branch name. You may be in a detached HEAD state or the repository may not have any commits.');
    });

    it('should throw error when branch name is too long', async () => {
      const longBranchName = 'a'.repeat(101);
      execSync.mockReturnValue(longBranchName);
      
      await expect(generator.getCurrentBranchName())
        .rejects.toThrow('Branch name is too long (101 characters). Maximum supported length is 100 characters.');
    });

    it('should handle various git error scenarios', async () => {
      const genericError = new Error('Some other git error');
      execSync.mockImplementation(() => {
        throw genericError;
      });
      
      await expect(generator.getCurrentBranchName())
        .rejects.toThrow('Failed to determine current branch name: Some other git error. Please ensure you are in a valid Git repository with at least one commit.');
    });

    it('should accept branch names at maximum length', async () => {
      const maxLengthBranch = 'a'.repeat(100);
      execSync.mockReturnValue(maxLengthBranch);
      
      const result = await generator.getCurrentBranchName();
      expect(result).toBe(maxLengthBranch);
    });
  });

  describe('sanitizeBranchName', () => {
    it('should replace special characters with hyphens', () => {
      expect(generator.sanitizeBranchName('feature/user-auth')).toBe('feature-user-auth');
      expect(generator.sanitizeBranchName('fix_bug@123')).toBe('fix-bug-123');
      expect(generator.sanitizeBranchName('test.branch')).toBe('test-branch');
      expect(generator.sanitizeBranchName('branch with spaces')).toBe('branch-with-spaces');
    });

    it('should handle multiple consecutive special characters', () => {
      expect(generator.sanitizeBranchName('feature///fix___bug')).toBe('feature-fix-bug');
      expect(generator.sanitizeBranchName('test@@@branch')).toBe('test-branch');
      expect(generator.sanitizeBranchName('branch   with   spaces')).toBe('branch-with-spaces');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(generator.sanitizeBranchName('-feature-branch-')).toBe('feature-branch');
      expect(generator.sanitizeBranchName('---test---')).toBe('test');
      expect(generator.sanitizeBranchName('/feature/')).toBe('feature');
    });

    it('should convert to lowercase', () => {
      expect(generator.sanitizeBranchName('Feature/USER-AUTH')).toBe('feature-user-auth');
      expect(generator.sanitizeBranchName('MAIN')).toBe('main');
      expect(generator.sanitizeBranchName('Test_Branch')).toBe('test-branch');
    });

    it('should preserve valid characters', () => {
      expect(generator.sanitizeBranchName('feature-123')).toBe('feature-123');
      expect(generator.sanitizeBranchName('main')).toBe('main');
      expect(generator.sanitizeBranchName('v1-2-3')).toBe('v1-2-3');
    });

    it('should handle edge cases', () => {
      expect(generator.sanitizeBranchName('a')).toBe('a');
      expect(generator.sanitizeBranchName('123')).toBe('123');
      expect(generator.sanitizeBranchName('feature-branch-name-with-many-parts')).toBe('feature-branch-name-with-many-parts');
    });

    it('should throw error for empty branch name', () => {
      expect(() => generator.sanitizeBranchName('')).toThrow('Branch name cannot be empty');
      expect(() => generator.sanitizeBranchName(null)).toThrow('Branch name cannot be empty');
      expect(() => generator.sanitizeBranchName(undefined)).toThrow('Branch name cannot be empty');
    });

    it('should handle branch names that become empty after sanitization', () => {
      expect(generator.sanitizeBranchName('---')).toBe('');
      expect(generator.sanitizeBranchName('///')).toBe('');
      expect(generator.sanitizeBranchName('@@@')).toBe('');
    });
  });
});