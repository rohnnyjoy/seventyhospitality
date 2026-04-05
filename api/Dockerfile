FROM node:22-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# --- Build web ---
FROM base AS web-deps
WORKDIR /build/octahedron
COPY octahedron/package.json ./
COPY octahedron/dist/ ./dist/
COPY octahedron/src/ ./src/

WORKDIR /build/web
COPY web/package.json web/package-lock.json ./
# Rewrite postinstall to use the build-context copy of octahedron
RUN npm pkg set scripts.postinstall="rm -rf node_modules/octahedron && mkdir -p node_modules/octahedron && cp -r /build/octahedron/dist /build/octahedron/package.json /build/octahedron/src node_modules/octahedron/"
RUN npm ci

FROM web-deps AS web-build
COPY web/ .
ENV VITE_API_URL=
RUN npm run build

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
COPY api/package.json ./
COPY api/prisma ./prisma

# Bundle web build for static serving
COPY --from=web-build /build/web/dist ./public

EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]
