#!/bin/bash
set -e

MAX=5
DELAY=4

for i in $(seq 1 $MAX); do
  echo "Migration attempt $i/$MAX..."
  if npx prisma migrate deploy; then
    echo "Migrations applied."
    exit 0
  fi
  if [ $i -lt $MAX ]; then
    echo "Failed — retrying in ${DELAY}s (Neon cold start)..."
    sleep $DELAY
    DELAY=$((DELAY * 2))
  fi
done

echo "Migration failed after $MAX attempts."
exit 1
