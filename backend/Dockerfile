# ─── Stage 1: dependencias ───────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# ─── Stage 2: imagen final ────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Usuario no-root por seguridad
RUN addgroup -S iot && adduser -S iot -G iot

# Copiar dependencias y código
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

# El .env NO se copia — se inyecta como variables de entorno en runtime
# Ver docker-compose.yml o pasar con --env-file

USER iot

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
