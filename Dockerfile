FROM node:lts-alpine AS builder

ARG VITE_APP_TITLE
ARG VITE_APP_DOMAIN

ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_DOMAIN=$VITE_APP_DOMAIN

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:latest

WORKDIR /app

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/.vinxi ./.vinxi
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "run", "start"] 