# Stage 1: build the static bundle
FROM node:20-alpine AS build

WORKDIR /srv/revenue-verify-ui

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite bakes env vars into the bundle at build time.
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Stage 2: serve it with nginx
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /srv/revenue-verify-ui/dist /usr/share/nginx/html

EXPOSE 80
