FROM node:22-alpine AS builder
ENV NODE_ENV=development
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile=false --prod=false

COPY apps/api ./apps/api

WORKDIR /app/apps/api
RUN pnpm exec prisma generate --schema prisma/schema.prisma
RUN pnpm run build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app/apps/api

COPY --from=builder /app /app

EXPOSE 3000
CMD ["npm", "run", "start"]
