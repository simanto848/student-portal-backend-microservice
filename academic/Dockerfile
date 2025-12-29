FROM node:20-alpine

WORKDIR /app

# Copy shared module
COPY shared ./shared
RUN cd shared && \
    npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retries 5 && \
    npm install

# Copy service
COPY academic ./academic

WORKDIR /app/academic
RUN npm install

EXPOSE 8002

CMD ["npm", "start"]
