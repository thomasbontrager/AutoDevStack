FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --omit=dev

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 4000

CMD ["node", "dist/index.js"]
