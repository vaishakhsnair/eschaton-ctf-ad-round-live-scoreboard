FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY samples ./samples

ENV LIVE_SCORE_BIND_HOST=0.0.0.0
ENV LIVE_SCORE_PORT=3101

EXPOSE 3101

CMD ["node", "server/index.mjs"]
