# Stage 1: Build frontend
FROM node:23-alpine3.20 AS frontend-builder
WORKDIR /app
COPY parsEPD/package.json ./
RUN corepack enable pnpm && pnpm install
COPY parsEPD/ .
# VITE_API_URL=/ makes frontend resolve /chat/completions relative to origin
ARG VITE_API_URL=/
RUN pnpm build

# Stage 2: Compile nginx headers-more module
FROM nginx:1.28.3-alpine-slim AS nginx-builder
RUN apk add --no-cache --virtual .build-deps \
      gcc libc-dev make openssl-dev pcre-dev zlib-dev linux-headers && \
    wget -q "http://nginx.org/download/nginx-1.28.3.tar.gz" -O nginx.tar.gz && \
    wget -q "https://github.com/openresty/headers-more-nginx-module/archive/v0.37.tar.gz" -O headers-more.tar.gz && \
    mkdir -p /usr/src && \
    tar -zxC /usr/src -f nginx.tar.gz && \
    tar -zxC /usr/src -f headers-more.tar.gz && \
    cd /usr/src/nginx-1.28.3 && \
    ./configure --with-compat --add-dynamic-module=/usr/src/headers-more-nginx-module-0.37 && \
    make modules

# Stage 3: Install backend production dependencies only
FROM node:23-alpine3.20 AS backend-builder
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# Stage 4: Final image - nginx serves frontend, proxies to Node backend
FROM nginx:1.28.3-alpine-slim

RUN apk add --no-cache nodejs

# Non-root user for backend process
RUN addgroup -S parsepd && adduser -S parsepd -G parsepd

# nginx headers-more module
COPY --from=nginx-builder \
  /usr/src/nginx-1.28.3/objs/ngx_http_headers_more_filter_module.so \
  /usr/local/nginx/modules/ngx_http_headers_more_filter_module.so

# Frontend static files
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Backend — secrets injected at runtime via env vars, not baked in
COPY --from=backend-builder --chown=parsepd:parsepd /app/node_modules /backend/node_modules
COPY --chown=parsepd:parsepd backend/server.js /backend/server.js

COPY nginx.conf /etc/nginx/nginx.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

CMD ["/entrypoint.sh"]