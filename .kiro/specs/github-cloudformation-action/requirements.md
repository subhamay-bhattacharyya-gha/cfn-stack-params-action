# Requirements Document

## Introduction

This feature involves creating a GitHub reusable action written in JavaScript that processes CloudFormation deployment configurations. The action reads configuration files from a specified folder, merges parameter files with environment-specific overrides, and generates outputs for CloudFormation stack deployment including parameter arrays, stack names, and CI build identifiers.

## Requirements

### Requirement 1

**User Story:** As a DevOps engineer, I want to specify a folder containing CloudFormation configuration files, so that the action can process my deployment parameters and configuration.

#### Acceptance Criteria

1. WHEN the action is invoked THEN it SHALL accept an input parameter named "folder" with a default value of "cfn"
2. WHEN the action is invoked THEN it SHALL accept an input parameter named "ci-build" as a boolean (true/false)
3. WHEN the action is invoked THEN it SHALL accept an input parameter named "environment" as a string
4. WHEN the specified folder does not exist THEN the action SHALL fail with a clear error message
5. WHEN the folder parameter is not provided THEN the action SHALL use "cfn" as the default folder name

### Requirement 2

**User Story:** As a DevOps engineer, I want the action to read my CloudFormation configuration file, so that it can determine the project details and template information.

#### Acceptance Criteria

1. WHEN the action processes the folder THEN it SHALL read a file named "cloudformation.json" from the root of the specified folder
2. WHEN the cloudformation.json file is missing THEN the action SHALL fail with a clear error message
3. WHEN the cloudformation.json file is present THEN it SHALL contain the following required fields: "project", "template", and "stack-prefix"
4. WHEN the cloudformation.json file has invalid JSON format THEN the action SHALL fail with a clear error message
5. WHEN any required field is missing from cloudformation.json THEN the action SHALL fail with a clear error message

### Requirement 3

**User Story:** As a DevOps engineer, I want the action to merge default parameters with environment-specific parameters, so that I can override values for different deployment environments.

#### Acceptance Criteria

1. WHEN the action processes parameters THEN it SHALL read "default.json" from the "params" subfolder
2. WHEN the action processes parameters THEN it SHALL read the environment-specific JSON file named "{environment}.json" from the "params" subfolder
3. WHEN the default.json file is missing THEN the action SHALL fail with a clear error message
4. WHEN the environment-specific file is missing THEN the action SHALL use only the default parameters
5. WHEN both files exist THEN environment-specific parameter values SHALL override default parameter values for matching keys
6. WHEN parameter files contain invalid JSON THEN the action SHALL fail with a clear error message

### Requirement 4

**User Story:** As a DevOps engineer, I want the action to output parameters in CloudFormation format, so that I can use them directly in my deployment pipeline.

#### Acceptance Criteria

1. WHEN the action completes successfully THEN it SHALL output a "parameters" field containing a JSON array
2. WHEN generating the parameters output THEN each parameter SHALL be formatted as: {"ParameterName": "key", "ParameterValue": "value"}
3. WHEN merging parameters THEN default parameters SHALL be included in the output
4. WHEN environment-specific parameters exist THEN they SHALL override corresponding default parameters in the output
5. WHEN environment-specific parameters contain new keys THEN they SHALL be added to the output alongside default parameters

### Requirement 5

**User Story:** As a DevOps engineer, I want the action to generate appropriate stack names, so that my CloudFormation stacks are properly identified for different environments and CI builds.

#### Acceptance Criteria

1. WHEN ci-build is true THEN the stack name SHALL be formatted as: "{project}-{stack-prefix}-{feature-branch-name}"
2. WHEN ci-build is false THEN the stack name SHALL be formatted as: "{project}-{stack-prefix}-{environment}"
3. WHEN ci-build is true THEN the action SHALL determine the current feature branch name from Git
4. WHEN the action cannot determine the branch name and ci-build is true THEN it SHALL fail with a clear error message
5. WHEN generating stack names THEN all components SHALL be properly concatenated with hyphens

### Requirement 6

**User Story:** As a DevOps engineer, I want the action to generate CI build identifiers, so that I can distinguish between different CI builds and regular environment deployments.

#### Acceptance Criteria

1. WHEN ci-build is true THEN the action SHALL generate a random string of lowercase alphabets
2. WHEN ci-build is false THEN the ci-build output SHALL be an empty string
3. WHEN generating the random string THEN it SHALL contain only lowercase letters (a-z)
4. WHEN generating the random string THEN it SHALL be between 6-10 characters in length
5. WHEN ci-build is true THEN each execution SHALL generate a unique random string

### Requirement 7

**User Story:** As a DevOps engineer, I want the action to provide clear outputs, so that I can use them in subsequent workflow steps.

#### Acceptance Criteria

1. WHEN the action completes successfully THEN it SHALL set three outputs: "parameters", "stack-name", and "ci-build-id"
2. WHEN setting outputs THEN the "parameters" output SHALL be a valid JSON string
3. WHEN setting outputs THEN the "stack-name" output SHALL be a properly formatted string
4. WHEN setting outputs THEN the "ci-build-id" output SHALL be either a random string or empty string based on ci-build input
5. WHEN any error occurs THEN the action SHALL fail with descriptive error messages and appropriate exit codes