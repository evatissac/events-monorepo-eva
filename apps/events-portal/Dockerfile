FROM node:22-alpine AS builder
ENV NODE_ENV=development

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/events-portal/package.json ./apps/events-portal/package.json

RUN pnpm install --frozen-lockfile=false --prod=false

COPY apps/events-portal ./apps/events-portal

WORKDIR /app/apps/events-portal

ARG PUBLIC_API_URL
ENV PUBLIC_API_URL=$PUBLIC_API_URL

RUN pnpm run build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
WORKDIR /app/apps/events-portal

COPY --from=builder /app /app

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
