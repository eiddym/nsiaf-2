FROM node:22-alpine AS base
RUN npm install -g pnpm@11.18.0
WORKDIR /app

# Dependencies stage
FROM base AS dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/

RUN pnpm install --frozen-lockfile || pnpm install

# Build stage
FROM dependencies AS builder
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared package
RUN pnpm --filter @nsiaf/shared build

# Generate Prisma Client & Build API
RUN pnpm --filter api prisma:generate
RUN pnpm --filter api build

# Production Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm@11.18.0

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

EXPOSE 3002

CMD ["sh", "-c", "pnpm --filter api prisma:generate && node apps/api/dist/main.js"]
