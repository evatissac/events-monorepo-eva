FROM node:22-alpine AS build
ENV NODE_ENV=development
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages ./packages
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile=false --prod=false
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN pnpm install --filter events-api --no-frozen-lockfile --prod=false
RUN pnpm --filter events-api exec prisma generate --schema prisma/schema.prisma && \
    pnpm --filter events-api build && \
    pnpm deploy --filter events-api --prod /prod && \
    PRISMA_CLIENT_DIR=$(find /app/node_modules -type d -path '*/.prisma/client' | head -n 1) && \
    mkdir -p /prod/node_modules/.prisma && \
    cp -r "$PRISMA_CLIENT_DIR" /prod/node_modules/.prisma/client

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/apps/api
COPY --from=build /prod ./
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]

