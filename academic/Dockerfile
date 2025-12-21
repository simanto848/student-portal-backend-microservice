FROM node:20-alpine

WORKDIR /app

# Copy shared module
COPY shared ./shared
RUN cd shared && npm install

# Copy service
COPY academic ./academic

WORKDIR /app/academic
RUN npm install

EXPOSE 8002

CMD ["npm", "start"]
