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
RUN npx prisma generate --schema packages/server/src/prisma/schema.prisma
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
COPY --from=server-build /app/node_modules/.prisma node_modules/.prisma
COPY --from=server-build /app/node_modules/prisma node_modules/prisma
COPY --from=server-build /app/node_modules/@prisma node_modules/@prisma
COPY --from=server-build /app/node_modules/.bin/prisma node_modules/.bin/prisma
COPY --from=server-build /app/packages/server/src/prisma packages/server/src/prisma

ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --schema packages/server/src/prisma/schema.prisma && node packages/server/dist/index.js"]