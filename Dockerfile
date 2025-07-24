# SkySurge Production Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY backend/package*.json ./backend/
COPY package*.json ./

# Install backend dependencies
WORKDIR /app/backend
RUN npm ci --only=production && npm cache clean --force

# Copy application code
WORKDIR /app
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S skysurge -u 1001

# Set ownership
RUN chown -R skysurge:nodejs /app
USER skysurge

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
WORKDIR /app/backend
CMD ["npm", "start"]
