# Workflow Examples

This document provides comprehensive GitHub Actions workflow examples for different deployment scenarios using the CloudFormation Configuration Processor Action.

## Table of Contents

- [Basic Deployment Workflows](#basic-deployment-workflows)
- [Advanced Deployment Patterns](#advanced-deployment-patterns)
- [CI/CD Pipeline Integration](#cicd-pipeline-integration)
- [Multi-Environment Strategies](#multi-environment-strategies)
- [Error Handling and Rollback](#error-handling-and-rollback)

## Basic Deployment Workflows

### Simple Environment Deployment

```yaml
name: Deploy to Environment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - development
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
        with:
          cfn-directory: 'infrastructure'
          ci-build: 'false'
          environment: ${{ inputs.environment }}
        id: cfn-config
      
      - name: Deploy CloudFormation Stack
        uses: aws-actions/aws-cloudformation-github-deploy@v1
        with:
          name: ${{ steps.cfn-config.outputs.stack-name }}
          template: infrastructure/template.yaml
          parameter-overrides: ${{ steps.cfn-config.outputs.parameters }}
          capabilities: CAPABILITY_IAM
          no-fail-on-empty-changeset: "1"
```

### Feature Branch CI Deployment

```yaml
name: Feature Branch Deployment

on:
  pull_request:
    branches: [main, develop]
    types: [opened, synchronize, reopened]

jobs:
  deploy-feature:
    runs-on: ubuntu-latest
    if: github.event.pull_request.draft == false
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
        with:
          cfn-directory: 'cfn'
          ci-build: 'true'
          environment: 'development'
        id: cfn-config
      
      - name: Deploy Feature Stack
        uses: aws-actions/aws-cloudformation-github-deploy@v1
        with:
          name: ${{ steps.cfn-config.outputs.stack-name }}
          template: cfn/template.yaml
          parameter-overrides: ${{ steps.cfn-config.outputs.parameters }}
          capabilities: CAPABILITY_IAM
          no-fail-on-empty-changeset: "1"
        
      - name: Comment PR with deployment info
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 **Feature deployment completed**
              
              **Stack Name:** \`${{ steps.cfn-config.outputs.stack-name }}\`
              **CI Build ID:** \`${{ steps.cfn-config.outputs.ci-build-id }}\`
              **Environment:** development
              
              The feature branch has been deployed and is ready for testing.`
            })

  cleanup-feature:
    runs-on: ubuntu-latest
    if: github.event.action == 'closed'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
        with:
          cfn-directory: 'cfn'
          ci-build: 'true'
          environment: 'development'
        id: cfn-config
      
      - name: Delete Feature Stack
        run: |
          aws cloudformation delete-stack --stack-name ${{ steps.cfn-config.outputs.stack-name }}
          aws cloudformation wait stack-delete-complete --stack-name ${{ steps.cfn-config.outputs.stack-name }}
```

## Advanced Deployment Patterns

### Multi-Region Deployment

```yaml
name: Multi-Region Deployment

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-multi-region:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        region: [us-east-1, us-west-2, eu-west-1]
        environment: [staging, production]
      fail-fast: false
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ matrix.region }}
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
        with:
          cfn-directory: 'infrastructure'
          ci-build: 'false'
          environment: '${{ matrix.environment }}-${{ matrix.region }}'
        id: cfn-config
      
      - name: Deploy to ${{ matrix.region }}
        uses: aws-actions/aws-cloudformation-github-deploy@v1
        with:
          name: ${{ steps.cfn-config.outputs.stack-name }}
          template: infrastructure/template.yaml
          parameter-overrides: ${{ steps.cfn-config.outputs.parameters }}
          capabilities: CAPABILITY_IAM,CAPABILITY_NAMED_IAM
          no-fail-on-empty-changeset: "1"
      
      - name: Verify deployment
        run: |
          aws cloudformation describe-stacks \
            --stack-name ${{ steps.cfn-config.outputs.stack-name }} \
            --query 'Stacks[0].StackStatus' \
            --output text
```

### Blue-Green Deployment

```yaml
name: Blue-Green Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options: [staging, production]
      deployment_type:
        description: 'Deployment type'
        required: true
        type: choice
        options: [blue, green]

jobs:
  deploy-blue-green:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
        with:
          cfn-directory: 'infrastructure'
          ci-build: 'false'
          environment: '${{ inputs.environment }}-${{ inputs.deployment_type }}'
        id: cfn-config
      
      - name: Deploy ${{ inputs.deployment_type }} environment
        uses: aws-actions/aws-cloudformation-github-deploy@v1
        with:
          name: ${{ steps.cfn-config.outputs.stack-name }}
          template: infrastructure/template.yaml
          parameter-overrides: ${{ steps.cfn-config.outputs.parameters }}
          capabilities: CAPABILITY_IAM
          no-fail-on-empty-changeset: "1"
      
      - name: Run health checks
        run: |
          # Add your health check logic here
          echo "Running health checks for ${{ inputs.deployment_type }} deployment"
          # curl -f https://api-${{ inputs.deployment_type }}.example.com/health
      
      - name: Switch traffic (if green deployment successful)
        if: inputs.deployment_type == 'green'
        run: |
          # Add traffic switching logic here
          echo "Switching traffic to green deployment"
```

## CI/CD Pipeline Integration

### Complete CI/CD Pipeline

```yaml
name: Complete CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run linting
        run: npm run lint
      
      - name: Validate CloudFormation templates
        run: |
          aws cloudformation validate-template --template-body file://infrastructure/template.yaml

  validate-config:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Validate JSON configuration files
        run: |
          find infrastructure/ -name "*.json" -exec jq . {} \;
      
      - name: Test configuration processing
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
        with:
          cfn-directory: 'infrastructure'
          ci-build: 'true'
          environment: 'development'
        id: test-config
      
      - name: Validate outputs
        run: |
          echo "Stack name: ${{ steps.test-config.outputs.stack-name }}"
          echo "CI build ID: ${{ steps.test-config.outputs.ci-build-id }}"
          echo "Parameters: ${{ steps.test-config.outputs.parameters }}"

  deploy-dev:
    needs: [test, validate-config]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: development
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
        with:
          cfn-directory: 'infrastructure'
          ci-build: 'false'
          environment: 'development'
        id: cfn-config
      
      - name: Deploy to Development
        uses: aws-actions/aws-cloudformation-github-deploy@v1
        with:
          name: ${{ steps.cfn-config.outputs.stack-name }}
          template: infrastructure/template.yaml
          parameter-overrides: ${{ steps.cfn-config.outputs.parameters }}
          capabilities: CAPABILITY_IAM
          no-fail-on-empty-changeset: "1"

  deploy-staging:
    needs: [test, validate-config]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
        with:
          cfn-directory: 'infrastructure'
          ci-build: 'false'
          environment: 'staging'
        id: cfn-config
      
      - name: Deploy to Staging
        uses: aws-actions/aws-cloudformation-github-deploy@v1
        with:
          name: ${{ steps.cfn-config.outputs.stack-name }}
          template: infrastructure/template.yaml
          parameter-overrides: ${{ steps.cfn-config.outputs.parameters }}
          capabilities: CAPABILITY_IAM
          no-fail-on-empty-changeset: "1"
      
      - name: Run integration tests
        run: |
          # Add integration test commands here
          echo "Running integration tests against staging"

  deploy-production:
    needs: [deploy-staging]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
        with:
          cfn-directory: 'infrastructure'
          ci-build: 'false'
          environment: 'production'
        id: cfn-config
      
      - name: Deploy to Production
        uses: aws-actions/aws-cloudformation-github-deploy@v1
        with:
          name: ${{ steps.cfn-config.outputs.stack-name }}
          template: infrastructure/template.yaml
          parameter-overrides: ${{ steps.cfn-config.outputs.parameters }}
          capabilities: CAPABILITY_IAM
          no-fail-on-empty-changeset: "1"
      
      - name: Verify production deployment
        run: |
          # Add production verification logic
          echo "Verifying production deployment"
```

## Multi-Environment Strategies

### Environment Matrix Deployment

```yaml
name: Multi-Environment Matrix Deployment

on:
  workflow_dispatch:
    inputs:
      environments:
        description: 'Environments to deploy (comma-separated)'
        required: true
        default: 'development,staging'

jobs:
  prepare:
    runs-on: ubuntu-latest
    outputs:
      environments: ${{ steps.parse.outputs.environments }}
    steps:
      - name: Parse environments
        id: parse
        run: |
          environments='["${{ github.event.inputs.environments }}"]'
          environments=$(echo $environments | sed 's/,/","/g')
          echo "environments=$environments" >> $GITHUB_OUTPUT

  deploy:
    needs: prepare
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: ${{ fromJson(needs.prepare.outputs.environments) }}
      fail-fast: false
    
    environment: ${{ matrix.environment }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
        with:
          cfn-directory: 'infrastructure'
          ci-build: 'false'
          environment: ${{ matrix.environment }}
        id: cfn-config
      
      - name: Deploy to ${{ matrix.environment }}
        uses: aws-actions/aws-cloudformation-github-deploy@v1
        with:
          name: ${{ steps.cfn-config.outputs.stack-name }}
          template: infrastructure/template.yaml
          parameter-overrides: ${{ steps.cfn-config.outputs.parameters }}
          capabilities: CAPABILITY_IAM
          no-fail-on-empty-changeset: "1"
```

### Sequential Environment Deployment

```yaml
name: Sequential Environment Deployment

on:
  workflow_dispatch:

jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    environment: development
    outputs:
      stack-name: ${{ steps.cfn-config.outputs.stack-name }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
        with:
          cfn-directory: 'infrastructure'
          ci-build: 'false'
          environment: 'development'
        id: cfn-config
      
      - name: Deploy to Development
        uses: aws-actions/aws-cloudformation-github-deploy@v1
        with:
          name: ${{ steps.cfn-config.outputs.stack-name }}
          template: infrastructure/template.yaml
          parameter-overrides: ${{ steps.cfn-config.outputs.parameters }}
          capabilities: CAPABILITY_IAM
          no-fail-on-empty-changeset: "1"

  test-dev:
    needs: deploy-dev
    runs-on: ubuntu-latest
    steps:
      - name: Run tests against development
        run: |
          echo "Testing development deployment: ${{ needs.deploy-dev.outputs.stack-name }}"
          # Add test commands here

  deploy-staging:
    needs: [deploy-dev, test-dev]
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
        with:
          cfn-directory: 'infrastructure'
          ci-build: 'false'
          environment: 'staging'
        id: cfn-config
      
      - name: Deploy to Staging
        uses: aws-actions/aws-cloudformation-github-deploy@v1
        with:
          name: ${{ steps.cfn-config.outputs.stack-name }}
          template: infrastructure/template.yaml
          parameter-overrides: ${{ steps.cfn-config.outputs.parameters }}
          capabilities: CAPABILITY_IAM
          no-fail-on-empty-changeset: "1"

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
        with:
          cfn-directory: 'infrastructure'
          ci-build: 'false'
          environment: 'production'
        id: cfn-config
      
      - name: Deploy to Production
        uses: aws-actions/aws-cloudformation-github-deploy@v1
        with:
          name: ${{ steps.cfn-config.outputs.stack-name }}
          template: infrastructure/template.yaml
          parameter-overrides: ${{ steps.cfn-config.outputs.parameters }}
          capabilities: CAPABILITY_IAM
          no-fail-on-empty-changeset: "1"
```

## Error Handling and Rollback

### Deployment with Rollback

```yaml
name: Deployment with Rollback

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options: [development, staging, production]

jobs:
  deploy-with-rollback:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
        with:
          cfn-directory: 'infrastructure'
          ci-build: 'false'
          environment: ${{ inputs.environment }}
        id: cfn-config
      
      - name: Create changeset
        id: changeset
        run: |
          changeset_name="deploy-$(date +%Y%m%d-%H%M%S)"
          echo "changeset_name=$changeset_name" >> $GITHUB_OUTPUT
          
          aws cloudformation create-change-set \
            --stack-name ${{ steps.cfn-config.outputs.stack-name }} \
            --template-body file://infrastructure/template.yaml \
            --parameters '${{ steps.cfn-config.outputs.parameters }}' \
            --capabilities CAPABILITY_IAM \
            --change-set-name $changeset_name
      
      - name: Wait for changeset creation
        run: |
          aws cloudformation wait change-set-create-complete \
            --stack-name ${{ steps.cfn-config.outputs.stack-name }} \
            --change-set-name ${{ steps.changeset.outputs.changeset_name }}
      
      - name: Describe changeset
        run: |
          aws cloudformation describe-change-set \
            --stack-name ${{ steps.cfn-config.outputs.stack-name }} \
            --change-set-name ${{ steps.changeset.outputs.changeset_name }}
      
      - name: Execute changeset
        id: deploy
        run: |
          aws cloudformation execute-change-set \
            --stack-name ${{ steps.cfn-config.outputs.stack-name }} \
            --change-set-name ${{ steps.changeset.outputs.changeset_name }}
      
      - name: Wait for deployment
        run: |
          aws cloudformation wait stack-update-complete \
            --stack-name ${{ steps.cfn-config.outputs.stack-name }}
      
      - name: Run health checks
        id: health_check
        run: |
          # Add your health check logic here
          echo "Running health checks..."
          # If health checks fail, exit with non-zero code
          # exit 1
      
      - name: Rollback on failure
        if: failure() && steps.deploy.conclusion == 'success'
        run: |
          echo "Deployment failed, initiating rollback..."
          aws cloudformation cancel-update-stack \
            --stack-name ${{ steps.cfn-config.outputs.stack-name }} || true
          
          aws cloudformation wait stack-update-rollback-complete \
            --stack-name ${{ steps.cfn-config.outputs.stack-name }} || true
      
      - name: Cleanup changeset on failure
        if: failure() && steps.changeset.conclusion == 'success'
        run: |
          aws cloudformation delete-change-set \
            --stack-name ${{ steps.cfn-config.outputs.stack-name }} \
            --change-set-name ${{ steps.changeset.outputs.changeset_name }} || true
```

### Deployment with Notifications

```yaml
name: Deployment with Notifications

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options: [development, staging, production]

jobs:
  deploy-with-notifications:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    
    steps:
      - name: Notify deployment start
        uses: 8398a7/action-slack@v3
        with:
          status: custom
          custom_payload: |
            {
              text: "🚀 Starting deployment to ${{ inputs.environment }}",
              attachments: [{
                color: "warning",
                fields: [{
                  title: "Environment",
                  value: "${{ inputs.environment }}",
                  short: true
                }, {
                  title: "Triggered by",
                  value: "${{ github.actor }}",
                  short: true
                }]
              }]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
      
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Process CloudFormation Configuration
        uses: subhamay-bhattacharyya-gha/cfn-stack-params-action@v1
        with:
          cfn-directory: 'infrastructure'
          ci-build: 'false'
          environment: ${{ inputs.environment }}
        id: cfn-config
      
      - name: Deploy CloudFormation Stack
        uses: aws-actions/aws-cloudformation-github-deploy@v1
        with:
          name: ${{ steps.cfn-config.outputs.stack-name }}
          template: infrastructure/template.yaml
          parameter-overrides: ${{ steps.cfn-config.outputs.parameters }}
          capabilities: CAPABILITY_IAM
          no-fail-on-empty-changeset: "1"
      
      - name: Notify deployment success
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: custom
          custom_payload: |
            {
              text: "✅ Deployment to ${{ inputs.environment }} completed successfully",
              attachments: [{
                color: "good",
                fields: [{
                  title: "Stack Name",
                  value: "${{ steps.cfn-config.outputs.stack-name }}",
                  short: true
                }, {
                  title: "Environment",
                  value: "${{ inputs.environment }}",
                  short: true
                }]
              }]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
      
      - name: Notify deployment failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: custom
          custom_payload: |
            {
              text: "❌ Deployment to ${{ inputs.environment }} failed",
              attachments: [{
                color: "danger",
                fields: [{
                  title: "Environment",
                  value: "${{ inputs.environment }}",
                  short: true
                }, {
                  title: "Workflow",
                  value: "${{ github.workflow }}",
                  short: true
                }]
              }]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

These workflow examples demonstrate various deployment patterns and can be adapted to your specific needs. Remember to:

1. Use `subhamay-bhattacharyya-gha/cfn-stack-params-action@main` as the action reference
2. Configure appropriate AWS credentials and permissions
3. Customize health checks and validation steps for your application
4. Set up proper GitHub environments with protection rules
5. Configure notification channels (Slack, email, etc.) as needed