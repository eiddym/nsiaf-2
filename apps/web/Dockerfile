FROM node:22-alpine AS base
RUN npm install -g pnpm@11.18.0
WORKDIR /app

# Dependencies stage
FROM base AS dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile || pnpm install

# Build stage
FROM dependencies AS builder
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN pnpm --filter @nsiaf/shared build
RUN pnpm --filter web build

# Production Server with Nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist/web/browser /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
