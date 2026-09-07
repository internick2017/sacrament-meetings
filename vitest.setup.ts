// Load DATABASE_URL and friends from .env.local before any test module runs.
// lib/db.ts throws at import time if DATABASE_URL is missing, and vitest does
// not load .env files on its own the way Next.js does.
try {
  process.loadEnvFile('.env.local');
} catch {
  // .env.local is optional (e.g. in CI where env vars are injected directly).
}
