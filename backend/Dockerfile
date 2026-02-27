# ============================================================
#  TimesheetPro — Backend Service
#  Node.js 20 Alpine · Multi-stage · K8s ready
#
#  Build:
#    docker build -t timesheet-backend:1.0.0 .
#
#  Push to Docker Hub:
#    docker tag timesheet-backend:1.0.0 youruser/timesheet-backend:1.0.0
#    docker push youruser/timesheet-backend:1.0.0
#
#  Push to ECR:
#    docker tag timesheet-backend:1.0.0 ACCOUNT.dkr.ecr.REGION.amazonaws.com/timesheet-backend:1.0.0
#    docker push ACCOUNT.dkr.ecr.REGION.amazonaws.com/timesheet-backend:1.0.0
#
#  NOTE: HEALTHCHECK is intentionally omitted.
#        K8s livenessProbe + readinessProbe in 02-backend.yaml handle this.
# ============================================================

# ─── Stage 1: Install production dependencies ───────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --only=production && npm cache clean --force

# ─── Stage 2: Production runner ─────────────────────────────────
FROM node:20-alpine AS runner

ENV NODE_ENV=production \
    PORT=5000 \
    TZ=UTC

# dumb-init handles SIGTERM gracefully during K8s pod shutdown
RUN apk add --no-cache dumb-init

# Non-root user for security
RUN addgroup -g 1001 -S appgroup \
    && adduser  -u 1001 -S appuser -G appgroup

WORKDIR /app

COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 5000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/server.js"]
