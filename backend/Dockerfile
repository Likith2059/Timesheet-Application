# ============================================================
#  TimesheetPro — Backend Service
#  Node.js 20 · Express · MongoDB Driver
#  Multi-stage build — optimized for ECS / Docker Hub
#
#  Build:
#    docker build -t timesheet-backend:1.0.0 .
#
#  Run locally:
#    docker run -p 5000:5000 \
#      -e MONGO_URI=mongodb://host.docker.internal:27017/timesheet_db \
#      -e JWT_SECRET=your_secret \
#      timesheet-backend:1.0.0
# ============================================================

# ─── Stage 1: Dependency installer ─────────────────────────────
FROM node:20-alpine AS deps

# Install OS-level build tools (needed by some npm packages)
RUN apk add --no-cache \
      python3 \
      make \
      g++

WORKDIR /app

# Copy only package files first → better Docker layer caching
COPY package.json package-lock.json* ./

# Install ONLY production dependencies
RUN npm ci --only=production --ignore-scripts \
    && npm cache clean --force

# ─── Stage 2: Production runner ─────────────────────────────────
FROM node:20-alpine AS runner

# Set NODE_ENV early so any runtime code can read it
ENV NODE_ENV=production \
    PORT=5000 \
    TZ=UTC

# Install dumb-init for proper signal handling in containers
RUN apk add --no-cache dumb-init wget

# Create non-root user (security best practice for ECS)
RUN addgroup -g 1001 -S appgroup \
    && adduser  -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules

# Copy application source
COPY --chown=appuser:appgroup . .

# Drop to non-root
USER appuser

# Expose API port
EXPOSE 5000


# Use dumb-init as PID 1 to handle SIGTERM gracefully
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/server.js"]
