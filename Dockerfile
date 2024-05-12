# Fetching the minified node image on apline linux
FROM node:slim

# Setting up the work directory
WORKDIR /app

# Install libssl
RUN apt-get update && apt-get install -y \
  libssl-dev

# Declaring env
ENV NODE_ENV development

# COPY package.json
COPY package.json /app

# Installing dependencies
RUN yarn install

# Copying all the files in our project
COPY . /app

# Exposing server port
EXPOSE 3000

# Generate the Prisma client
RUN npx prisma generate

# Starting our application
CMD [ "node", "index.js" ]