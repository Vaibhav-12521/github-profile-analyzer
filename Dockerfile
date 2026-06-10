# Production image for the GitHub Profile Analyzer API
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies first (better layer caching).
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the application source.
COPY . .

EXPOSE 4000

CMD ["node", "src/index.js"]
