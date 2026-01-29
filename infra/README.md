# AWS CDK Infrastructure

This directory contains AWS CDK code (TypeScript) to deploy the Portfolio Dashboard to AWS using ECS Fargate.

## Architecture

- **VPC**: Custom VPC with public and private subnets across 2 availability zones
- **ECS Fargate**: Serverless container orchestration for both frontend and backend
- **Application Load Balancer**: Routes traffic to services with path-based routing
- **ECR**: Private container registries for Docker images
- **Auto Scaling**: CPU-based auto-scaling for both services (1-4 tasks)
- **CloudWatch**: Container insights and log aggregation

## Prerequisites

1. **AWS CLI** configured with credentials:
   ```bash
   aws configure
   ```

2. **Node.js and npm**

3. **Install dependencies**:
   ```bash
   cd infra
   npm install
   ```

4. **Bootstrap CDK** (first time only):
   ```bash
   npm run cdk bootstrap
   ```

## Deployment

### 1. Build the CDK app
```bash
npm run build
```

### 2. Synthesize CloudFormation template
```bash
npm run cdk synth
```

### 3. Deploy to AWS
```bash
# Deploy all stacks (staging/dev environment)
npm run cdk deploy --all

# Deploy to production with 30-day log retention
npm run cdk deploy --all --context environment=prod

# Or deploy individually
npm run cdk deploy PortfolioNetworkStack
npm run cdk deploy PortfolioComputeStack --context environment=prod
npm run cdk deploy PortfolioObservabilityStack
```

### 4. Push Docker images to ECR

After deployment, get the ECR repository URIs from outputs:

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push backend
docker tag fence-backend:latest <BACKEND_ECR_URI>:latest
docker push <BACKEND_ECR_URI>:latest

# Tag and push frontend
docker tag fence-frontend:latest <FRONTEND_ECR_URI>:latest
docker push <FRONTEND_ECR_URI>:latest
```

### 5. Update ECS services to use new images
```bash
aws ecs update-service --cluster portfolio-cluster --service backend-service --force-new-deployment
aws ecs update-service --cluster portfolio-cluster --service frontend-service --force-new-deployment
```

## Accessing the Application

After deployment, access the application via the ALB DNS name (output as `LoadBalancerDNS`):

- Frontend: `http://<ALB-DNS>/`
- Backend API: `http://<ALB-DNS>/health`
- Assets: `http://<ALB-DNS>/assets`
- Insights: `http://<ALB-DNS>/insights`

## Useful Commands

```bash
# List all stacks
npm run cdk list

# Show differences between deployed and local
npm run cdk diff

# Destroy all resources
npm run cdk destroy --all

# View CloudFormation template
npm run cdk synth PortfolioComputeStack

# Watch for changes and rebuild
npm run watch
```

## Stack Structure

- **PortfolioNetworkStack**: VPC, subnets, security groups, NAT gateway, dual ALBs, target groups
- **PortfolioComputeStack**: ECS cluster, services, task definitions, ECR repositories, auto-scaling
- **PortfolioObservabilityStack**: CloudWatch alarms, dashboard, SNS topic for notifications

## Security

- Services run in **private subnets** (no direct internet access)
- **ALB** is internet-facing in public subnets
- **Security groups** restrict traffic between components
- **IAM roles** with least-privilege permissions
- **VPC Flow Logs** enabled for monitoring

## CI/CD Integration

To use with GitHub Actions, add these secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

Update deployment step in workflows:
```yaml
- name: Deploy to ECS
  run: |
    aws ecs update-service \
      --cluster portfolio-cluster \
      --service backend-service \
      --force-new-deployment
```

## Cleanup

To avoid ongoing charges:
```bash
npm run cdk destroy --all
```

This will remove all resources created by CDK.
