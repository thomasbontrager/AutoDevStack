FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Create an unprivileged user for running the application
RUN addgroup -S appuser && adduser -S appuser -G appuser

# Switch to the unprivileged user for the runtime process
USER appuser
EXPOSE 5000

CMD ["node", "dist/index.js"]
