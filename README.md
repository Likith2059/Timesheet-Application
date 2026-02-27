# ⏱️ TimesheetPro

Full-stack Employee Time & Attendance Management System.

**Stack:** React 18 + Node.js + MongoDB  
**Deploy:** Kubernetes (K8s)

---

## ✅ Updates in This Version

| Change | Detail |
|--------|--------|
| `MONGO_URI` hostname | `mongo-service` (K8s DNS) |
| No `HEALTHCHECK` in Dockerfiles | K8s `livenessProbe` + `readinessProbe` handle health |
| No Docker Compose | K8s only |
| Nginx proxy target | `http://backend-service:5000` (K8s DNS) |

---

## 🏗️ Architecture

```
Internet → K8s Ingress (nginx)
               │
    ┌──────────┴──────────┐
    │                     │
 /api/*              / (SPA)
    │                     │
backend-service    frontend-service
 (Node.js)          (Nginx/React)
    │
mongo-service
 (MongoDB StatefulSet)
```

### K8s DNS Resolution
```
mongo-service      → mongodb://mongo-service:27017/timesheet_db
backend-service    → http://backend-service:5000  (used in nginx.conf)
frontend-service   → port 80
```

---

## 🚀 Deploy to Kubernetes

### Step 1: Create namespace
```bash
kubectl apply -f k8s/base/01-mongodb.yaml
```

### Step 2: Create secrets
```bash
# JWT Secret
kubectl create secret generic backend-secret \
  --from-literal=JWT_SECRET="$(openssl rand -base64 64)" \
  -n timesheet

# Verify MONGO_URI in ConfigMap (already set to mongo-service)
kubectl get configmap backend-config -n timesheet -o yaml
```

### Step 3: Build & push images
```bash
# Backend
docker build -t youruser/timesheet-backend:1.0.0 ./backend
docker push youruser/timesheet-backend:1.0.0

# Frontend
docker build -t youruser/timesheet-frontend:1.0.0 ./frontend
docker push youruser/timesheet-frontend:1.0.0
```

### Step 4: Update image names
Edit `k8s/base/02-backend.yaml` and `k8s/base/03-frontend.yaml`:
```yaml
image: youruser/timesheet-backend:1.0.0   # ← your Docker Hub/ECR image
image: youruser/timesheet-frontend:1.0.0  # ← your Docker Hub/ECR image
```

### Step 5: Deploy
```bash
# Apply everything
kubectl apply -k k8s/base/

# OR production overlay (3 replicas)
kubectl apply -k k8s/overlays/prod/

# Watch pods come up
kubectl get pods -n timesheet -w
```

### Step 6: Seed database
```bash
kubectl exec -it -n timesheet \
  $(kubectl get pod -n timesheet -l app=backend -o jsonpath='{.items[0].metadata.name}') \
  -- node src/config/seed.js
```

### Step 7: Update Ingress host
Edit `k8s/base/03-frontend.yaml`:
```yaml
rules:
  - host: timesheet.yourdomain.com   # ← your domain
```

---

## 🔑 Demo Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@company.com | Admin@123 |
| Manager | manager@company.com | Manager@123 |
| Employee | john.doe@company.com | Emp@1234 |

---

## 🔧 Troubleshooting

```bash
# Check pod status
kubectl get pods -n timesheet

# View logs
kubectl logs -f deployment/backend  -n timesheet
kubectl logs -f deployment/frontend -n timesheet
kubectl logs -f statefulset/mongodb -n timesheet

# Test MongoDB connection from backend pod
kubectl exec -it deployment/backend -n timesheet \
  -- node -e "const m=require('mongoose'); m.connect(process.env.MONGO_URI).then(()=>console.log('✅ Connected')).catch(console.error)"

# Port-forward for local debugging
kubectl port-forward svc/backend-service 5000:5000 -n timesheet
kubectl port-forward svc/frontend-service 3000:80  -n timesheet

# Describe pod for events
kubectl describe pod -l app=backend -n timesheet
```

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/register` | Admin | Register user |
| POST | `/api/timesheet/clock-in` | Employee | Clock in |
| POST | `/api/timesheet/clock-out` | Employee | Clock out |
| POST | `/api/timesheet/break-start` | Employee | Start break |
| POST | `/api/timesheet/break-end` | Employee | End break |
| GET  | `/api/timesheet/today` | Employee | Today's record |
| GET  | `/api/timesheet/my` | Employee | My history |
| GET  | `/api/timesheet/all` | Admin/Manager | All records |
| POST | `/api/leaves/apply` | Employee | Apply leave |
| GET  | `/api/leaves/my` | Employee | My leaves |
| PUT  | `/api/leaves/:id/review` | Admin/Manager | Approve/reject |
| GET  | `/api/reports/attendance?format=csv` | Admin/Manager | Export CSV |
| GET  | `/api/reports/attendance?format=pdf` | Admin/Manager | Export PDF |
| GET  | `/health` | — | Health check (used by K8s probes) |
