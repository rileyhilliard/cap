FROM node:lts AS base
ENV NODE_ENV=production
WORKDIR /app
ARG PM2_LOG_DIR=/app/logs

FROM base AS builder
RUN corepack enable
RUN corepack prepare yarn@stable --activate
COPY package.json ./
RUN yarn install

COPY . .

RUN yarn build

EXPOSE 5000
ENV PORT 5000

RUN mkdir -p $PM2_LOG_DIR

# Make the start_server script executable
RUN chmod +x ./scripts/start_server.sh

# Set the start_server
ENTRYPOINT ["./scripts/start_server.sh"]
