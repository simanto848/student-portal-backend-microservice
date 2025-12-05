FROM node:20-alpine

WORKDIR /app

# Copy shared module
COPY shared ./shared
RUN cd shared && npm install

# Copy service
COPY classroom ./classroom

WORKDIR /app/classroom
RUN npm install

EXPOSE 8011

CMD ["npm", "start"]
