FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy application source
COPY . .

# Create config directories and ensure they persist
RUN mkdir -p config/history

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "scripts/dashboard-server.js"]
