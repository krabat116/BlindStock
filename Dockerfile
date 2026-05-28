# ── Stage 1: Build React client ─────────────────────────────────────────────
FROM node:22-alpine AS client-build
WORKDIR /app/client

COPY blind-inventory-client/package*.json ./
RUN npm ci

COPY blind-inventory-client/ ./
# VITE_API_URL is intentionally unset — client uses same-origin relative URLs
RUN npm run build

# ── Stage 2: Build Express server (TypeScript → JS) ─────────────────────────
FROM node:22-alpine AS server-build
WORKDIR /app/server

COPY blind-inventory-server/package*.json ./
RUN npm ci

# Generate Prisma Client so TypeScript compilation can resolve @prisma/client types
# DATABASE_URL is not needed for code generation — use a placeholder
COPY blind-inventory-server/prisma/schema.prisma ./prisma/schema.prisma
COPY blind-inventory-server/prisma.config.ts ./
RUN DATABASE_URL="postgresql://localhost/dummy" npx prisma generate

COPY blind-inventory-server/ ./
RUN npm run build

# ── Stage 3: Production image ────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Server runtime files
COPY --from=server-build /app/server/dist           ./dist
COPY --from=server-build /app/server/node_modules   ./node_modules
COPY --from=server-build /app/server/prisma         ./prisma
COPY --from=server-build /app/server/prisma.config.ts ./
COPY --from=server-build /app/server/package.json   ./

# React SPA static files served by Express
COPY --from=client-build /app/client/dist           ./public

EXPOSE 3001

# Runs migrations then starts the server
CMD ["npm", "run", "start"]
