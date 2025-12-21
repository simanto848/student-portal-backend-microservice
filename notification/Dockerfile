FROM node:20-alpine

WORKDIR /app

# Copy shared module
COPY shared ./shared
RUN cd shared && npm install

# Copy service
COPY notification ./notification

WORKDIR /app/notification
RUN npm install

EXPOSE 8007

CMD ["npm", "start"]
