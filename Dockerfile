# Build container
FROM node:12 as node-builder

WORKDIR /app

COPY yarn.lock ./
COPY package.json ./

RUN ls
RUN yarn install
RUN ls
COPY ./ ./
RUN ls

# Run container
FROM node:12-alpine
WORKDIR /app
EXPOSE 8080
COPY --from=node-builder /app ./

# CMD pwd && ls && cat package.json && ls ws
CMD yarn inside_docker_start
# CMD ls
