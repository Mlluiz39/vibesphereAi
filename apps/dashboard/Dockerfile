FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY apps/dashboard/package.json ./apps/dashboard/
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/*/node_modules
COPY --from=deps /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY . .
RUN pnpm --filter @vibesphere/shared build
RUN pnpm --filter @vibesphere/dashboard build

# ---- Production ----
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

RUN addgroup -g 1001 -S vibesphere && \
    adduser -S vibesphere -u 1001 -G vibesphere

COPY --from=build --chown=vibesphere:vibesphere /app/apps/dashboard/.next ./.next
COPY --from=build --chown=vibesphere:vibesphere /app/apps/dashboard/public ./public
COPY --from=build --chown=vibesphere:vibesphere /app/apps/dashboard/package.json ./
COPY --from=build --chown=vibesphere:vibesphere /app/apps/dashboard/next.config.mjs ./
COPY --from=build --chown=vibesphere:vibesphere /app/node_modules ./node_modules

USER vibesphere

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "node_modules/.bin/next", "start", "-p", "3000"]
