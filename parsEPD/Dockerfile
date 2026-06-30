# ── Stage 1: build frontend ──────────────────────────────────────────────────
FROM node:23-alpine3.20 AS frontend-build

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install

COPY frontend/ .
# VITE_API_URL=/api so browser hits nginx, which proxies to backend on 5000
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ── Stage 2: compile headers-more nginx module ────────────────────────────────
FROM nginx:1.28-alpine-slim AS nginx-builder

RUN apk add --no-cache --virtual .build-deps \
    git gcc libc-dev make openssl-dev pcre-dev zlib-dev \
    linux-headers curl gnupg libxslt-dev gd-dev geoip-dev

RUN NGINX_VERSION=$(nginx -v 2>&1 | sed 's/.*nginx\///') && \
    wget "http://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz" -O nginx.tar.gz && \
    wget "https://github.com/openresty/headers-more-nginx-module/archive/v0.37.tar.gz" -O headers-more.tar.gz && \
    mkdir -p /usr/src && \
    tar -zxC /usr/src -f nginx.tar.gz && \
    tar -zxC /usr/src -f headers-more.tar.gz && \
    cd /usr/src/nginx-${NGINX_VERSION} && \
    ./configure --without-http_autoindex_module --with-compat \
        --add-dynamic-module=/usr/src/headers-more-nginx-module-0.37 && \
    make && make install

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM nginx:1.28-alpine-slim

# Node.js for Express backend
RUN apk add --no-cache nodejs npm

# headers-more module
COPY --from=nginx-builder /usr/local/nginx/modules/ngx_http_headers_more_filter_module.so \
    /usr/local/nginx/modules/ngx_http_headers_more_filter_module.so

# Frontend static files
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# Backend
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev
COPY backend/server.js ./

# nginx config
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
