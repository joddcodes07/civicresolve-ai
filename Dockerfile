FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm --workspace server run prisma:generate && npm run build
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
# Persistent uploads are mounted by Compose. Run as the unprivileged node user.
RUN mkdir -p server/uploads && chown -R node:node server/uploads
USER node
CMD ["sh", "-c", "npm --workspace server run prisma:deploy && npm --workspace server start"]
