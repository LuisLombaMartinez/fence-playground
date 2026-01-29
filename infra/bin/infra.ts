#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { ComputeStack } from '../lib/compute-stack';
import { ObservabilityStack } from '../lib/observability-stack';

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Network stack (VPC, subnets, security groups)
const networkStack = new NetworkStack(app, 'PortfolioNetworkStack', {
  env,
  description: 'Network infrastructure for Portfolio Dashboard',
});

// Compute stack (ECS, ECR)
const computeStack = new ComputeStack(app, 'PortfolioComputeStack', {
  env,
  description: 'ECS Fargate services for Portfolio Dashboard',
  vpc: networkStack.vpc,
  backendAlb: networkStack.backendAlb,
  backendTargetGroup: networkStack.backendTargetGroup,
  frontendTargetGroup: networkStack.frontendTargetGroup,
  ecsSecurityGroup: networkStack.ecsSecurityGroup,
});

// Observability stack (CloudWatch, Alarms, Dashboard)
const observabilityStack = new ObservabilityStack(app, 'PortfolioObservabilityStack', {
  env,
  description: 'Monitoring and alerting for Portfolio Dashboard',
  cluster: computeStack.cluster,
  backendService: computeStack.backendService,
  frontendService: computeStack.frontendService,
  backendAlb: networkStack.backendAlb,
  frontendAlb: networkStack.frontendAlb,
  backendTargetGroup: networkStack.backendTargetGroup,
  frontendTargetGroup: networkStack.frontendTargetGroup,
  // Optional: Add email for alarm notifications
  // alarmEmail: 'your-email@example.com',
});

// Add dependencies
computeStack.addDependency(networkStack);
observabilityStack.addDependency(computeStack);

app.synth();


