FROM node:18-alpine AS base

FROM base AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

FROM base AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

COPY server.js ./
COPY package*.json ./

RUN mkdir -p /app/public && chown nodejs:nodejs /app/public

COPY public ./public

USER nodejs

EXPOSE 3002

ENV NODE_ENV=production
ENV PORT=3002

CMD ["node", "server.js"]
