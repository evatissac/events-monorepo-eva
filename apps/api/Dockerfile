FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
RUN corepack enable && pnpm install --frozen-lockfile=false
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN pnpm install --filter events-api --no-frozen-lockfile
RUN pnpm --filter events-api exec prisma generate --schema prisma/schema.prisma && pnpm --filter events-api build && pnpm deploy --filter events-api /prod && PRISMA_CLIENT_DIR=$(find /app/node_modules -type d -path '*/.prisma/client' | head -n 1) && mkdir -p /prod/node_modules/.prisma && cp -r "$PRISMA_CLIENT_DIR" /prod/node_modules/.prisma/client

FROM node:22-alpine
WORKDIR /app/apps/api
COPY --from=build /prod ./
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
EXPOSE 3000
# El proyecto existente fue inicializado con db push y no tiene tabla de historial
# de migraciones en instalaciones anteriores. Sincronizar antes de iniciar evita
# que una versión nueva consulte columnas aún inexistentes en producción.
CMD ["sh", "-c", "./node_modules/.bin/prisma db push --schema prisma/schema.prisma --accept-data-loss --skip-generate && node dist/main.js"]
