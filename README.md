# ⏱️ TimesheetPro — Employee Time & Attendance Management

A production-ready full-stack timesheet application built with **React + Node.js + MongoDB**, deployed on **Kubernetes**.

---

## 🏗️ Architecture

```
                        Internet
                           │
                    ┌──────▼───────┐
                    │  K8s Ingress │ (nginx-ingress)
                    │  (Port 80/443)│
                    └──────┬───────┘
                           │
             ┌─────────────┴──────────────┐
             │                            │
     ┌───────▼──────┐            ┌────────▼──────┐
     │   Frontend   │            │    Backend    │
     │  (React/Nginx)│            │  (Node.js)    │
     │  replicas: 2 │            │  replicas: 2  │
     └──────────────┘            └────────┬──────┘
                                          │
                                 ┌────────▼──────┐
                                 │   MongoDB     │
                                 │ (StatefulSet) │
                                 │  PVC: 10Gi   │
                                 └───────────────┘
```

---

## 🚀 Features

| Feature | Description |
|---|---|
| 🕐 **Clock In/Out** | Real-time clock in/out with late detection |
| ☕ **Break Tracking** | Start/end breaks, auto-deducted from work hours |
| 📅 **Leave Management** | Apply, approve/reject leaves with balance tracking |
| 📊 **Admin Dashboard** | Department-wise attendance charts and KPIs |
| 📋 **Reports** | Attendance reports with **CSV & PDF export** |
| 👥 **Employee CRUD** | Add, edit, deactivate, reset passwords |
| 🔐 **Role-Based Access** | Admin / Manager / Employee roles |
| 📈 **Auto-scaling** | HPA scales pods based on CPU/memory |

---

## 📁 Project Structure

```
timesheet-app/
├── backend/                    # Node.js Express API
│   ├── src/
│   │   ├── controllers/        # Business logic
│   │   ├── models/             # Mongoose schemas
│   │   ├── routes/             # API routes
│   │   ├── middleware/         # Auth, error handlers
│   │   └── config/seed.js      # Database seeder
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/              # Route pages
│   │   ├── components/         # Shared components
│   │   ├── services/api.js     # Axios API layer
│   │   └── context/            # React context
│   ├── Dockerfile
│   └── nginx.conf
│
├── k8s/                        # Kubernetes manifests
│   ├── base/
│   │   ├── 01-mongodb.yaml     # MongoDB StatefulSet + PVC
│   │   ├── 02-backend.yaml     # Backend Deployment + HPA
│   │   ├── 03-frontend.yaml    # Frontend Deployment + Ingress
│   │   └── 04-policies.yaml    # NetworkPolicy + PDB
│   └── overlays/
│       └── prod/               # Production Kustomize overlay
│
├── .github/workflows/
│   └── ci-cd.yml               # GitHub Actions CI/CD
│
└── docker-compose.yml          # Local development
```

---

## ⚡ Quick Start (Local Development)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/timesheet-app.git
cd timesheet-app

# 2. Setup backend env
cp backend/.env.example backend/.env
# Edit backend/.env with your values

# 3. Start with Docker Compose
docker-compose up --build

# 4. Seed the database (new terminal)
docker exec timesheet_backend node src/config/seed.js

# 5. Open browser
open http://localhost:3000
```

### 🔑 Demo Credentials

| Role     | Email                       | Password     |
|----------|-----------------------------|--------------|
| Admin    | admin@company.com           | Admin@123    |
| Manager  | manager@company.com         | Manager@123  |
| Employee | john.doe@company.com        | Emp@1234     |

---

## ☸️ Kubernetes Deployment

### Prerequisites
```bash
# Install tools
brew install kubectl kustomize

# Verify cluster access
kubectl cluster-info
```

### Step 1: Create namespace & secrets
```bash
kubectl apply -f k8s/base/01-mongodb.yaml

