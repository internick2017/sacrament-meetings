import { neon } from '@neondatabase/serverless';

// One Neon client for the whole app. neon() only builds the client; it does
// not open a connection until a query actually runs, so importing this file
// is cheap. DATABASE_URL comes from .env.local locally and from Vercel in
// deploys.
export const sql = neon(process.env.DATABASE_URL!);
