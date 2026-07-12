FROM node:22-alpine AS web-builder
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npx vite build --logLevel warn

FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache tini python3 make g++

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci

COPY server/ ./server/
COPY --from=web-builder /app/web/dist ./web/dist

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3090
ENV HOST=0.0.0.0

EXPOSE 3090

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--import", "tsx", "server/src/index.ts"]
