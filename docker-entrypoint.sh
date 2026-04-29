#!/bin/sh
set -e

# Seed team roles on every start (idempotent — safe to re-run)
npx tsx scripts/seed-roles.ts || true

exec npm start
