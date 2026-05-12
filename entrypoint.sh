#!/bin/sh
set -e

node /backend/server.js &
exec nginx -g "daemon off;"
