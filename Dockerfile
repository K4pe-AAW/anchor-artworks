# syntax=docker/dockerfile:1
FROM node:22-slim AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/src/generated ./src/generated
COPY . .
# ビルド時点ではDB接続・実際のシークレットは不要（lib/env.tsの起動時検証を通すためのダミー値。
# 実際の値はruntimeにcompose.yamlのenv_file経由で渡され、イメージには焼き込まれない）
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build_time_only"
ENV AUTH_SECRET="build-time-placeholder-not-used-in-production-0000"
ENV ADMIN_TOTP_ENCRYPTION_KEY="build-time-placeholder-not-used-in-production-0000"
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
