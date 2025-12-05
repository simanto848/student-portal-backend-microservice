FROM node:20-alpine

WORKDIR /app

# Copy shared module
COPY shared ./shared
RUN cd shared && npm install

# Copy service
COPY library ./library

WORKDIR /app/library
RUN npm install

EXPOSE 8008

CMD ["npm", "start"]
