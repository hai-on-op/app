# Using same node version as in the CI/CD pipeline
FROM node:18.7 AS base

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./

RUN yarn install --frozen-lockfile

FROM base AS build

COPY . .

# Setting up environment variables
ARG VITE_TESTNET_PUBLIC_RPC
ARG VITE_MAINNET_PUBLIC_RPC
ARG VITE_ALCHEMY_KEY
ARG VITE_WALLETCONNECT_ID

ENV VITE_TESTNET_PUBLIC_RPC=$VITE_TESTNET_PUBLIC_RPC
ENV VITE_MAINNET_PUBLIC_RPC=$VITE_MAINNET_PUBLIC_RPC
ENV VITE_ALCHEMY_KEY=$VITE_ALCHEMY_KEY
ENV VITE_WALLETCONNECT_ID=$VITE_WALLETCONNECT_ID

# Building the application
RUN yarn build

FROM nginx:stable-alpine AS production

# Copying the build directory from the 'build' stage to the nginx server
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80 to the Docker host, so we can access the application from outside the container
EXPOSE 80

# When the container starts, nginx starts as well, serving the static files.
CMD ["nginx", "-g", "daemon off;"]
