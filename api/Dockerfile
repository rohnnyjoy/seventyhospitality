FROM node:22-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# --- Build web ---
FROM base AS web-build
WORKDIR /build/web
COPY web/package.json web/package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY web/ .
ENV VITE_API_URL=
RUN npx vite build

# --- Build API ---
FROM base AS api-deps
WORKDIR /app
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev

FROM base AS api-build
WORKDIR /app
COPY api/package.json api/package-lock.json ./
RUN npm ci
COPY api/ .
RUN npx prisma generate
RUN npm run build

# --- Production image ---
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=api-deps /app/node_modules ./node_modules
COPY --from=api-build /app/dist ./dist
COPY --from=api-build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=api-build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=api-build /app/node_modules/tsx ./node_modules/tsx
COPY --from=api-build /app/node_modules/esbuild ./node_modules/esbuild
COPY api/package.json ./
COPY api/prisma ./prisma

COPY --from=web-build /build/web/dist ./public

EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy --config prisma/prisma.config.ts && node dist/src/server.js"]
