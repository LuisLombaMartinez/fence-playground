# Technical Decisions

## Table of Contents

1. [Containerization](#containerization)
2. [Docker Compose Architecture](#docker-compose-architecture)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Infrastructure as Code](#infrastructure-as-code)

---

## Containerization

### Docker Build Strategy

**Backend (Python/FastAPI):**
- Single-stage build using `python:3.13-slim`
- Dependencies installed with `--no-cache-dir` to minimize image layers

**Frontend (Next.js):**
- Multi-stage build for optimal image size
- **Builder stage**: Compiles Next.js application with all dev dependencies
- **Runner stage**: Minimal runtime with only production dependencies
- Next.js standalone output mode for self-contained deployment

### Base Image Selection

**Backend**: `python:3.13-slim`
- Latest Python 3.13
- Debian-based for broad compatibility
- Slim variant reduces image size

**Frontend**: `node:22-alpine`
- Node.js 22 LTS for long-term support
- Alpine Linux for minimal footprint

---

## Docker Compose Architecture

### Dual Nginx Reverse Proxy

### Why Two Nginx Instances?

**Frontend Nginx (Public Edge)**
- Entry point for external traffic (port 8080)
- SSL/TLS termination in production
- Static asset serving and caching
- Rate limiting and security headers

**Backend Nginx (Internal Gateway)**
- API gateway pattern for backend services
- Load balancing across backend instances (can scale to multiple `backend-app` containers)
- Decouples frontend from backend container names/IPs
- Centralized logging and monitoring point
- Matches production patterns (ALB → Service)

**Load Balancing Capability**

Both Nginx instances can distribute traffic across multiple containers:
- Backend Nginx can load balance requests to multiple `backend-app` replicas
- Frontend Nginx can load balance to multiple `frontend-app` replicas
- Enables horizontal scaling without configuration changes (Docker Compose automatically updates upstream pools)
- Supports health-check based routing (unhealthy containers removed from pool)

### Network Segmentation

Two isolated Docker networks:
- `frontend-net`: Frontend app ↔ Frontend Nginx
- `backend-net`: Backend app ↔ Backend Nginx ↔ Frontend app

Frontend app is the only cross-network connection point, enforcing the gateway pattern.

### Port Exposure

Only `frontend-nginx:8080` is published to the host. All other services (`frontend-app:3000`, `backend-app:8000`, `backend-nginx:80`) are internal-only, minimizing attack surface.

### Health Checks

Dependency chain ensures proper startup order:
```
backend-app (healthy) → backend-nginx (healthy) → frontend-app → frontend-nginx
```

Backend app uses Python's `urllib` to check `/health` endpoint. Backend Nginx uses `curl` to verify proxy functionality.

## Alternative Considered

Single Nginx handling both tiers was rejected because it:
- Couples frontend and backend deployment cycles
- Complicates configuration with mixed concerns
- Makes independent tier scaling harder
- Doesn't mirror production architectures (ALB/CloudFront separation)

## Production Alignment

This setup mirrors AWS deployment patterns:
- Frontend Nginx = CloudFront/ALB for static content
- Backend Nginx = Internal ALB for service mesh
- Network segmentation = Public/private subnet architecture
- Health checks = Target group health checks

---

## CI/CD Pipeline

### Separate Workflows Strategy

Frontend and backend use independent GitHub Actions workflows that only trigger when changes are detected in their respective directories.

**Path-Based Triggering:**
- `backend-ci.yml` triggers on changes to `backend/**`
- `frontend-ci.yml` triggers on changes to `frontend/**`
- Avoids unnecessary builds and deployments
- Enables independent release cycles

### Pipeline Stages

**1. Lint and Test**
- Backend: Ruff linter + pytest
- Frontend: ESLint + TypeScript checks + build verification
- Fails fast on code quality issues
- Added simple tests to both Backend and Frontend to showcase that tests are actually run

**2. Build and Push**
- Builds Docker images using Buildx
- Pushes to Docker Hub registry
- Tags: `latest` (main), `develop`, commit SHA
- Uses layer caching for faster builds

**3. Security Scanning**
- Trivy scans for CRITICAL and HIGH vulnerabilities
- Results uploaded to GitHub Security tab
- For this challenge, security alerts were not solved due to lack of time

**4. Deployment**
- Staging: Auto-deploys from `develop` branch
- Production: Auto-deploys from `main` branch with manual approval gate

### Container Registry: Docker Hub

Docker Hub was chosen for this challenge since I already had it set up. Can be changed for ECR or other registry for production deployments with ease.

### Environment Protection

Production deployments require manual approval via GitHub Environments.


## Infrastructure as Code

Since I had no experience with Python CDK, I decided to use TypeScript CDK for this part of the challenge. I would say that the knowledge is easily transferable from one language to the other, but for the sake of fast development, I went with that. 

### Architecture Details

The infrastructure is organized into three CDK stacks:

- **NetworkStack**: VPC, subnets, dual ALBs (frontend public, backend internal), target groups, and listeners
- **ComputeStack**: ECS cluster, Fargate services, task definitions, ECR repositories, and auto-scaling configuration
- **ObservabilityStack**: CloudWatch alarms, dashboards, SNS topics, and monitoring configuration

### Key Design Decisions

- **Dual ALB Architecture**: Separate internet-facing ALB for frontend and internal ALB for backend, mirroring production patterns
- **Environment-Based Configuration**: Log retention adjusts based on environment (7 days dev/staging, 30 days production)
- **Cost Optimization**: Single NAT gateway, efficient task sizing, appropriate log retention periods

For detailed infrastructure setup and deployment instructions, see [`infra/README.md`](infra/README.md).

For monitoring, alerting, and observability strategy, see [`OBSERVABILITY.md`](OBSERVABILITY.md).

