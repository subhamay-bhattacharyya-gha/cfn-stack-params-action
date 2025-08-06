# Configuration Examples

This directory contains example configurations for different use cases of the CloudFormation Configuration Processor Action.

## Directory Structure

```
examples/
├── basic-web-app/          # Simple web application deployment
├── microservice/           # Microservice with database
├── multi-region/           # Multi-region deployment
└── complex-enterprise/     # Enterprise-grade configuration
```

## Example Scenarios

### 1. Basic Web Application (`basic-web-app/`)
- Simple web application with minimal parameters
- Single environment configuration
- Basic parameter overrides
- Default tags with production overrides

### 2. Microservice (`microservice/`)
- Microservice with database dependencies
- Multiple environment configurations
- Complex parameter merging
- Service-specific tags

### 3. Multi-Region (`multi-region/`)
- Deployment across multiple AWS regions
- Region-specific parameter overrides
- Environment and region matrix
- Multi-region specific tags

### 4. Complex Enterprise (`complex-enterprise/`)
- Enterprise-grade configuration
- Multiple parameter files
- Advanced parameter structures with nested objects
- Comprehensive enterprise tagging strategy

## Usage

Each example directory can be used as a template for your own configurations. Simply copy the relevant example and modify the parameters to match your requirements.

### Testing Examples

You can test any example configuration using the action:

```yaml
- name: Test Example Configuration
  uses: your-org/cfn-stack-params-action@v1
  with:
    cfn-directory: 'examples/basic-web-app'
    ci-build: 'false'
    environment: 'development'
```