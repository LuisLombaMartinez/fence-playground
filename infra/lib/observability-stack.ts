import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';

export interface ObservabilityStackProps extends cdk.StackProps {
  cluster: ecs.Cluster;
  backendService: ecs.FargateService;
  frontendService: ecs.FargateService;
  backendAlb: elbv2.ApplicationLoadBalancer;
  frontendAlb: elbv2.ApplicationLoadBalancer;
  backendTargetGroup: elbv2.ApplicationTargetGroup;
  frontendTargetGroup: elbv2.ApplicationTargetGroup;
  alarmEmail?: string;
}

export class ObservabilityStack extends cdk.Stack {
  public readonly alarmTopic: sns.Topic;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);

    const {
      cluster,
      backendService,
      frontendService,
      backendAlb,
      frontendAlb,
      backendTargetGroup,
      frontendTargetGroup,
      alarmEmail,
    } = props;

    // ========== SNS Topic for Alarms ==========
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: 'Portfolio Dashboard Alarms',
      topicName: 'portfolio-alarms',
    });

    // Add email subscription if provided
    if (alarmEmail) {
      this.alarmTopic.addSubscription(
        new subscriptions.EmailSubscription(alarmEmail)
      );
    }

    // ========== Backend Service Metrics ==========
    const backendCpuMetric = backendService.metricCpuUtilization({
      period: cdk.Duration.minutes(5),
      statistic: 'Average',
    });

    const backendMemoryMetric = backendService.metricMemoryUtilization({
      period: cdk.Duration.minutes(5),
      statistic: 'Average',
    });

    // ========== Frontend Service Metrics ==========
    const frontendCpuMetric = frontendService.metricCpuUtilization({
      period: cdk.Duration.minutes(5),
      statistic: 'Average',
    });

    const frontendMemoryMetric = frontendService.metricMemoryUtilization({
      period: cdk.Duration.minutes(5),
      statistic: 'Average',
    });

    // ========== ALB Target Group Metrics ==========
    const backendTargetResponseTime = backendTargetGroup.metrics.targetResponseTime({
      period: cdk.Duration.minutes(5),
      statistic: 'Average',
    });

    const frontendTargetResponseTime = frontendTargetGroup.metrics.targetResponseTime({
      period: cdk.Duration.minutes(5),
      statistic: 'Average',
    });

    const backendHealthyHosts = backendTargetGroup.metrics.healthyHostCount({
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    });

    const frontendHealthyHosts = frontendTargetGroup.metrics.healthyHostCount({
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    });

    const backendUnhealthyHosts = backendTargetGroup.metrics.unhealthyHostCount({
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    });

    const frontendUnhealthyHosts = frontendTargetGroup.metrics.unhealthyHostCount({
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
    });

    // ========== ALB Metrics ==========
    const backendRequestCount = backendAlb.metrics.requestCount({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    const frontendRequestCount = frontendAlb.metrics.requestCount({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    const backend5xxErrors = backendAlb.metrics.httpCodeTarget(
      elbv2.HttpCodeTarget.TARGET_5XX_COUNT,
      {
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }
    );

    const frontend5xxErrors = frontendAlb.metrics.httpCodeTarget(
      elbv2.HttpCodeTarget.TARGET_5XX_COUNT,
      {
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }
    );

    const backend4xxErrors = backendAlb.metrics.httpCodeTarget(
      elbv2.HttpCodeTarget.TARGET_4XX_COUNT,
      {
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }
    );

    const frontend4xxErrors = frontendAlb.metrics.httpCodeTarget(
      elbv2.HttpCodeTarget.TARGET_4XX_COUNT,
      {
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }
    );

    // ========== CloudWatch Alarms ==========
    // Backend CPU Alarm
    const backendCpuAlarm = new cloudwatch.Alarm(this, 'BackendHighCpuAlarm', {
      metric: backendCpuMetric,
      threshold: 80,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      alarmDescription: 'Backend service CPU utilization is above 80%',
      alarmName: 'portfolio-backend-high-cpu',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    backendCpuAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // Backend Memory Alarm
    const backendMemoryAlarm = new cloudwatch.Alarm(this, 'BackendHighMemoryAlarm', {
      metric: backendMemoryMetric,
      threshold: 80,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      alarmDescription: 'Backend service memory utilization is above 80%',
      alarmName: 'portfolio-backend-high-memory',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    backendMemoryAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // Frontend CPU Alarm
    const frontendCpuAlarm = new cloudwatch.Alarm(this, 'FrontendHighCpuAlarm', {
      metric: frontendCpuMetric,
      threshold: 80,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      alarmDescription: 'Frontend service CPU utilization is above 80%',
      alarmName: 'portfolio-frontend-high-cpu',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    frontendCpuAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // Frontend Memory Alarm
    const frontendMemoryAlarm = new cloudwatch.Alarm(this, 'FrontendHighMemoryAlarm', {
      metric: frontendMemoryMetric,
      threshold: 80,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      alarmDescription: 'Frontend service memory utilization is above 80%',
      alarmName: 'portfolio-frontend-high-memory',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    frontendMemoryAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // Backend 5xx Error Alarm
    const backend5xxAlarm = new cloudwatch.Alarm(this, 'Backend5xxErrorAlarm', {
      metric: backend5xxErrors,
      threshold: 10,
      evaluationPeriods: 2,
      datapointsToAlarm: 1,
      alarmDescription: 'Backend service is experiencing high 5xx error rate',
      alarmName: 'portfolio-backend-5xx-errors',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    backend5xxAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // Frontend 5xx Error Alarm
    const frontend5xxAlarm = new cloudwatch.Alarm(this, 'Frontend5xxErrorAlarm', {
      metric: frontend5xxErrors,
      threshold: 10,
      evaluationPeriods: 2,
      datapointsToAlarm: 1,
      alarmDescription: 'Frontend service is experiencing high 5xx error rate',
      alarmName: 'portfolio-frontend-5xx-errors',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    frontend5xxAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // Backend Response Time Alarm
    const backendResponseTimeAlarm = new cloudwatch.Alarm(this, 'BackendHighResponseTimeAlarm', {
      metric: backendTargetResponseTime,
      threshold: 2, // 2 seconds
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      alarmDescription: 'Backend service response time is above 2 seconds',
      alarmName: 'portfolio-backend-high-response-time',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    backendResponseTimeAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // Frontend Response Time Alarm
    const frontendResponseTimeAlarm = new cloudwatch.Alarm(this, 'FrontendHighResponseTimeAlarm', {
      metric: frontendTargetResponseTime,
      threshold: 3, // 3 seconds
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      alarmDescription: 'Frontend service response time is above 3 seconds',
      alarmName: 'portfolio-frontend-high-response-time',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    frontendResponseTimeAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // Backend Unhealthy Hosts Alarm
    const backendUnhealthyAlarm = new cloudwatch.Alarm(this, 'BackendUnhealthyHostsAlarm', {
      metric: backendUnhealthyHosts,
      threshold: 1,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      alarmDescription: 'Backend service has unhealthy hosts',
      alarmName: 'portfolio-backend-unhealthy-hosts',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    backendUnhealthyAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // Frontend Unhealthy Hosts Alarm
    const frontendUnhealthyAlarm = new cloudwatch.Alarm(this, 'FrontendUnhealthyHostsAlarm', {
      metric: frontendUnhealthyHosts,
      threshold: 1,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      alarmDescription: 'Frontend service has unhealthy hosts',
      alarmName: 'portfolio-frontend-unhealthy-hosts',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    frontendUnhealthyAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // ========== CloudWatch Dashboard ==========
    this.dashboard = new cloudwatch.Dashboard(this, 'PortfolioDashboard', {
      dashboardName: 'portfolio-dashboard',
    });

    // Backend Service Metrics Row
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Backend CPU Utilization',
        left: [backendCpuMetric],
        width: 12,
        leftYAxis: {
          min: 0,
          max: 100,
          label: 'Percent',
        },
      }),
      new cloudwatch.GraphWidget({
        title: 'Backend Memory Utilization',
        left: [backendMemoryMetric],
        width: 12,
        leftYAxis: {
          min: 0,
          max: 100,
          label: 'Percent',
        },
      })
    );

    // Frontend Service Metrics Row
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Frontend CPU Utilization',
        left: [frontendCpuMetric],
        width: 12,
        leftYAxis: {
          min: 0,
          max: 100,
          label: 'Percent',
        },
      }),
      new cloudwatch.GraphWidget({
        title: 'Frontend Memory Utilization',
        left: [frontendMemoryMetric],
        width: 12,
        leftYAxis: {
          min: 0,
          max: 100,
          label: 'Percent',
        },
      })
    );

    // Request Count Row
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Backend Request Count',
        left: [backendRequestCount],
        width: 12,
        leftYAxis: {
          label: 'Requests',
        },
      }),
      new cloudwatch.GraphWidget({
        title: 'Frontend Request Count',
        left: [frontendRequestCount],
        width: 12,
        leftYAxis: {
          label: 'Requests',
        },
      })
    );

    // Response Time Row
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Backend Response Time',
        left: [backendTargetResponseTime],
        width: 12,
        leftYAxis: {
          label: 'Seconds',
        },
      }),
      new cloudwatch.GraphWidget({
        title: 'Frontend Response Time',
        left: [frontendTargetResponseTime],
        width: 12,
        leftYAxis: {
          label: 'Seconds',
        },
      })
    );

    // Error Rate Row
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Backend Errors',
        left: [backend5xxErrors, backend4xxErrors],
        width: 12,
        leftYAxis: {
          label: 'Count',
        },
      }),
      new cloudwatch.GraphWidget({
        title: 'Frontend Errors',
        left: [frontend5xxErrors, frontend4xxErrors],
        width: 12,
        leftYAxis: {
          label: 'Count',
        },
      })
    );

    // Healthy/Unhealthy Hosts Row
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Backend Target Health',
        left: [backendHealthyHosts],
        right: [backendUnhealthyHosts],
        width: 12,
        leftYAxis: {
          label: 'Healthy Hosts',
        },
        rightYAxis: {
          label: 'Unhealthy Hosts',
        },
      }),
      new cloudwatch.GraphWidget({
        title: 'Frontend Target Health',
        left: [frontendHealthyHosts],
        right: [frontendUnhealthyHosts],
        width: 12,
        leftYAxis: {
          label: 'Healthy Hosts',
        },
        rightYAxis: {
          label: 'Unhealthy Hosts',
        },
      })
    );

    // Alarm Status Row
    this.dashboard.addWidgets(
      new cloudwatch.AlarmStatusWidget({
        title: 'Alarm Status',
        alarms: [
          backendCpuAlarm,
          backendMemoryAlarm,
          frontendCpuAlarm,
          frontendMemoryAlarm,
          backend5xxAlarm,
          frontend5xxAlarm,
          backendResponseTimeAlarm,
          frontendResponseTimeAlarm,
          backendUnhealthyAlarm,
          frontendUnhealthyAlarm,
        ],
        width: 24,
      })
    );

    // ========== Outputs ==========
    new cdk.CfnOutput(this, 'DashboardURL', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarmTopic.topicArn,
      description: 'SNS Topic ARN for alarms',
    });
  }
}
