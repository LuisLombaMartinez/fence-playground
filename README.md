# Portfolio Dashboard - DevOps Implementation

Production-ready deployment infrastructure for a FastAPI backend and Next.js frontend portfolio management system.

---

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for infrastructure deployment)
- AWS CLI configured (for cloud deployment)

### Running Locally

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fence-playground
   ```

2. **Start all services**
   ```bash
   docker compose up
   ```

3. **Access the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:8080/api/health
   - Assets endpoint: http://localhost:8080/api/assets
   - Insights endpoint: http://localhost:8080/api/insights

The application uses a dual nginx reverse proxy architecture with health checks to ensure proper startup order.

---

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     User / Browser                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │   Frontend Nginx     │  (Port 8080)
                 │   (Public Edge)      │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │   Frontend App       │  (Next.js)
                 │   (Port 3000)        │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │   Backend Nginx      │  (Internal Gateway)
                 │   (Port 80)          │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │   Backend API        │  (FastAPI)
                 │   (Port 8000)        │
                 └──────────────────────┘
```

### Key Components

- **Frontend**: Next.js 16 application with server-side rendering
- **Backend**: FastAPI REST API serving portfolio data and insights
- **Dual Nginx**: Separate reverse proxies for frontend and backend tiers
- **Network Isolation**: Segmented Docker networks for security

See [`DECISIONS.md`](DECISIONS.md) for detailed architecture decisions and rationale.

---

## ☁️ AWS Deployment

The infrastructure is defined using AWS CDK (TypeScript) and deploys to ECS Fargate with the following components:

- **VPC**: Multi-AZ setup with public/private subnets
- **Dual ALBs**: Internet-facing ALB for frontend, internal ALB for backend
- **ECS Fargate**: Serverless container orchestration
- **ECR**: Private container registries
- **CloudWatch**: Comprehensive monitoring, logging, and alerting

### Deploy to AWS

```bash
# Install dependencies
cd infra
npm install

# Bootstrap CDK (first time only)
npm run cdk bootstrap

# Deploy all stacks
npm run cdk deploy --all

# For production with 30-day log retention
npm run cdk deploy --all --context environment=prod
```

---

## 🔄 CI/CD Pipeline

Automated GitHub Actions workflows handle testing, building, and deployment:

- **Separate Workflows**: Independent pipelines for frontend and backend
- **Path-Based Triggers**: Only builds when relevant files change
- **Security Scanning**: Trivy vulnerability scanning on all images
- **Multi-Environment**: Automatic staging deploys, manual production approval

### Pipeline Stages

1. **Lint & Test**: Ruff/pytest (backend), ESLint/TypeScript/Jest (frontend)
2. **Build & Push**: Docker image builds pushed to Docker Hub
3. **Security Scan**: Trivy scans uploaded to GitHub Security
4. **Deploy**: Staging auto-deploys, production requires approval

Workflows are located in `.github/workflows/`:
- `backend-ci.yml` - Backend pipeline
- `frontend-ci.yml` - Frontend pipeline

---

## 📊 Observability

Comprehensive monitoring and alerting using AWS CloudWatch:

- **10 CloudWatch Alarms**: CPU, memory, errors, latency, health checks
- **Unified Dashboard**: Real-time metrics visualization
- **CloudWatch Logs**: Centralized logging with configurable retention
- **SNS Notifications**: Email alerts for critical issues

### Key Metrics

- Service CPU/Memory utilization
- Request counts and latency
- Error rates (4xx/5xx)
- Target health status

For monitoring strategy and alert thresholds, see [`OBSERVABILITY.md`](OBSERVABILITY.md).

---

## 🛠️ Development

### Project Structure

```
fence-playground/
├── backend/                    # FastAPI application
│   ├── app/                   # Application code
│   ├── tests/                 # pytest tests
│   ├── Dockerfile             # Production container
│   └── requirements.txt       # Python dependencies
├── frontend/                  # Next.js application
│   ├── app/                   # Next.js app router
│   ├── __tests__/             # Jest tests
│   ├── Dockerfile             # Multi-stage production build
│   └── package.json           # Node dependencies
├── infra/                     # AWS CDK infrastructure
│   ├── bin/                   # CDK app entry point
│   ├── lib/                   # Stack definitions
│   │   ├── network-stack.ts   # VPC, ALBs, networking
│   │   ├── compute-stack.ts   # ECS, containers
│   │   └── observability-stack.ts  # Monitoring
│   └── README.md              # Deployment guide
├── nginx/                     # Nginx configurations
│   ├── backend.conf           # Backend proxy config
│   └── frontend.conf          # Frontend proxy config
├── .github/workflows/         # CI/CD pipelines
├── docker-compose.yml         # Local development setup
├── DECISIONS.md               # Technical decisions
├── OBSERVABILITY.md           # Monitoring strategy
└── README.md                  # This file
```

### Running Tests

**Backend:**
```bash
cd backend
python -m pytest
```

**Frontend:**
```bash
cd frontend
npm test
```

### Building Docker Images

```bash
# Backend
docker build -t fence-backend ./backend

# Frontend
docker build -t fence-frontend ./frontend
```

---

## 🔐 Security

- **Network Isolation**: Services in private subnets, no direct internet access
- **Minimal Attack Surface**: Only frontend ALB exposed publicly
- **Security Scanning**: Automated Trivy scans in CI/CD
- **VPC Flow Logs**: Network traffic monitoring
- **Least Privilege IAM**: Minimal permissions for ECS tasks

---

## 📖 Documentation

- **[DECISIONS.md](DECISIONS.md)**: Architecture decisions and rationale
  - Containerization strategy
  - Dual nginx architecture
  - CI/CD pipeline design
  - Infrastructure choices

- **[infra/README.md](infra/README.md)**: Infrastructure deployment guide
  - AWS CDK setup
  - Deployment instructions
  - Stack structure

- **[OBSERVABILITY.md](OBSERVABILITY.md)**: Monitoring and alerting
  - Metrics and dashboards
  - Alarm configuration
  - Log aggregation
  - Response playbooks

---

## 🎯 Common Operations

### Local Development

```bash
# Start services
docker compose up

# Rebuild after code changes
docker compose up --build

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## Possible improvements

Had I had more time to play around with the project, the next steps would have been to properly set up a local testing environment for the infra stack. Tools such as DevContainers(https://containers.dev/) and LocalStack(https://docs.localstack.cloud/) serve to develop Cloud Infrastructure locally, allowing for faster development loops and better testing.

Other improvement would be using all the power that a programming language provides for setting up the infra. It would be a good idea to define classes and methods for both the Frontend and Backend services, that can be reusable for any new service that may arise.

Regarding costs, the project could also use some improvements such as implementing FARGATE_SPOT for non-production environments, as well as been more optimistic with alerting, logging and monitoring limits. 