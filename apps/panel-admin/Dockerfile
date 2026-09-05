FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/panel-admin/package.json ./apps/panel-admin/package.json
COPY packages ./packages

RUN pnpm install --frozen-lockfile=false

COPY apps/panel-admin ./apps/panel-admin

WORKDIR /app/apps/panel-admin

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm run build

FROM nginx:alpine

COPY apps/panel-admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/panel-admin/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
