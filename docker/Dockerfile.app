# Cherry POS Frontend Dockerfile
# Multi-stage build for production deployment

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build arguments for Supabase configuration
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY

# Set environment variables for build
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}

# Build the application
RUN npm run build

# Stage 2: Production
FROM nginx:alpine AS production

# Copy custom nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create a script to inject environment variables at runtime
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-inject-env.sh && \
    echo 'envsubst < /usr/share/nginx/html/index.html > /usr/share/nginx/html/index.html.tmp' >> /docker-entrypoint.d/40-inject-env.sh && \
    echo 'mv /usr/share/nginx/html/index.html.tmp /usr/share/nginx/html/index.html' >> /docker-entrypoint.d/40-inject-env.sh && \
    chmod +x /docker-entrypoint.d/40-inject-env.sh

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
