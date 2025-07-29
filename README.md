# CloudFormation Configuration Processor Action

![Built with Kiro](https://img.shields.io/badge/Built%20with-Kiro-blue?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K)&nbsp;![GitHub Action](https://img.shields.io/badge/GitHub-Action-blue?logo=github)&nbsp;![Release](https://github.com/subhamay-bhattacharyya-gha/cfn-stack-params-action/actions/workflows/release.yaml/badge.svg)&nbsp;![Commit Activity](https://img.shields.io/github/commit-activity/t/subhamay-bhattacharyya-gha/cfn-stack-params-action)&nbsp;![Bash](https://img.shields.io/badge/Language-Bash-green?logo=gnubash)&nbsp;![CloudFormation](https://img.shields.io/badge/AWS-CloudFormation-orange?logo=amazonaws)&nbsp;![Last Commit](https://img.shields.io/github/last-commit/subhamay-bhattacharyya-gha/cfn-stack-params-action)&nbsp;![Release Date](https://img.shields.io/github/release-date/subhamay-bhattacharyya-gha/cfn-stack-params-action)&nbsp;![Repo Size](https://img.shields.io/github/repo-size/subhamay-bhattacharyya-gha/cfn-stack-params-action)&nbsp;![File Count](https://img.shields.io/github/directory-file-count/subhamay-bhattacharyya-gha/cfn-stack-params-action)&nbsp;![Issues](https://img.shields.io/github/issues/subhamay-bhattacharyya-gha/cfn-stack-params-action)&nbsp;![Top Language](https://img.shields.io/github/languages/top/subhamay-bhattacharyya-gha/cfn-stack-params-action)&nbsp;![Custom Endpoint](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/bsubhamay/4b247fb46db91d8488e878ac1b4d3920/raw/cfn-stack-params-action.json?)


A GitHub Action that processes CloudFormation deployment configurations, merges parameter files with environment-specific overrides, and generates outputs for CloudFormation stack deployment including parameter arrays, stack names, and CI build identifiers.

## Features

- 📁 **Flexible Configuration**: Reads CloudFormation configurations from customizable folder structures
- 🔄 **Parameter Merging**: Automatically merges default parameters with environment-specific overrides
- 🏷️ **Dynamic Stack Naming**: Generates appropriate stack names for both CI builds and environment deployments
- 🎲 **CI Build Identifiers**: Creates unique identifiers for CI builds to enable parallel deployments
- ✅ **Comprehensive Validation**: Validates JSON files and required fields with clear error messages
- 🧪 **Well Tested**: Extensive unit and integration test coverage

## Quick Start

```yaml
- name: Process CloudFormation Configuration
  uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@main
  with:
    cfn-directory: 'infrastructure'
    ci-build: 'false'
    environment: 'sb-prod-us-east-1'
  id: cfn-config

- name: Deploy CloudFormation Stack
  uses: subhamay-bhattacharyya/cfn-create-stack-action@main
  with:
    name: ${{ steps.cfn-config.outputs.stack-name }}
    template: infrastructure/template.yaml
    parameter-overrides: ${{ steps.cfn-config.outputs.parameters }}
```

## Table of Contents

- [Inputs](#inputs)
- [Outputs](#outputs)
- [Configuration Structure](#configuration-structure)
- [Usage Examples](#usage-examples)
- [Error Scenarios](#error-scenarios)
- [Troubleshooting](#troubleshooting)
- [Workflow Examples](docs/WORKFLOW_EXAMPLES.md)
- [Contributing](#contributing)
- [License](#license)

## Inputs

| Name | Description | Required | Default | Example |
|------|-------------|----------|---------|---------|
| `cfn-directory` | Folder containing CloudFormation configuration files | No | `cfn` | `infrastructure` |
| `ci-build` | Whether this is a CI build (true/false) | No | `false` | `true` |
| `environment` | Target environment name | No | `''` | `sb-prod-us-east-1` |

### Input Details

#### `cfn-directory`
Specifies the folder path (relative to repository root) containing your CloudFormation configuration files. The folder must contain:
- `cloudformation.json` - Main configuration file
- `params/` - Subfolder with parameter files

#### `ci-build`
Boolean flag that determines the stack naming strategy:
- `true`: Uses current Git branch name in stack name (for feature branch deployments)
- `false`: Uses environment name in stack name (for environment deployments)

#### `environment`
Environment identifier used for:
- Loading environment-specific parameter files (`params/{environment}.json`)
- Stack naming when `ci-build` is `false`

## Outputs

| Name | Description | Type | Example |
|------|-------------|------|---------|
| `parameters` | CloudFormation parameters in JSON array format | String | `[{"ParameterName":"VpcId","ParameterValue":"vpc-123"}]` |
| `stack-name` | Generated CloudFormation stack name | String | `myproject-api-sb-prod-us-east-1` |
| `ci-build-id` | CI build identifier (random string for CI builds, empty otherwise) | String | `abcdefgh` |

### Output Details

#### `parameters`
JSON string containing an array of CloudFormation parameters in the format:
```json
[
  {
    "ParameterName": "ParameterKey",
    "ParameterValue": "ParameterValue"
  }
]
```

#### `stack-name`
Generated stack name following these patterns:
- **CI Build**: `{project}-{stack-prefix}-{sanitized-branch-name}`
- **Environment**: `{project}-{stack-prefix}-{environment}`

#### `ci-build-id`
- **CI Build**: Random 6-10 character lowercase string (e.g., `abcdefgh`)
- **Environment**: Empty string

## Configuration Structure

Your CloudFormation configuration should follow this directory structure:

```
{cfn-directory}/
├── cloudformation.json          # Main configuration
└── params/
    ├── default.json            # Default parameters (required)
    ├── sb-devl-us-east-1.json  # Environment-specific parameters
    ├── sb-test-us-east-1.json  # Environment-specific parameters
    └── sb-prod-us-east-1.json  # Environment-specific parameters
```

### cloudformation.json

Main configuration file with required fields:

```json
{
  "project": "my-application",
  "template": "infrastructure.yaml",
  "stack-prefix": "api"
}
```

| Field | Description | Required | Example |
|-------|-------------|----------|---------|
| `project` | Project identifier used in stack naming | Yes | `my-application` |
| `template` | CloudFormation template filename | Yes | `infrastructure.yaml` |
| `stack-prefix` | Stack prefix used in stack naming | Yes | `api` |

### Parameter Files

#### default.json (Required)
Contains default parameter values that apply to all environments:

```json
{
  "VpcId": "vpc-default",
  "InstanceType": "t3.micro",
  "Environment": "default",
  "EnableLogging": true,
  "BackupRetention": 7
}
```

#### {environment}.json (Optional)
Environment-specific parameters that override defaults:

```json
{
  "VpcId": "vpc-prod-123456",
  "InstanceType": "t3.large",
  "Environment": "sb-prod-us-east-1",
  "BackupRetention": 30,
  "AlarmEmail": "alerts@company.com"
}
```

**Parameter Merging Rules:**
1. Default parameters are loaded first
2. Environment-specific parameters override matching keys
3. Environment-specific parameters can add new keys
4. Final output contains merged parameters in CloudFormation format

## Usage Examples

### Basic Environment Deployment

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@main
        with:
          cfn-directory: 'infrastructure'
          ci-build: 'false'
          environment: 'sb-prod-us-east-1'
        id: cfn-config
      
      - name: Deploy Stack
        run: |
          aws cloudformation deploy \
            --stack-name ${{ steps.cfn-config.outputs.stack-name }} \
            --template-file infrastructure/template.yaml \
            --parameter-overrides '${{ steps.cfn-config.outputs.parameters }}'
```

### CI Build with Feature Branch

```yaml
name: Feature Branch Deployment

on:
  pull_request:
    branches: [main]

jobs:
  deploy-feature:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@main
        with:
          cfn-directory: 'cfn'
          ci-build: 'true'
          environment: 'sb-devl-us-east-1'
        id: cfn-config
      
      - name: Deploy Feature Stack
        run: |
          echo "Stack Name: ${{ steps.cfn-config.outputs.stack-name }}"
          echo "CI Build ID: ${{ steps.cfn-config.outputs.ci-build-id }}"
          echo "Parameters: ${{ steps.cfn-config.outputs.parameters }}"
```

### Multi-Environment Matrix Deployment

```yaml
name: Multi-Environment Deployment

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: 
          - sb-devl-us-east-1
          - sb-test-us-east-1
          - sb-prod-us-east-1
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@main
        with:
          cfn-directory: 'infrastructure'
          ci-build: 'false'
          environment: ${{ matrix.environment }}
        id: cfn-config
      
      - name: Deploy to ${{ matrix.environment }}
        run: |
          aws cloudformation deploy \
            --stack-name ${{ steps.cfn-config.outputs.stack-name }} \
            --template-file infrastructure/template.yaml \
            --parameter-overrides '${{ steps.cfn-config.outputs.parameters }}'
```

### Custom Configuration Directory

```yaml
- name: Process CloudFormation Configuration
  uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@main
  with:
    cfn-directory: 'aws/cloudformation'
    ci-build: 'false'
    environment: 'production'
  id: cfn-config
```

## Error Scenarios

The action provides clear error messages for common issues:

### Missing Configuration Files

**Error**: Configuration directory not found
```
Error: Configuration directory 'cfn' does not exist
```

**Error**: Missing cloudformation.json
```
Error: cloudformation.json not found in cfn directory
```

**Error**: Missing default parameters
```
Error: default.json not found in cfn/params directory
```

### Invalid JSON Format

**Error**: Malformed JSON
```
Error: Invalid JSON in cloudformation.json: Unexpected token } in JSON at position 45
```

**Error**: Missing required fields
```
Error: Missing required field 'project' in cloudformation.json
```

### Git Operation Errors (CI Build Mode)

**Error**: Unable to determine branch
```
Error: Unable to determine current branch name for CI build
```

**Error**: Not a Git repository
```
Error: Current directory is not a Git repository
```

### Parameter File Issues

**Warning**: Missing environment parameters (non-fatal)
```
Warning: Environment parameter file 'sb-test-us-east-1.json' not found, using default parameters only
```

**Error**: Invalid parameter JSON
```
Error: Invalid JSON in params/default.json: Unexpected token ] in JSON at position 23
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Configuration directory does not exist"

**Cause**: The specified `cfn-directory` path doesn't exist in your repository.

**Solutions**:
1. Verify the directory path is correct relative to repository root
2. Ensure the directory is committed to your repository
3. Check for typos in the `cfn-directory` input

```yaml
# Correct
cfn-directory: 'infrastructure'  # Directory exists at repo root

# Incorrect
cfn-directory: 'infrastucture'   # Typo in directory name
```

#### Issue: "Missing required field in cloudformation.json"

**Cause**: The `cloudformation.json` file is missing required fields.

**Solution**: Ensure your `cloudformation.json` contains all required fields:

```json
{
  "project": "your-project-name",      // Required
  "template": "template.yaml",         // Required  
  "stack-prefix": "api"               // Required
}
```

#### Issue: "Unable to determine current branch name for CI build"

**Cause**: Git operations failed when `ci-build` is set to `true`.

**Solutions**:
1. Ensure you're using `actions/checkout@v4` before this action
2. Verify the repository has Git history
3. Check that the workflow has proper Git access

```yaml
steps:
  - uses: actions/checkout@v4  # Required for Git operations
  - name: Process CloudFormation Configuration
    uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@main
    with:
      ci-build: 'true'
```

#### Issue: Parameters not merging correctly

**Cause**: Parameter files have incorrect structure or naming.

**Solutions**:
1. Verify `default.json` exists in the `params/` subdirectory
2. Ensure environment parameter files are named exactly `{environment}.json`
3. Check that all JSON files have valid syntax

```
cfn/
├── cloudformation.json
└── params/
    ├── default.json                    ✅ Correct
    ├── sb-prod-us-east-1.json         ✅ Correct
    ├── prod.json                      ❌ Won't match environment 'sb-prod-us-east-1'
    └── sb-prod-us-east-1.JSON         ❌ Wrong file extension case
```

#### Issue: Stack name contains invalid characters

**Cause**: Branch names or environment names contain characters not allowed in CloudFormation stack names.

**Solution**: The action automatically sanitizes branch names, but ensure environment names follow CloudFormation naming rules:
- Only alphanumeric characters and hyphens
- Must start with a letter
- Maximum 128 characters

#### Issue: Action fails with permission errors

**Cause**: Insufficient permissions to read files or execute Git commands.

**Solutions**:
1. Ensure the workflow has proper repository permissions
2. Check that files are not in `.gitignore`
3. Verify file permissions in the repository

### Debug Mode

Enable debug logging by setting the `ACTIONS_STEP_DEBUG` secret to `true` in your repository settings. This will provide detailed logs of the action's execution.

### Getting Help

For detailed troubleshooting information, see the [Troubleshooting Guide](TROUBLESHOOTING.md).

If you encounter issues not covered in the guides:

1. Check the [Issues](https://github.com/subhamay-bhattacharyya-gha/cfn-stack-params-action/issues) page for similar problems
2. Review the action logs for detailed error messages
3. Ensure your configuration follows the documented structure
4. Test your JSON files with a JSON validator

## Best Practices

### Security Considerations

When using this action in production environments:

- **Parameter Encryption**: Store sensitive parameters in AWS Systems Manager Parameter Store or AWS Secrets Manager
- **IAM Permissions**: Use least-privilege IAM roles for CloudFormation deployments
- **Environment Isolation**: Keep environment-specific configurations in separate branches or repositories
- **Secrets Management**: Never commit sensitive values to parameter files

### Performance Optimization

- **Parameter File Size**: Keep parameter files small and focused to reduce processing time
- **CI Build Strategy**: Use `ci-build: true` for feature branches to enable parallel deployments
- **Caching**: Consider caching CloudFormation configuration files in multi-step workflows

### Monitoring and Logging

- **Stack Drift Detection**: Regularly check for configuration drift between your parameter files and deployed stacks
- **Deployment Tracking**: Use the generated `ci-build-id` for correlating logs across deployment steps
- **Error Handling**: Implement proper error handling in your workflows to catch configuration issues early

## Migration Guide

### From v1.0.x to v1.1.x

This action maintains backward compatibility. No changes required for existing workflows.

### Upgrading from Custom Scripts

If you're migrating from custom parameter processing scripts:

1. **Create Configuration Structure**: Set up the required `cloudformation.json` and `params/` directory
2. **Update Workflow**: Replace custom scripts with this action
3. **Test Environment Mapping**: Verify environment parameter files are correctly named
4. **Validate Outputs**: Ensure the generated parameters work with your CloudFormation deployment actions

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Run linting: `npm run lint`

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage
npm run test:coverage
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.