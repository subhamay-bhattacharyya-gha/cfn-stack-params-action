import { execSync } from 'child_process';

/**
 * StackNameGenerator class for dynamic stack name generation
 * Handles both CI build and environment-based stack naming
 */
class StackNameGenerator {
  /**
   * Generate stack name based on build type and environment
   * @param {string} project - Project name from cloudformation.json
   * @param {string} stackPrefix - Stack prefix from cloudformation.json
   * @param {boolean} isCiBuild - Whether this is a CI build
   * @param {string} environment - Environment name (used when not CI build)
   * @returns {Promise<string>} Generated stack name
   */
  async generateStackName(project, stackPrefix, isCiBuild, environment) {
    // Validate input parameters
    if (!project || typeof project !== 'string' || project.trim() === '') {
      throw new Error('Project name is required and must be a non-empty string');
    }

    if (!stackPrefix || typeof stackPrefix !== 'string' || stackPrefix.trim() === '') {
      throw new Error('Stack prefix is required and must be a non-empty string');
    }

    if (typeof isCiBuild !== 'boolean') {
      throw new Error('CI build flag must be a boolean value');
    }

    // Validate project and stack prefix format
    const validNameRegex = /^[a-zA-Z0-9-]+$/;
    if (!validNameRegex.test(project)) {
      throw new Error('Project name contains invalid characters. Only alphanumeric characters and hyphens are allowed.');
    }

    if (!validNameRegex.test(stackPrefix)) {
      throw new Error('Stack prefix contains invalid characters. Only alphanumeric characters and hyphens are allowed.');
    }

    // Check length constraints
    if (project.length > 50) {
      throw new Error(`Project name is too long (${project.length} characters). Maximum length is 50 characters.`);
    }

    if (stackPrefix.length > 50) {
      throw new Error(`Stack prefix is too long (${stackPrefix.length} characters). Maximum length is 50 characters.`);
    }

    let stackName;

    if (isCiBuild) {
      // For CI builds: {project}-{stack-prefix}-{feature-branch-name}
      const branchName = await this.getCurrentBranchName();
      const sanitizedBranchName = this.sanitizeBranchName(branchName);
      
      if (!sanitizedBranchName) {
        throw new Error('Branch name resulted in empty string after sanitization. Please use a branch name with alphanumeric characters.');
      }
      
      stackName = `${project}-${stackPrefix}-${sanitizedBranchName}`;
    } else {
      // For environment deployments: {project}-{stack-prefix}-{environment}
      if (!environment || typeof environment !== 'string' || environment.trim() === '') {
        throw new Error('Environment is required for non-CI build stack name generation and must be a non-empty string');
      }

      // Validate environment format
      if (!validNameRegex.test(environment)) {
        throw new Error('Environment name contains invalid characters. Only alphanumeric characters and hyphens are allowed.');
      }

      if (environment.length > 50) {
        throw new Error(`Environment name is too long (${environment.length} characters). Maximum length is 50 characters.`);
      }

      stackName = `${project}-${stackPrefix}-${environment}`;
    }

    // Validate final stack name length (CloudFormation limit is 128 characters)
    if (stackName.length > 128) {
      throw new Error(`Generated stack name is too long (${stackName.length} characters). CloudFormation stack names must be 128 characters or less.`);
    }

    return stackName;
  }

  /**
   * Get current Git branch name
   * @returns {Promise<string>} Current branch name
   */
  async getCurrentBranchName() {
    try {
      // Try to get branch name from Git
      const branchName = execSync('git rev-parse --abbrev-ref HEAD', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000 // 5 second timeout
      }).trim();
      
      if (!branchName || branchName === 'HEAD') {
        throw new Error('Unable to determine current branch name. You may be in a detached HEAD state or the repository may not have any commits.');
      }
      
      // Validate branch name
      if (branchName.length > 100) {
        throw new Error(`Branch name is too long (${branchName.length} characters). Maximum supported length is 100 characters.`);
      }
      
      return branchName;
    } catch (error) {
      // Provide more specific error messages based on the error type
      if (error.code === 'ENOENT') {
        throw new Error('Git command not found. Please ensure Git is installed and available in PATH.');
      } else if (error.signal === 'SIGTERM' || error.killed) {
        throw new Error('Git command timed out. The repository may be corrupted or inaccessible.');
      } else if (error.status === 128) {
        throw new Error('Not a Git repository or Git repository is corrupted. Please ensure you are running this action in a valid Git repository.');
      } else if (error.status === 129) {
        throw new Error('Invalid Git command or Git version is too old. Please ensure you have a recent version of Git installed.');
      } else if (error.message.includes('Unable to determine current branch name')) {
        throw error;
      } else if (error.message.includes('Branch name is too long')) {
        throw error;
      } else {
        throw new Error(`Failed to determine current branch name: ${error.message}. Please ensure you are in a valid Git repository with at least one commit.`);
      }
    }
  }

  /**
   * Sanitize branch name for CloudFormation compatibility
   * CloudFormation stack names must contain only letters, numbers, and hyphens
   * @param {string} branchName - Raw branch name from Git
   * @returns {string} Sanitized branch name
   */
  sanitizeBranchName(branchName) {
    if (!branchName) {
      throw new Error('Branch name cannot be empty');
    }

    // Replace any non-alphanumeric characters (except hyphens) with hyphens
    // Remove consecutive hyphens and trim leading/trailing hyphens
    return branchName
      .replace(/[^a-zA-Z0-9-]/g, '-')  // Replace invalid chars with hyphens
      .replace(/-+/g, '-')             // Replace multiple consecutive hyphens with single hyphen
      .replace(/^-+|-+$/g, '')         // Remove leading and trailing hyphens
      .toLowerCase();                  // Convert to lowercase for consistency
  }
}

export { StackNameGenerator };