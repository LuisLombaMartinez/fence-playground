import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface ComputeStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  backendAlb: elbv2.ApplicationLoadBalancer;
  backendTargetGroup: elbv2.ApplicationTargetGroup;
  frontendTargetGroup: elbv2.ApplicationTargetGroup;
  ecsSecurityGroup: ec2.SecurityGroup;
}

export class ComputeStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly backendRepository: ecr.Repository;
  public readonly frontendRepository: ecr.Repository;
  public readonly backendService: ecs.FargateService;
  public readonly frontendService: ecs.FargateService;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const { vpc, backendAlb, backendTargetGroup, frontendTargetGroup, ecsSecurityGroup } = props;

    // ========== ECR Repositories ==========
    this.backendRepository = new ecr.Repository(this, 'BackendRepository', {
      repositoryName: 'portfolio-backend',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          description: 'Keep last 10 images',
          maxImageCount: 10,
        },
      ],
    });

    this.frontendRepository = new ecr.Repository(this, 'FrontendRepository', {
      repositoryName: 'portfolio-frontend',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          description: 'Keep last 10 images',
          maxImageCount: 10,
        },
      ],
    });

    // ========== ECS Cluster ==========
    this.cluster = new ecs.Cluster(this, 'PortfolioCluster', {
      vpc,
      clusterName: 'portfolio-cluster',
      containerInsights: true,
    });

    // ========== Backend Service ==========
    const backendTaskDef = new ecs.FargateTaskDefinition(this, 'BackendTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    // Determine log retention based on environment
    const isProd = this.node.tryGetContext('environment') === 'prod';
    const logRetention = isProd ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK;

    const backendContainer = backendTaskDef.addContainer('BackendContainer', {
      image: ecs.ContainerImage.fromEcrRepository(this.backendRepository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'backend',
        logRetention: logRetention,
      }),
      environment: {
        PORT: '8000',
      },
    });

    backendContainer.addPortMappings({
      containerPort: 8000,
      protocol: ecs.Protocol.TCP,
    });

    this.backendService = new ecs.FargateService(this, 'BackendService', {
      cluster: this.cluster,
      taskDefinition: backendTaskDef,
      serviceName: 'backend-service',
      desiredCount: 1,
      assignPublicIp: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [ecsSecurityGroup],
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    });

    this.backendService.attachToApplicationTargetGroup(backendTargetGroup);

    // ========== Frontend Service ==========
    const frontendTaskDef = new ecs.FargateTaskDefinition(this, 'FrontendTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    const frontendContainer = frontendTaskDef.addContainer('FrontendContainer', {
      image: ecs.ContainerImage.fromEcrRepository(this.frontendRepository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'frontend',
        logRetention: logRetention,
      }),
      environment: {
        NEXT_PUBLIC_API_URL: `http://${backendAlb.loadBalancerDnsName}`,
        PORT: '3000',
      },
    });

    frontendContainer.addPortMappings({
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    this.frontendService = new ecs.FargateService(this, 'FrontendService', {
      cluster: this.cluster,
      taskDefinition: frontendTaskDef,
      serviceName: 'frontend-service',
      desiredCount: 1,
      assignPublicIp: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [ecsSecurityGroup],
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    });

    this.frontendService.attachToApplicationTargetGroup(frontendTargetGroup);

    // ========== Auto Scaling ==========
    const backendScaling = this.backendService.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 4,
    });

    backendScaling.scaleOnCpuUtilization('BackendCpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    const frontendScaling = this.frontendService.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 4,
    });

    frontendScaling.scaleOnCpuUtilization('FrontendCpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // ========== Outputs ==========
    new cdk.CfnOutput(this, 'BackendRepositoryUri', {
      value: this.backendRepository.repositoryUri,
      description: 'Backend ECR Repository URI',
    });

    new cdk.CfnOutput(this, 'FrontendRepositoryUri', {
      value: this.frontendRepository.repositoryUri,
      description: 'Frontend ECR Repository URI',
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster Name',
    });
  }
}
