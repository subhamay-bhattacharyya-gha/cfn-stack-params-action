import * as core from '@actions/core';
import ConfigurationReader from './configuration-reader.js';
import { ParameterMerger } from './parameter-merger.js';
import { StackNameGenerator } from './stack-name-generator.js';
import { CiBuildIdGenerator } from './ci-build-id-generator.js';

/**
 * Main entry point for the CloudFormation Stack Parameters GitHub Action
 * Processes configuration files and generates outputs for CloudFormation deployment
 */
async function run() {
  try {
    // Get action inputs from environment variables (composite action)
    const folder = process.env.INPUT_CFN_DIRECTORY || 'cfn';
    const ciBuildInput = process.env.INPUT_CI_BUILD || 'false';
    const environment = process.env.INPUT_ENVIRONMENT || '';

    // Validate and parse ci-build input
    const isCiBuild = parseBooleanInput(ciBuildInput);

    // Validate inputs
    validateInputs(folder, isCiBuild, environment);

    core.info(`Processing CloudFormation configuration from folder: ${folder}`);
    core.info(`CI Build mode: ${isCiBuild}`);
    core.info(`Environment: ${environment || 'not specified'}`);

    // Initialize modules
    const configReader = new ConfigurationReader();
    const parameterMerger = new ParameterMerger();
    const stackNameGenerator = new StackNameGenerator();
    const ciBuildIdGenerator = new CiBuildIdGenerator();

    // Read CloudFormation configuration
    core.info('Reading CloudFormation configuration...');
    const config = await configReader.readCloudFormationConfig(folder);
    core.info(`Project: ${config.project}, Template: ${config.template}, Stack Prefix: ${config['stack-prefix']}`);

    // Read parameter files
    core.info('Reading parameter files...');
    const defaultParams = await configReader.readDefaultParameters(folder);
    core.info(`Loaded ${Object.keys(defaultParams).length} default parameters`);

    const envParams = await configReader.readEnvironmentParameters(folder, environment);
    if (envParams) {
      core.info(`Loaded ${Object.keys(envParams).length} environment-specific parameters for ${environment}`);
    } else {
      core.info('No environment-specific parameters found, using defaults only');
    }

    // Read tag files
    core.info('Reading tag files...');
    const defaultTags = await configReader.readDefaultTags(folder);
    core.info(`Loaded ${Object.keys(defaultTags).length} default tags`);

    const envTags = await configReader.readEnvironmentTags(folder, environment);
    if (envTags) {
      core.info(`Loaded ${Object.keys(envTags).length} environment-specific tags for ${environment}`);
    } else {
      core.info('No environment-specific tags found, using defaults only');
    }

    // Generate CI build ID first (needed for parameters)
    core.info('Generating CI build ID...');
    const ciBuildId = isCiBuild ? ciBuildIdGenerator.generateRandomId() : '';
    if (ciBuildId) {
      core.info(`Generated CI build ID: ${ciBuildId}`);
    } else {
      core.info('CI build ID not generated (not in CI build mode)');
    }

    // Merge parameters
    core.info('Merging parameters...');
    const mergedParams = parameterMerger.mergeParameters(defaultParams, envParams);

    // Add CiBuildId parameter if this is a CI build (with dash prefix)
    if (isCiBuild && ciBuildId) {
      mergedParams.CiBuildId = `-${ciBuildId}`;
      core.info(`Added CiBuildId parameter: -${ciBuildId}`);
    }

    const formattedParams = parameterMerger.formatForCloudFormation(mergedParams);
    core.info(`Generated ${formattedParams.length} CloudFormation parameters`);

    // Merge tags
    core.info('Merging tags...');
    const mergedTags = parameterMerger.mergeParameters(defaultTags, envTags);
    
    // Add GitHub metadata tags
    core.info('Adding GitHub metadata tags...');
    const gitCommit = process.env.GITHUB_SHA || 'unknown';
    const gitActor = process.env.GITHUB_ACTOR || 'unknown';
    const gitWorkflow = process.env.GITHUB_WORKFLOW || 'unknown';
    const gitRepository = process.env.GITHUB_REPOSITORY || 'unknown';
    const gitLastModifiedAt = new Date().toISOString();
    const [gitOrg, gitRepo] = gitRepository.split('/');
    
    mergedTags.GitCommit = gitCommit.substring(0, 8); // Short commit hash
    mergedTags.GitLastModifiedBy = gitActor;
    mergedTags.GitLastModifiedAt = gitLastModifiedAt;
    mergedTags.GitFile = gitWorkflow;
    mergedTags.GitOrg = gitOrg || 'unknown';
    mergedTags.GitRepo = gitRepo || 'unknown';
    
    core.info(`Added GitHub metadata tags: GitCommit=${mergedTags.GitCommit}, GitLastModifiedBy=${mergedTags.GitLastModifiedBy}, GitLastModifiedAt=${mergedTags.GitLastModifiedAt}, GitFile=${mergedTags.GitFile}, GitOrg=${mergedTags.GitOrg}, GitRepo=${mergedTags.GitRepo}`);
    
    const formattedTags = parameterMerger.formatTagsForCloudFormation(mergedTags);
    core.info(`Generated ${formattedTags.length} CloudFormation tags (including GitHub metadata)`);

    // Generate stack name
    core.info('Generating stack name...');
    let stackName = await stackNameGenerator.generateStackName(
      config.project,
      config['stack-prefix'],
      isCiBuild,
      environment
    );

    // Add CI build ID suffix to stack name if this is a CI build
    if (isCiBuild && ciBuildId) {
      stackName = `${stackName}-${ciBuildId}`;

      // Trim to maximum 128 characters if needed
      if (stackName.length > 128) {
        stackName = stackName.substring(0, 128);
        core.info(`Stack name trimmed to 128 characters: ${stackName}`);
      }
    }

    core.info(`Generated stack name: ${stackName}`);

    // Set action outputs
    core.info('Setting action outputs...');
    core.setOutput('parameters', JSON.stringify(formattedParams));
    core.setOutput('stack-name', stackName);
    core.setOutput('template', config.template);
    core.setOutput('tags', JSON.stringify(formattedTags));

    core.info('Action completed successfully!');

  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
    core.debug(`Error stack: ${error.stack}`);
  }
}

