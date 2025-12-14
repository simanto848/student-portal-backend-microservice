FROM node:20-alpine

WORKDIR /app

# Copy shared module
COPY shared ./shared
RUN cd shared && npm install

# Copy service package.json first for better caching
COPY enrollment/package*.json ./enrollment/

WORKDIR /app/enrollment
RUN npm install

# Copy the rest of the service code
COPY enrollment ./

EXPOSE 8003

CMD ["npm", "start"]
