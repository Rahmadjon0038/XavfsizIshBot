FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# Compile sqlite3 against the glibc shipped in the runtime image.
RUN npm_config_build_from_source=true npm_config_nodedir=/usr/local npm ci --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
RUN mkdir -p /app/data && chown node:node /app/data
USER node
RUN node -e 'const db = new (require("sqlite3").Database)(":memory:"); db.close();'
CMD ["node", "src/index.js"]
