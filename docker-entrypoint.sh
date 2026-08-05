#!/bin/sh
set -e

echo "[kembo] Applying database schema..."
./node_modules/.bin/prisma db push --skip-generate

# Seed uniquement au premier demarrage (flag dans le volume)
SEEDED_FLAG="/data/.seeded"
if [ ! -f "$SEEDED_FLAG" ]; then
  echo "[kembo] First boot — seeding database..."
  ./node_modules/.bin/tsx prisma/seed.ts
  touch "$SEEDED_FLAG"
fi

echo "[kembo] Starting Kembo BBQ on port ${PORT:-3000}..."
exec ./node_modules/.bin/next start --port "${PORT:-3000}"
