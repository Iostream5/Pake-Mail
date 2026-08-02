#!/bin/sh
set -e

echo "[entrypoint] Starting Pake Mail BullMQ worker"
exec node --import tsx workers/index.ts