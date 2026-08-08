FROM node:20-alpine AS client-build

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/client/package.json packages/client/
RUN npm ci

COPY packages/shared packages/shared
COPY packages/client packages/client
COPY tsconfig.base.json .
RUN npm run build -w @cordis/shared
RUN npm run build -w @cordis/client

FROM node:20-alpine AS server-build

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
RUN npm ci

COPY packages/shared packages/shared
COPY packages/server packages/server
COPY tsconfig.base.json .
RUN npm run build -w @cordis/shared
RUN npm run build -w @cordis/server

FROM node:20-alpine AS runtime

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
RUN npm ci --omit=dev

COPY --from=server-build /app/packages/server/dist packages/server/dist
COPY --from=server-build /app/packages/shared/dist packages/shared/dist
COPY --from=client-build /app/packages/client/dist packages/client/dist

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "packages/server/dist/index.js"]