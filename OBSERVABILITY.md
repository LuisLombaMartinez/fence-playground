# Observability Strategy

This document outlines the monitoring, logging, and alerting approach for the Portfolio Dashboard application.

I chose to use the AWS native tools instead of open source solutions such as Grafana or Prometheus since in this challenge time was scarce and it simplified the set up.

---

## Table of Contents

- [Overview](#overview)
- [Logging](#logging)
- [Metrics](#metrics)
- [Alerting](#alerting)
- [Dashboards](#dashboards)
- [Cost Considerations](#cost-considerations)

---

## Overview

The observability stack is implemented using AWS CloudWatch and provides comprehensive monitoring across three layers:

1. **Application Layer**: Container logs, application metrics
2. **Infrastructure Layer**: ECS task metrics, CPU/memory utilization
3. **Network Layer**: ALB metrics, request rates, error rates, latency

All monitoring resources are defined in the `ObservabilityStack` (`infra/lib/observability-stack.ts`).

Our observability strategy implements the four golden signals:

- **Latency**: Measured via `TargetResponseTime` metrics
- **Traffic**: Measured via `RequestCount` metrics
- **Errors**: Measured via 5xx and 4xx error counts
- **Saturation**: Measured via CPU/Memory utilization

---

## Logging

### Log Aggregation

**Service**: AWS CloudWatch Logs

Both applications use CloudWatch Logs with structured logging:

- **Backend Service**: `/aws/ecs/backend` log group
- **Frontend Service**: `/aws/ecs/frontend` log group
- **Retention**: 
  - Production: 30 days
  - Staging/Dev: 7 days
- **VPC Flow Logs**: Network traffic monitoring for security and debugging

### Log Format

Applications use JSON-structured logging for easy parsing and filtering:

```json
{
  "timestamp": "2026-01-29T10:30:00Z",
  "level": "INFO",
  "service": "backend",
  "request_id": "abc123",
  "message": "Asset query completed",
  "duration_ms": 45
}
```

### Log Queries

Common CloudWatch Insights queries:

**Error Rate (Backend)**:
```
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() as error_count by bin(5m)
```

**Slow Requests**:
```
fields @timestamp, request_id, duration_ms
| filter duration_ms > 1000
| sort duration_ms desc
```

**5xx Errors**:
```
fields @timestamp, @message
| filter status >= 500
| stats count() by status
```

---

## Metrics

### Key Metrics Collected

#### 1. **Service Health Metrics**

| Metric | Description | Why |
|--------|-------------|-----|
| `CPUUtilization` | CPU usage percentage (0-100%) | Indicates compute saturation; triggers auto-scaling |
| `MemoryUtilization` | Memory usage percentage (0-100%) | Detects memory leaks or capacity issues |
| `HealthyHostCount` | Number of healthy targets | Critical for service availability |
| `UnhealthyHostCount` | Number of unhealthy targets | Early warning for service degradation |

#### 2. **Application Load Balancer Metrics**

| Metric | Description | Why |
|--------|-------------|-----|
| `RequestCount` | Total requests per 5 minutes | Traffic patterns and capacity planning |
| `TargetResponseTime` | Average response latency | User experience and performance degradation |
| `HTTPCode_Target_5XX_Count` | Server errors from application | Application health and bugs |
| `HTTPCode_Target_4XX_Count` | Client errors | API misuse or frontend issues |

#### 3. **Container Insights Metrics**

Enabled on the ECS cluster to provide:
- Task-level CPU/memory usage
- Network throughput
- Container instance metrics
- Service-level aggregated metrics

### Metrics Retention

- **Standard Metrics**: 15 months (CloudWatch default)
- **Custom Metrics**: 15 months
- **High-Resolution Metrics**: Not used (cost optimization)

---

## Alerting

### SNS Topic

All alarms publish to: `portfolio-alarms` SNS topic

**Setup Email Notifications**:
```typescript
// In infra/bin/infra.ts, uncomment and set:
alarmEmail: 'ops-team@example.com'
```

### Alarm Configuration

#### Critical Alarms (Immediate Response Required)

| Alarm | Threshold | Evaluation | Reason |
|-------|-----------|------------|--------|
| **Unhealthy Hosts** | ≥ 1 unhealthy host | 2 consecutive periods (2 min) | Service degradation or outage |
| **High 5xx Errors** | ≥ 10 errors | 1 of 2 periods (10 min) | Application bugs or infrastructure issues |
| **High Response Time** | Backend: ≥ 2s<br>Frontend: ≥ 3s | 2 of 3 periods (15 min) | Performance degradation affecting UX |

#### Warning Alarms (Investigation Required)

| Alarm | Threshold | Evaluation | Reason |
|-------|-----------|------------|--------|
| **High CPU** | ≥ 80% utilization | 2 consecutive periods (10 min) | Auto-scaling trigger, capacity planning |
| **High Memory** | ≥ 80% utilization | 2 consecutive periods (10 min) | Memory leak detection, right-sizing |

### Alarm States

- **OK**: Metric is within normal range
- **ALARM**: Threshold breached, notification sent
- **INSUFFICIENT_DATA**: Not enough data points (treated as OK)

### Response Playbooks

**5xx Errors**:
1. Check CloudWatch Logs for error stack traces
2. Review recent deployments (rollback if needed)
3. Check backend database connections
4. Verify environment variables and secrets

**High Response Time**:
1. Check if auto-scaling is triggered
2. Review CloudWatch metrics for CPU/memory saturation
3. Check database query performance
4. Verify network latency between services

**Unhealthy Hosts**:
1. Check ECS task logs for crashes
2. Verify health check endpoint responses
3. Review recent configuration changes
4. Check security group rules

---

## Dashboards

### CloudWatch Dashboard

**Dashboard Name**: `portfolio-dashboard`

**Access**: 
```bash
aws cloudwatch get-dashboard --dashboard-name portfolio-dashboard
```

Or via CDK output URL after deployment.

### Dashboard Layout

#### Row 1: Service CPU & Memory
- **Backend CPU Utilization** (0-100%)
- **Backend Memory Utilization** (0-100%)

#### Row 2: Service CPU & Memory
- **Frontend CPU Utilization** (0-100%)
- **Frontend Memory Utilization** (0-100%)

#### Row 3: Request Volume
- **Backend Request Count** (sum per 5 min)
- **Frontend Request Count** (sum per 5 min)

#### Row 4: Latency
- **Backend Response Time** (average in seconds)
- **Frontend Response Time** (average in seconds)

#### Row 5: Error Rates
- **Backend Errors** (5xx and 4xx counts)
- **Frontend Errors** (5xx and 4xx counts)

#### Row 6: Target Health
- **Backend Target Health** (healthy vs unhealthy hosts)
- **Frontend Target Health** (healthy vs unhealthy hosts)

#### Row 7: Alarm Status
- **All Alarms Overview** (status widget showing all 10 alarms)

### Dashboard Customization

To add custom metrics or modify the dashboard:

1. Edit `infra/lib/observability-stack.ts`
2. Add new widgets to the dashboard:
```typescript
this.dashboard.addWidgets(
  new cloudwatch.GraphWidget({
    title: 'Custom Metric',
    left: [myMetric],
  })
);
```
3. Redeploy: `npm run cdk deploy PortfolioObservabilityStack`

---

## Summary

This observability strategy provides:

✅ **Comprehensive monitoring** of application, infrastructure, and network layers  
✅ **Proactive alerting** with tuned thresholds to prevent alert fatigue  
✅ **Centralized dashboards** for quick operational visibility  
✅ **Cost-effective** implementation (~$21/month)  
✅ **Production-ready** configuration with room for future enhancements  

For questions or issues with monitoring, refer to the response playbooks above or contact the DevOps team.
