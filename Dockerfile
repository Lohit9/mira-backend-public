# syntax = docker/dockerfile:1

# Adjust BUN_VERSION as desired
ARG BUN_VERSION=1.1.21

FROM oven/bun:${BUN_VERSION} AS base

# Bun app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install -y build-essential pkg-config python

COPY --from=node:20 /usr/local/bin/node /usr/local/bin/node

# Install node modules
COPY bun.lockb package.json ./
# Copy application code
COPY . .

# set the production database url
# Using UDP: https://www.prisma.io/docs/orm/overview/databases/postgresql#connecting-via-sockets
# https://github.com/prisma/prisma-client-js/issues/437#issuecomment-592436707
RUN echo "DATABASE_URL=\"postgresql://appengine:6nQ53EwSSm7@localhost/app?schema=public&host=/cloudsql/mira-beta:us-east4:genoa\"" > .env && \
    echo "SERVER_PORT=\"8080\"" >> .env

RUN bun install --production

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 8080
CMD [ "bun", "run", "start" ]