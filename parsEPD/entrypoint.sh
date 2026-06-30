#!/bin/sh
set -e

# Decode gcloud ADC from base64 env var if provided
if [ -n "$GOOGLE_CREDENTIALS_B64" ]; then
    mkdir -p /root/.config/gcloud
    echo "$GOOGLE_CREDENTIALS_B64" | base64 -d > /root/.config/gcloud/application_default_credentials.json
    export GOOGLE_APPLICATION_CREDENTIALS=/root/.config/gcloud/application_default_credentials.json
fi

cd /app/backend
node server.js &

exec nginx -g 'daemon off;'
