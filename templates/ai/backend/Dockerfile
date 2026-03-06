FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY templates/ai/prisma ./prisma/

RUN npm install --omit=dev

COPY . .

RUN npx prisma generate
RUN npm run build

RUN chown -R node:node /app
USER node
EXPOSE 4000

CMD ["node", "dist/index.js"]
