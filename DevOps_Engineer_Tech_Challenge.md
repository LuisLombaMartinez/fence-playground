# DevOps Engineer Tech Challenge

## Overview

This exercise is designed to serve as the basis for a technical discussion in the next interview step. It is not intended to take more than **2–4 hours**. Please prioritize clarity of thought and decision-making over completeness or perfection.

> 🤖 **AI Usage**
>
> Feel free to use AI tools (ChatGPT, Claude, Copilot, Cursor, etc.) to complete this challenge as we work this way in Fence.

---

## Context

You're joining a fintech platform that manages asset-backed lending operations. The development team has built two applications:

1. **Backend API** (FastAPI/Python) - serves financial asset data and portfolio metrics
2. **Dashboard** (Next.js) - displays metrics and asset tables for portfolio managers

Your task is to **prepare these applications for production deployment**. The applications are functional but have no infrastructure, CI/CD, or operational tooling.

---

## Application Example

We provide this minimal implementation, but you can use another one with a similar scaffolding, use one of your own or any other public one with similar structure:

### Backend (FastAPI)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── models.py
│   └── services.py
├── requirements.txt
└── README.md
```

**`app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models import Asset, Insight, HealthResponse
from app.services import get_assets, calculate_insights

app = FastAPI(title="Portfolio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="healthy", version="1.0.0")

@app.get("/assets", response_model=list[Asset])
def list_assets():
    return get_assets()

@app.get("/insights", response_model=list[Insight])
def list_insights():
    assets = get_assets()
    return calculate_insights(assets)
```

**`app/models.py`**

```python
from pydantic import BaseModel
from datetime import date
from typing import Literal

class Asset(BaseModel):
    id: str
    nominal_value: float
    status: Literal["active", "defaulted", "paid"]
    due_date: date

class Insight(BaseModel):
    id: str
    name: str
    value: float

class HealthResponse(BaseModel):
    status: str
    version: str
```

**`app/services.py`**

```python
from datetime import date, timedelta
import random
from app.models import Asset, Insight

def get_assets() -> list[Asset]:
    """Returns mock asset data. In production, this would query a database."""
    random.seed(42)  # Consistent data for demo
    statuses = ["active", "defaulted", "paid"]
    assets = []
    
    for i in range(20):
        status = random.choices(statuses, weights=[0.6, 0.2, 0.2])[0]
        due_date = date.today() + timedelta(days=random.randint(-90, 180))
        assets.append(Asset(
            id=f"asset-{i+1:03d}",
            nominal_value=round(random.uniform(1000, 50000), 2),
            status=status,
            due_date=due_date,
        ))
    return assets

def calculate_insights(assets: list[Asset]) -> list[Insight]:
    """Calculate portfolio metrics from assets."""
    total_value = sum(a.nominal_value for a in assets)
    active_assets = [a for a in assets if a.status == "active"]
    defaulted_assets = [a for a in assets if a.status == "defaulted"]
    paid_assets = [a for a in assets if a.status == "paid"]
    
    default_rate = len(defaulted_assets) / len(assets) if assets else 0
    outstanding_debt = sum(a.nominal_value for a in active_assets)
    collection_rate = sum(a.nominal_value for a in paid_assets) / total_value if total_value else 0
    
    return [
        Insight(id="insight-001", name="total_portfolio_value", value=round(total_value, 2)),
        Insight(id="insight-002", name="default_rate", value=round(default_rate, 4)),
        Insight(id="insight-003", name="outstanding_debt", value=round(outstanding_debt, 2)),
        Insight(id="insight-004", name="collection_rate", value=round(collection_rate, 4)),
    ]
```

**`requirements.txt`**

```
fastapi==0.109.0
uvicorn==0.27.0
pydantic==2.5.3
```

---

### Frontend (Next.js)

```
frontend/
├── src/
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx
│       └── components/
│           ├── InsightsPanel.tsx
│           └── AssetsTable.tsx
├── package.json
├── next.config.js
└── README.md
```

**`src/app/page.tsx`**

```tsx
import { InsightsPanel } from './components/InsightsPanel';
import { AssetsTable } from './components/AssetsTable';

async function getAssets() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/assets`, {
        cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch assets');
    return res.json();
}

async function getInsights() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/insights`, {
        cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch insights');
    return res.json();
}

export default async function Home() {
    const [assets, insights] = await Promise.all([getAssets(), getInsights()]);

    return (
        <main className="container mx-auto p-8">
            <h1 className="text-3xl font-bold mb-8">Portfolio Dashboard</h1>
            <InsightsPanel insights={insights} />
            <AssetsTable assets={assets} />
        </main>
    );
}
```

**`package.json`** (relevant parts)

```json
{
    "name": "portfolio-dashboard",
    "version": "1.0.0",
    "scripts": {
        "dev": "next dev",
        "build": "next build",
        "start": "next start",
        "lint": "next lint"
    },
    "dependencies": {
        "next": "14.1.0",
        "react": "18.2.0",
        "react-dom": "18.2.0"
    }
}
```

> 💡 **Note**
>
> The provided applications are intentionally simple. Your job is NOT to improve the application code, but to prepare the infrastructure and deployment pipeline.

---

## Deliverables

### 1. Containerization

Create production-ready Dockerfiles for both applications.

---

### 2. Local Development Environment

Create a Docker Compose setup for local development.

**Minimum Requirements:**

- [ ] Both services running and communicating

**Minimum Deliverables:**

- `docker-compose.yml`

---

### 3. CI/CD Pipeline

Create a GitHub Actions workflow (or equivalent tooling) for build, test, and deploy.

**Requirements:**

- [ ] Lint and test stages
- [ ] Build Docker images
- [ ] Push to container registry (ECR, Docker Hub, or GHCR)
- [ ] (Optional) Security scanning (container and/or dependency scanning)
- [ ] Deploy to staging (can be mocked/documented)
- [ ] Manual approval gate for production (can be documented)

**Deliverables:**

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml` (or combined)

---

### 4. Infrastructure as Code (Choose ONE)

Define cloud infrastructure for deploying both applications.

| Option | Description |
|--------|-------------|
| **Option A: AWS CDK (Python)** | ECS Fargate services, ALB, ECR, basic VPC |
| **Option B: Terraform** | ECS Fargate or equivalent, load balancer, networking |
| **Option C: Detailed Architecture Doc** | If time-constrained: document the target architecture with diagrams and resource specifications |

**Requirements (for Option A or B):**

- [ ] Container orchestration (ECS Fargate, EKS, or equivalent)
- [ ] Load balancer with health checks
- [ ] Container registry
- [ ] Basic networking (VPC, subnets, security groups)
- [ ] Environment variable / secrets management approach

**Deliverables:**

- `infra/` directory with CDK or Terraform code
- OR `ARCHITECTURE.md` with detailed diagrams and specifications

---

### 5. Observability Setup

Define monitoring, logging, and alerting configuration.

**Minimum Requirements:**

- [ ] Structured logging configuration for both applications

**Deliverables:**

- Logging configuration in Dockerfiles or app config
- `OBSERVABILITY.md` documenting:
  - Metrics to collect and why
  - Alerting rules and thresholds if any.
  - Dashboard layout/panels if any.
  - Log aggregation approach if any.

---

### 6. Documentation

**README.md** with:

- [ ] **Setup Instructions**: How to run locally with Docker Compose
- [ ] **Architecture Overview**: How the components connect
- [ ] **Deployment Guide**: How to deploy to production
- [ ] **Runbook if any**: Common operational tasks (scaling, rollback, debugging)
- [ ] **Key Decisions**: What you chose and why (base images, IaC tool, CI structure)

---

> 💡 **Note**
>
> We value working configurations over perfect ones. A Docker Compose that runs and a CI pipeline that builds is better than elaborate IaC that we can't validate.

---

## Bonus Points (Optional)

If you have extra time in this order:

- [ ] **Automated testing** for infrastructure (e.g., container structure tests)
- [ ] **Cost estimation** for the proposed AWS architecture
- [ ] **Security hardening** beyond basics (WAF rules, network policies)
- [ ] **Terraform modules** with reusable components
- [ ] **Kubernetes manifests** in addition to Docker Compose

---

## Submission

Please provide:

1. A GitHub repository (public or private with access granted to interviewers)
2. All deliverables listed above
3. Working `docker-compose up` command that runs both services

**Deadline:** Please submit within 2 business days of receiving this challenge.

---

## Questions?

If you have any questions about the requirements, please reach out. We're happy to clarify any ambiguities. Asking good questions is part of the evaluation.

---

## Quick Reference: Expected Repository Structure

```
your-submission/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── services.py
│   ├── Dockerfile
│   ├── .dockerignore
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
├── infra/  # CDK, Terraform, or architecture docs
│   └── ...
├── .github/
│   └── workflows/
│       └── ci.yml
├── docker-compose.yml
├── .env.example
├── README.md
├── DECISIONS.md (optional or as part of README.md)
└── OBSERVABILITY.md (optional or as part of README.md)
```

---

Good luck! We look forward to reviewing your submission and discussing your approach.