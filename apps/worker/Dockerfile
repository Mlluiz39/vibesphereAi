FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/llm/package.json ./packages/llm/
COPY packages/rag/package.json ./packages/rag/
COPY packages/whatsapp/package.json ./packages/whatsapp/
COPY packages/config/package.json ./packages/config/
COPY apps/worker/package.json ./apps/worker/
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/*/node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY . .
RUN pnpm --filter @vibesphere/shared build
RUN pnpm --filter @vibesphere/database build
RUN pnpm --filter @vibesphere/llm build
RUN pnpm --filter @vibesphere/rag build
RUN pnpm --filter @vibesphere/whatsapp build
RUN pnpm --filter @vibesphere/worker build

# ---- Production ----
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

RUN addgroup -g 1001 -S vibesphere && \
    adduser -S vibesphere -u 1001 -G vibesphere

COPY --from=build --chown=vibesphere:vibesphere /app/apps/worker/dist ./dist
COPY --from=build --chown=vibesphere:vibesphere /app/apps/worker/package.json ./
COPY --from=build --chown=vibesphere:vibesphere /app/node_modules ./node_modules
COPY --from=build --chown=vibesphere:vibesphere /app/packages/database/prisma ./packages/database/prisma

RUN mkdir -p /tmp/vibesphere-uploads && chown vibesphere:vibesphere /tmp/vibesphere-uploads

USER vibesphere

ENV NODE_ENV=production

CMD ["node", "dist/main.js"]
