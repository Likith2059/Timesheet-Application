# ============================================================
#  TimesheetPro — Frontend Service
#  React 18 + Vite → Nginx Alpine · Multi-stage · K8s ready
#
#  Build:
#    docker build -t timesheet-frontend:1.0.0 .
#
#  NOTE: HEALTHCHECK is intentionally omitted.
#        K8s livenessProbe + readinessProbe in 03-frontend.yaml handle this.
# ============================================================

# ─── Stage 1: Build React app ───────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_APP_VERSION=1.0.0
ENV VITE_API_URL=$VITE_API_URL \
    VITE_APP_VERSION=$VITE_APP_VERSION

COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

COPY . .
RUN npm run build

# ─── Stage 2: Serve with Nginx ──────────────────────────────────
FROM nginx:1.25-alpine AS runner

RUN apk add --no-cache wget

RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/conf.d/app.conf
COPY --from=builder /app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755       /usr/share/nginx/html

EXPOSE 80

# NOTE: No HEALTHCHECK here — handled by K8s livenessProbe/readinessProbe
# in k8s/base/03-frontend.yaml

CMD ["nginx", "-g", "daemon off;"]
