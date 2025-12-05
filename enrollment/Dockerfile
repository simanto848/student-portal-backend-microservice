FROM node:20-alpine

WORKDIR /app

# Copy shared module
COPY shared ./shared
RUN cd shared && npm install

# Copy service
COPY enrollment ./enrollment

WORKDIR /app/enrollment
RUN npm install

EXPOSE 8003

CMD ["npm", "start"]
