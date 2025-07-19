# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage - use nginx:alpine-slim for smaller size
FROM nginx:alpine-slim

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built app from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx with dumb-init
CMD ["dumb-init", "nginx", "-g", "daemon off;"]
