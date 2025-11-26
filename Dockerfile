# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built artifacts from build stage
COPY --from=build /app /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Environment variables (defaults, override in docker-compose)
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["npm", "run", "prod"]

