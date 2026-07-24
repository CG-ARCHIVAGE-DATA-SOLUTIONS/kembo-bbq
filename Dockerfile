# Image de production — un seul conteneur, base SQLite montée en volume.
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="file:/app/data/kembo.db"
RUN npx prisma generate && npm run build

FROM base AS run
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/kembo.db"
ENV TZ=Africa/Brazzaville
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
VOLUME /app/data
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run start"]
