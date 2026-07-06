FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./

# Persisted snapshots live here — mount a volume in production if you want
# data to survive container rebuilds (see README).
RUN mkdir -p /app/data

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
