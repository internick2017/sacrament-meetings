// The tables a backup carries, in an order that satisfies their foreign keys
// when they are loaded back (a table always comes after the ones it points to).
export const BACKUP_TABLES = [
  'unit',
  'organizations',
  'people',
  'users',
  'members',
  'meetings',
  'meeting_changes',
  'callings',
  'events',
  'event_photos',
  'announcements',
];

// Deliberately left out: schema_migrations is rebuilt by `yarn migrate`, and
// verification_token only holds sign-in links that expire within the day.
export const SKIPPED_TABLES = ['schema_migrations', 'verification_token'];

// A table that is in the database but in neither list would be silently
// missing from every backup, so both scripts refuse to run until it is filed.
export function unfiledTables(tablesInDatabase) {
  const known = new Set([...BACKUP_TABLES, ...SKIPPED_TABLES]);
  return tablesInDatabase.filter((name) => !known.has(name));
}

export async function listPublicTables(sql) {
  const rows = await sql.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );
  return rows.map((row) => row.tablename);
}
