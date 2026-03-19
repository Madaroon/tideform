#!/bin/sh
set -e

echo "🌊 Starting Tideform..."

# Generate a secret if not set
if [ -z "$NEXTAUTH_SECRET" ]; then
  export NEXTAUTH_SECRET=$(head -c 32 /dev/urandom | base64)
  echo "  ⚠ Generated random NEXTAUTH_SECRET (set this env var for persistence)"
fi

# Set default URL
if [ -z "$NEXTAUTH_URL" ]; then
  export NEXTAUTH_URL="http://localhost:3000"
fi

# Run database migrations
echo "  → Running database migrations..."
npx prisma db push --skip-generate 2>/dev/null || true

echo "  ✓ Ready on port ${PORT:-3000}"

exec "$@"
