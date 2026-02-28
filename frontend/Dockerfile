# ============================================================
#  TimesheetPro — Frontend Service
#  React 18 + Vite → Nginx Alpine · Multi-stage · K8s ready
#
#  Build & push:
#    docker build -t youruser/timesheet-frontend:1.0.0 .
#    docker push youruser/timesheet-frontend:1.0.0
#
#  NOTE: HEALTHCHECK omitted — K8s probes handle it.
# ============================================================

# ─── Stage 1: Build React app ───────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_APP_VERSION=1.0.0
ENV VITE_API_URL=$VITE_API_URL \
    VITE_APP_VERSION=$VITE_APP_VERSION

# FIX 1 (CrashLoopBackOff): Use npm install, NOT npm ci
#        npm ci requires package-lock.json — if not committed to repo, build fails
#        npm install works without it
COPY package.json ./
RUN npm install && npm cache clean --force

COPY . .
RUN npm run build

# ─── Stage 2: Serve with Nginx ──────────────────────────────────
FROM nginx:1.25-alpine AS runner

RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/conf.d/app.conf
COPY --from=builder /app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755       /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
