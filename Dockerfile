# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
RUN corepack enable pnpm
WORKDIR /app
COPY pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/frontend/package.json packages/frontend/
COPY packages/core/package.json packages/core/
RUN pnpm install --frozen-lockfile
COPY packages/core/ packages/core/
COPY packages/frontend/ packages/frontend/
RUN pnpm --filter @componode/core build
RUN pnpm --filter @componode/frontend build

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder
RUN corepack enable pnpm
WORKDIR /app
COPY pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/backend/package.json packages/backend/
COPY packages/core/package.json packages/core/
RUN pnpm install --frozen-lockfile
COPY packages/core/ packages/core/
COPY packages/backend/ packages/backend/
RUN pnpm --filter @componode/core build
RUN pnpm --filter @componode/backend build

# Stage 3: Runtime
FROM node:20-alpine AS runtime
RUN apk add --no-cache wget
WORKDIR /app
COPY --from=backend-builder /app/packages/backend/dist ./dist
COPY --from=backend-builder /app/packages/backend/node_modules ./node_modules
COPY --from=backend-builder /app/packages/core/dist ./node_modules/@componode/core
COPY --from=frontend-builder /app/packages/frontend/dist ./public
COPY packages/backend/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server.js"]
