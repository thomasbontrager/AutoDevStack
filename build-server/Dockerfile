FROM node:20-alpine
WORKDIR /app

# Install git and docker CLI
RUN apk add --no-cache git docker-cli

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./

EXPOSE 5000
CMD ["node", "server.js"]
