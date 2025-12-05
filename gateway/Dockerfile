FROM node:20-alpine

WORKDIR /app

# Copy shared module
COPY shared ./shared
RUN cd shared && npm install

# Copy service
COPY gateway ./gateway

WORKDIR /app/gateway
RUN npm install

EXPOSE 8000

CMD ["npm", "start"]
