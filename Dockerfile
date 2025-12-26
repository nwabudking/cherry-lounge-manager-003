# Multi-stage Dockerfile for Cherry Dining POS
# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files for frontend
COPY package.json package-lock.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY . .

# Build the frontend
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine AS production

WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy server package files
COPY server/package.json ./server/

# Install server dependencies
WORKDIR /app/server
RUN npm install --production

# Copy server source files
WORKDIR /app
COPY server/ ./server/

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist ./dist

# Create config directory
RUN mkdir -p /app/server/config

# Copy entrypoint script
COPY server/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose the application port
EXPOSE 3000

# Set working directory to server
WORKDIR /app/server

# Use entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]

# Start the server
CMD ["node", "index.js"]