/**
 * Parse boolean input from GitHub Actions
 * @param {string} input - Input string from GitHub Actions
 * @returns {boolean} Parsed boolean value
 * @throws {Error} If input is not a valid boolean
 */
function parseBooleanInput(input) {
  if (!input) {
    return false; // Default to false if not provided
  }

  const normalizedInput = input.toLowerCase().trim();

  if (normalizedInput === 'true') {
    return true;
  } else if (normalizedInput === 'false') {
    return false;
  } else {
    throw new Error(`Invalid boolean value for ci-build: ${input}. Must be 'true' or 'false'`);
  }
}

/**
 * Validate action inputs
 * @param {string} folder - Folder path input
 * @param {boolean} isCiBuild - CI build flag
 * @param {string} environment - Environment input
 * @throws {Error} If inputs are invalid
 */
function validateInputs(folder, isCiBuild, environment) {
  // Validate folder input
  if (!folder || typeof folder !== 'string' || folder.trim() === '') {
    throw new Error('Folder input cannot be empty and must be a valid string');
  }

  // Check for potentially dangerous path characters
  if (folder.includes('..') || folder.includes('~') || folder.startsWith('/')) {
    throw new Error('Folder path contains potentially unsafe characters. Use relative paths only.');
  }

  // Validate folder path length (reasonable limit)
  if (folder.length > 255) {
    throw new Error('Folder path is too long. Maximum length is 255 characters.');
  }

  // If not CI build, environment is required
  if (!isCiBuild && (!environment || typeof environment !== 'string' || environment.trim() === '')) {
    throw new Error('Environment input is required when ci-build is false and must be a valid string');
  }

  // Validate environment name format if provided
  if (environment && typeof environment === 'string' && environment.trim() !== '') {
    const envName = environment.trim();

    // Check environment name length
    if (envName.length > 100) {
      throw new Error('Environment name is too long. Maximum length is 100 characters.');
    }

    // Check for valid environment name characters (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(envName)) {
      throw new Error('Environment name contains invalid characters. Only alphanumeric characters, hyphens, and underscores are allowed.');
    }
  }

  // If CI build, environment should not be used (warn but don't fail)
  if (isCiBuild && environment && environment.trim() !== '') {
    core.warning('Environment input is ignored when ci-build is true');
  }
}

// Export for testing
export { run, parseBooleanInput, validateInputs };

// Run the action if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}