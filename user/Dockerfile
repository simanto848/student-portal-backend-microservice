FROM node:20-alpine

WORKDIR /app

# Copy shared module
COPY shared ./shared
RUN cd shared && npm install

# Copy service
COPY user ./user

WORKDIR /app/user
RUN npm install

EXPOSE 8001

CMD ["npm", "start"]
