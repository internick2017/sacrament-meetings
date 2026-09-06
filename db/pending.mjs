// Pure migration logic: no filesystem, no database. Everything here is a plain
// function so it can be tested without a Neon connection.

// Migration files are named NNN_description.sql. The number is the order, and
// it is also the identity: renaming the description of an applied migration
// would make it look pending again, so don't.
const FILE_PATTERN = /^(\d+)_.+\.sql$/;

// Which migrations still need to run, in the order they must run.
export function pendingMigrations(files, applied) {
  const sqlFiles = files.filter((name) => name.endsWith('.sql'));

  const parsed = sqlFiles.map((name) => {
    const match = FILE_PATTERN.exec(name);
    if (!match) {
      throw new Error(
        `Migration "${name}" has no numeric prefix. Name it like 003_add_events.sql`
      );
    }
    return { name, order: Number(match[1]) };
  });

  const seen = new Map();
  for (const { name, order } of parsed) {
    const other = seen.get(order);
    if (other) {
      throw new Error(`Migration number ${order} is duplicate: "${other}" and "${name}"`);
    }
    seen.set(order, name);
  }

  const done = new Set(applied);
  return parsed
    .filter(({ name }) => !done.has(name))
    .sort((a, b) => a.order - b.order)
    .map(({ name }) => name);
}

// Neon's HTTP driver runs one statement per call, so a migration file has to be
// split before it can be sent. This is a deliberately simple splitter: it cuts
// on semicolons. That means migrations must not contain a semicolon inside a
// string literal or a dollar-quoted block ($$ ... $$). Plain DDL never does. If
// a future migration needs a function or trigger body, this splitter has to be
// replaced first.
export function splitStatements(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}
