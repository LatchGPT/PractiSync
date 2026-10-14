# Build stage
FROM node:24-slim AS builder

WORKDIR /app

# Install OpenSSL and certificates required for Prisma engine
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@11.25.0

# Copy workspace configuration and dependency files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json ./packages/db/package.json
COPY packages/db/prisma ./packages/db/prisma

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application source (including build/ which contains required vite plugins)
COPY . .

# Generate Prisma Client
RUN pnpm db:generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm build

# Runner stage
FROM node:24-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@11.25.0

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy built application and runtime assets
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/drizzle ./drizzle

EXPOSE 3000

CMD ["sh", "-c", "pnpm db:migrate && pnpm start"]
