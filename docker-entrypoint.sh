#!/bin/sh
set -e

# Railway injects RAILWAY_SERVICE_NAME. Route to web vs worker.
case "$RAILWAY_SERVICE_NAME" in
  worker)
    echo "[entrypoint] Starting BullMQ worker (service: worker)"
    exec node --import tsx workers/index.ts
    ;;
  *)
    echo "[entrypoint] Starting Next.js web server (service: $RAILWAY_SERVICE_NAME)"
    exec node server.js
    ;;
esac