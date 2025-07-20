# Troubleshooting Guide

This guide provides detailed solutions for common issues encountered when using the CloudFormation Configuration Processor Action.

## Table of Contents

- [Configuration Issues](#configuration-issues)
- [File System Issues](#file-system-issues)
- [JSON Parsing Issues](#json-parsing-issues)
- [Git Operation Issues](#git-operation-issues)
- [Parameter Merging Issues](#parameter-merging-issues)
- [Stack Naming Issues](#stack-naming-issues)
- [Permission Issues](#permission-issues)
- [Debug and Logging](#debug-and-logging)

## Configuration Issues

### Issue: "Configuration directory does not exist"

**Error Message:**
```
Error: Configuration directory 'cfn' does not exist
```

**Cause:** The specified `cfn-directory` path doesn't exist in your repository.

**Solutions:**

1. **Verify Directory Path**
   ```yaml
   # Check that the directory exists relative to repository root
   - name: List directories
     run: ls -la
   
   - name: Process CloudFormation Configuration
     uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
     with:
       cfn-directory: 'infrastructure'  # Ensure this directory exists
   ```

2. **Create Missing Directory Structure**
   ```bash
   mkdir -p infrastructure/params
   ```

3. **Check Repository Contents**
   ```yaml
   - name: Debug repository structure
     run: find . -type d -name "*cfn*" -o -name "*infrastructure*"
   ```

### Issue: "cloudformation.json not found"

**Error Message:**
```
Error: cloudformation.json not found in cfn directory
```

**Cause:** The main configuration file is missing from the specified directory.

**Solutions:**

1. **Create cloudformation.json**
   ```json
   {
     "project": "your-project-name",
     "template": "template.yaml",
     "stack-prefix": "api"
   }
   ```

2. **Verify File Location**
   ```yaml
   - name: Check configuration file
     run: ls -la cfn/cloudformation.json
   ```

3. **Check File Naming**
   - File must be named exactly `cloudformation.json` (case-sensitive)
   - Must be in the root of the specified directory

## File System Issues

### Issue: Permission denied when reading files

**Error Message:**
```
Error: EACCES: permission denied, open 'cfn/cloudformation.json'
```

**Cause:** Insufficient file permissions or files not properly committed.

**Solutions:**

1. **Check File Permissions**
   ```yaml
   - name: Check file permissions
     run: ls -la cfn/
   ```

2. **Ensure Files Are Committed**
   ```bash
   git add cfn/
   git commit -m "Add CloudFormation configuration"
   ```

3. **Fix File Permissions**
   ```bash
   chmod 644 cfn/cloudformation.json
   chmod 644 cfn/params/*.json
   ```

### Issue: Files exist locally but not in CI

**Cause:** Files are in `.gitignore` or not committed to the repository.

**Solutions:**

1. **Check .gitignore**
   ```bash
   # Ensure these patterns are NOT in .gitignore
   cfn/
   *.json
   ```

2. **Verify Files Are Tracked**
   ```bash
   git ls-files cfn/
   ```

3. **Force Add Ignored Files (if needed)**
   ```bash
   git add -f cfn/cloudformation.json
   ```

## JSON Parsing Issues

### Issue: "Invalid JSON in cloudformation.json"

**Error Message:**
```
Error: Invalid JSON in cloudformation.json: Unexpected token } in JSON at position 45
```

**Cause:** Malformed JSON syntax in configuration files.

**Solutions:**

1. **Validate JSON Syntax**
   ```bash
   # Use jq to validate JSON
   jq . cfn/cloudformation.json
   
   # Or use Python
   python -m json.tool cfn/cloudformation.json
   ```

2. **Common JSON Syntax Issues**
   ```json
   // ❌ Incorrect - trailing comma
   {
     "project": "my-app",
     "template": "template.yaml",
   }
   
   // ✅ Correct
   {
     "project": "my-app",
     "template": "template.yaml"
   }
   ```

3. **Use JSON Linting in CI**
   ```yaml
   - name: Validate JSON files
     run: |
       find cfn/ -name "*.json" -exec jq . {} \;
   ```

### Issue: "Missing required field in cloudformation.json"

**Error Message:**
```
Error: Missing required field 'project' in cloudformation.json
```

**Cause:** Required fields are missing from the configuration file.

**Solutions:**

1. **Ensure All Required Fields**
   ```json
   {
     "project": "required-field",
     "template": "required-field", 
     "stack-prefix": "required-field"
   }
   ```

2. **Validate Configuration Schema**
   ```yaml
   - name: Validate configuration
     run: |
       jq -e '.project and .template and ."stack-prefix"' cfn/cloudformation.json
   ```

## Git Operation Issues

### Issue: "Unable to determine current branch name for CI build"

**Error Message:**
```
Error: Unable to determine current branch name for CI build
```

**Cause:** Git operations failed when `ci-build` is set to `true`.

**Solutions:**

1. **Ensure Proper Checkout**
   ```yaml
   steps:
     - uses: actions/checkout@v4
       with:
         fetch-depth: 0  # Fetch full history for branch operations
     
     - name: Process CloudFormation Configuration
       uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
       with:
         ci-build: 'true'
   ```

2. **Check Git Repository State**
   ```yaml
   - name: Debug Git state
     run: |
       git branch -a
       git status
       git log --oneline -5
   ```

3. **Handle Detached HEAD State**
   ```yaml
   - name: Set branch name for detached HEAD
     run: |
       if [ "${{ github.event_name }}" = "pull_request" ]; then
         echo "GITHUB_HEAD_REF=${{ github.head_ref }}" >> $GITHUB_ENV
       fi
   ```

### Issue: "Not a Git repository"

**Error Message:**
```
Error: fatal: not a git repository (or any of the parent directories): .git
```

**Cause:** The action is running outside of a Git repository context.

**Solutions:**

1. **Ensure Repository Checkout**
   ```yaml
   - uses: actions/checkout@v4  # Required before using the action
   ```

2. **Initialize Git Repository (if needed)**
   ```yaml
   - name: Initialize Git
     run: |
       git init
       git config user.name "GitHub Actions"
       git config user.email "actions@github.com"
   ```

## Parameter Merging Issues

### Issue: Parameters not merging correctly

**Symptoms:**
- Environment-specific parameters not overriding defaults
- Missing parameters in output
- Unexpected parameter values

**Solutions:**

1. **Verify File Naming Convention**
   ```
   cfn/params/
   ├── default.json                    ✅ Correct
   ├── sb-prod-us-east-1.json         ✅ Matches environment input
   ├── prod.json                      ❌ Won't match 'sb-prod-us-east-1'
   └── sb-prod-us-east-1.JSON         ❌ Wrong case
   ```

2. **Debug Parameter Loading**
   ```yaml
   - name: Debug parameter files
     run: |
       echo "Default parameters:"
       cat cfn/params/default.json
       echo "Environment parameters:"
       cat cfn/params/${{ inputs.environment }}.json || echo "Environment file not found"
   ```

3. **Validate Parameter Structure**
   ```json
   // ✅ Correct parameter structure
   {
     "ParameterName1": "value1",
     "ParameterName2": "value2"
   }
   
   // ❌ Incorrect - nested objects not supported
   {
     "Parameters": {
       "ParameterName1": "value1"
     }
   }
   ```

### Issue: "default.json not found"

**Error Message:**
```
Error: default.json not found in cfn/params directory
```

**Cause:** The required default parameter file is missing.

**Solutions:**

1. **Create Default Parameters File**
   ```bash
   mkdir -p cfn/params
   echo '{}' > cfn/params/default.json
   ```

2. **Verify Directory Structure**
   ```yaml
   - name: Check params directory
     run: ls -la cfn/params/
   ```

## Stack Naming Issues

### Issue: Stack name contains invalid characters

**Symptoms:**
- CloudFormation deployment fails with invalid stack name
- Stack name contains special characters

**Solutions:**

1. **Use Valid Environment Names**
   ```yaml
   # ✅ Valid environment names
   environment: 'sb-prod-us-east-1'
   environment: 'development'
   environment: 'staging'
   
   # ❌ Invalid characters
   environment: 'prod_us_east_1'  # Underscores not allowed
   environment: 'prod.us.east.1'  # Dots not allowed
   ```

2. **Check Branch Name Sanitization**
   ```yaml
   - name: Debug branch name
     run: |
       echo "Current branch: $(git branch --show-current)"
       echo "Sanitized would be: $(git branch --show-current | sed 's/[^a-zA-Z0-9-]/-/g')"
   ```

3. **CloudFormation Stack Name Rules**
   - Only alphanumeric characters and hyphens
   - Must start with a letter
   - Maximum 128 characters
   - Case-sensitive

## Permission Issues

### Issue: "Access denied" or "Forbidden" errors

**Cause:** Insufficient GitHub Actions permissions.

**Solutions:**

1. **Check Workflow Permissions**
   ```yaml
   permissions:
     contents: read
     actions: read
   ```

2. **Verify Repository Access**
   ```yaml
   - uses: actions/checkout@v4
     with:
       token: ${{ secrets.GITHUB_TOKEN }}
   ```

3. **Check File Permissions in Repository**
   ```bash
   find cfn/ -type f ! -perm 644
   ```

## Debug and Logging

### Enable Debug Mode

1. **Repository Secret**
   - Go to repository Settings → Secrets and variables → Actions
   - Add secret: `ACTIONS_STEP_DEBUG` = `true`

2. **Workflow Debug**
   ```yaml
   - name: Process CloudFormation Configuration
     uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
     with:
       cfn-directory: 'cfn'
       ci-build: 'false'
       environment: 'development'
     env:
       ACTIONS_STEP_DEBUG: true
   ```

### Custom Debug Steps

```yaml
- name: Debug Environment
  run: |
    echo "Working directory: $(pwd)"
    echo "Repository structure:"
    find . -type f -name "*.json" | head -20
    echo "Environment variables:"
    env | grep -E "(GITHUB_|INPUT_)" | sort

- name: Debug Configuration
  run: |
    echo "Configuration directory contents:"
    ls -la cfn/ || echo "cfn directory not found"
    echo "Parameters directory contents:"
    ls -la cfn/params/ || echo "params directory not found"
    echo "Git status:"
    git status || echo "Not a git repository"
```

### Log Analysis

Look for these patterns in action logs:

1. **File Reading Issues**
   ```
   Error: ENOENT: no such file or directory, open 'cfn/cloudformation.json'
   ```

2. **JSON Parsing Issues**
   ```
   SyntaxError: Unexpected token } in JSON at position 45
   ```

3. **Git Operation Issues**
   ```
   fatal: not a git repository
   ```

4. **Permission Issues**
   ```
   Error: EACCES: permission denied
   ```

## Getting Additional Help

If your issue isn't covered in this guide:

1. **Check Action Logs**
   - Review the complete action logs in GitHub Actions
   - Look for specific error messages and stack traces

2. **Validate Your Configuration**
   - Test JSON files with online validators
   - Verify directory structure matches examples

3. **Test Locally**
   ```bash
   # Clone your repository
   git clone <your-repo>
   cd <your-repo>
   
   # Install dependencies
   npm install
   
   # Run tests
   npm test
   
   # Test configuration
   node -e "console.log(JSON.parse(require('fs').readFileSync('cfn/cloudformation.json')))"
   ```

4. **Create Minimal Reproduction**
   - Create a minimal example that reproduces the issue
   - Test with the basic example configurations

5. **Report Issues**
   - Open an issue on the action's GitHub repository
   - Include complete error messages and configuration files
   - Provide steps to reproduce the problem