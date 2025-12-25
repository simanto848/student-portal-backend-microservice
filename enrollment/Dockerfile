FROM node:20-alpine

WORKDIR /app

# Copy shared module
COPY shared ./shared
RUN cd shared && \
    npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retries 5 && \
    npm install

# Copy service package.json first for better caching
COPY enrollment/package*.json ./enrollment/

WORKDIR /app/enrollment
RUN npm install

# Copy the rest of the service code
COPY enrollment ./

EXPOSE 8005

CMD ["npm", "start"]
