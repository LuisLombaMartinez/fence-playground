import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly backendAlb: elbv2.ApplicationLoadBalancer;
  public readonly frontendAlb: elbv2.ApplicationLoadBalancer;
  public readonly backendTargetGroup: elbv2.ApplicationTargetGroup;
  public readonly frontendTargetGroup: elbv2.ApplicationTargetGroup;
  public readonly frontendAlbSecurityGroup: ec2.SecurityGroup;
  public readonly backendAlbSecurityGroup: ec2.SecurityGroup;
  public readonly ecsSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC with public and private subnets across 2 AZs
    this.vpc = new ec2.Vpc(this, 'PortfolioVpc', {
      maxAzs: 2,
      natGateways: 1, // Cost optimization: single NAT gateway
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    // VPC Flow Logs for network monitoring
    this.vpc.addFlowLog('VpcFlowLog', {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(),
    });

    // ========== Security Groups ==========
    // Frontend ALB Security Group (Internet-facing)
    this.frontendAlbSecurityGroup = new ec2.SecurityGroup(this, 'FrontendAlbSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for frontend ALB',
      allowAllOutbound: true,
    });

    this.frontendAlbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP from internet'
    );

    this.frontendAlbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS from internet'
    );

    // Backend ALB Security Group (Internal)
    this.backendAlbSecurityGroup = new ec2.SecurityGroup(this, 'BackendAlbSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for backend ALB (internal)',
      allowAllOutbound: true,
    });

    // ECS Security Group
    this.ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for ECS tasks',
      allowAllOutbound: true,
    });

    // Allow Frontend ALB to reach Frontend ECS tasks
    this.ecsSecurityGroup.addIngressRule(
      this.frontendAlbSecurityGroup,
      ec2.Port.tcp(3000),
      'Allow frontend ALB to reach frontend tasks'
    );

    // Allow Backend ALB to reach Backend ECS tasks
    this.ecsSecurityGroup.addIngressRule(
      this.backendAlbSecurityGroup,
      ec2.Port.tcp(8000),
      'Allow backend ALB to reach backend tasks'
    );

    // Allow Frontend ECS tasks to reach Backend ALB
    this.backendAlbSecurityGroup.addIngressRule(
      this.ecsSecurityGroup,
      ec2.Port.tcp(80),
      'Allow frontend tasks to reach backend ALB'
    );

    // ========== Application Load Balancers ==========
    // Backend ALB (Internal)
    this.backendAlb = new elbv2.ApplicationLoadBalancer(this, 'BackendALB', {
      vpc: this.vpc,
      internetFacing: false,
      loadBalancerName: 'portfolio-backend-alb',
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroup: this.backendAlbSecurityGroup,
    });

    // Frontend ALB (Internet-facing)
    this.frontendAlb = new elbv2.ApplicationLoadBalancer(this, 'FrontendALB', {
      vpc: this.vpc,
      internetFacing: true,
      loadBalancerName: 'portfolio-frontend-alb',
      securityGroup: this.frontendAlbSecurityGroup,
    });

    // ========== Target Groups ==========
    // Backend Target Group
    this.backendTargetGroup = new elbv2.ApplicationTargetGroup(this, 'BackendTargetGroup', {
      vpc: this.vpc,
      port: 8000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // Frontend Target Group
    this.frontendTargetGroup = new elbv2.ApplicationTargetGroup(this, 'FrontendTargetGroup', {
      vpc: this.vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // ========== ALB Listeners ==========
    // Backend ALB Listener (Internal)
    this.backendAlb.addListener('BackendListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.forward([this.backendTargetGroup]),
    });

    // Frontend ALB Listener (Public)
    this.frontendAlb.addListener('FrontendListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.forward([this.frontendTargetGroup]),
    });

    // ========== Outputs ==========
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: 'PortfolioVpcId',
    });

    new cdk.CfnOutput(this, 'FrontendLoadBalancerDNS', {
      value: this.frontendAlb.loadBalancerDnsName,
      description: 'Frontend Application Load Balancer DNS (Public)',
      exportName: 'PortfolioFrontendALBDns',
    });

    new cdk.CfnOutput(this, 'BackendLoadBalancerDNS', {
      value: this.backendAlb.loadBalancerDnsName,
      description: 'Backend Application Load Balancer DNS (Internal)',
      exportName: 'PortfolioBackendALBDns',
    });
  }
}