# Create JWT secret securely
kubectl create secret generic backend-secret \
  --from-literal=JWT_SECRET="$(openssl rand -base64 64)" \
  -n timesheet

# Create MongoDB URI secret
kubectl create secret generic mongodb-secret \
  --from-literal=MONGO_URI="mongodb://mongo-service:27017/timesheet_db" \
  -n timesheet
```

### Step 2: Build & push your images
```bash
# Backend
docker build -t your-registry/timesheet-backend:1.0.0 ./backend
docker push your-registry/timesheet-backend:1.0.0

# Frontend
docker build -t your-registry/timesheet-frontend:1.0.0 ./frontend
docker push your-registry/timesheet-frontend:1.0.0
```

### Step 3: Update image references
```bash
# Edit k8s/base/02-backend.yaml and k8s/base/03-frontend.yaml
# Replace 'your-registry' with your actual registry
```

### Step 4: Deploy with Kustomize
```bash
# Development
kubectl apply -k k8s/base/

# Production (scaled)
kubectl apply -k k8s/overlays/prod/

# Watch deployment
kubectl get pods -n timesheet -w
```

### Step 5: Configure Ingress
```bash
# Install nginx-ingress controller (if not already)
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# Update the host in k8s/base/03-frontend.yaml
# Then re-apply
kubectl apply -k k8s/overlays/prod/
```

### Seed production database
```bash
kubectl exec -it -n timesheet $(kubectl get pod -n timesheet -l app=backend -o jsonpath='{.items[0].metadata.name}') \
  -- node src/config/seed.js
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

The pipeline runs on every push to `main`:

```
Push to main
     │
     ├─→ [test-backend]   Node.js lint & syntax check
     ├─→ [test-frontend]  Vite build
     │
     └─→ [docker-build]   Build & push images to GHCR
              │
              └─→ [deploy]   kubectl apply -k k8s/overlays/prod
                             Wait for rollout
                             Auto-rollback on failure ✅
```

### Required GitHub Secrets:
| Secret | Description |
|--------|-------------|
| `KUBECONFIG` | Base64-encoded kubeconfig for your cluster |

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register user |
| GET  | `/api/auth/me` | Get current user |

### Timesheet
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/timesheet/clock-in` | Clock in |
| POST | `/api/timesheet/clock-out` | Clock out |
| POST | `/api/timesheet/break-start` | Start break |
| POST | `/api/timesheet/break-end` | End break |
| GET  | `/api/timesheet/today` | Today's record |
| GET  | `/api/timesheet/my?month=YYYY-MM` | My timesheet |
| GET  | `/api/timesheet/all` | All timesheets (admin) |

### Leaves
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/leaves/apply` | Apply for leave |
| GET  | `/api/leaves/my` | My leave history |
| GET  | `/api/leaves/all` | All leaves (admin) |
| PUT  | `/api/leaves/:id/review` | Approve/reject |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/attendance?format=json\|csv\|pdf` | Attendance report |
| GET | `/api/reports/summary` | Dashboard summary |

---

## 🔒 Security

- JWT authentication with expiry
- Password hashing with bcrypt (12 rounds)
- Rate limiting (100 req/15min, 10 login/15min)
- Helmet.js HTTP security headers
- CORS whitelisting
- Non-root Docker containers
- K8s NetworkPolicy for pod isolation
- PodDisruptionBudget for HA

---

## 📊 Monitoring (recommended additions)

```bash
# Install Prometheus + Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# The /health endpoint exposes status for liveness/readiness probes
```

---

## 🛠️ Troubleshooting

```bash
# Check pod logs
kubectl logs -f deployment/backend -n timesheet

# Check events
kubectl describe pod -l app=backend -n timesheet

# Check MongoDB connection
kubectl exec -it statefulset/mongodb -n timesheet -- mongosh --eval "db.stats()"

# Port-forward for local debugging
kubectl port-forward svc/backend-service 5000:5000 -n timesheet
```
