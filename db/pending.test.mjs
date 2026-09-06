import { describe, it, expect } from 'vitest';
import { pendingMigrations, splitStatements } from './pending.mjs';

describe('pendingMigrations', () => {
  it('returns every file when nothing has been applied', () => {
    const files = ['001_baseline.sql', '002_unit.sql'];
    expect(pendingMigrations(files, [])).toEqual(['001_baseline.sql', '002_unit.sql']);
  });

  it('skips files that are already applied', () => {
    const files = ['001_baseline.sql', '002_unit.sql'];
    expect(pendingMigrations(files, ['001_baseline.sql'])).toEqual(['002_unit.sql']);
  });

  it('orders by numeric prefix, not by string comparison', () => {
    const files = ['010_ten.sql', '002_two.sql'];
    expect(pendingMigrations(files, [])).toEqual(['002_two.sql', '010_ten.sql']);
  });

  it('ignores files that are not .sql', () => {
    const files = ['001_baseline.sql', 'README.md'];
    expect(pendingMigrations(files, [])).toEqual(['001_baseline.sql']);
  });

  it('rejects a .sql file without a numeric prefix', () => {
    expect(() => pendingMigrations(['unit.sql'], [])).toThrow(/numeric prefix/);
  });

  it('rejects two files sharing the same number', () => {
    expect(() => pendingMigrations(['002_a.sql', '002_b.sql'], [])).toThrow(/duplicate/);
  });
});

describe('splitStatements', () => {
  it('splits on semicolons', () => {
    expect(splitStatements('CREATE TABLE a (id int); CREATE TABLE b (id int);')).toEqual([
      'CREATE TABLE a (id int)',
      'CREATE TABLE b (id int)',
    ]);
  });

  it('drops comment-only lines', () => {
    const sql = '-- create the table\nCREATE TABLE a (id int);';
    expect(splitStatements(sql)).toEqual(['CREATE TABLE a (id int)']);
  });

  it('returns an empty list for a file with no statements', () => {
    expect(splitStatements('-- nothing here\n\n')).toEqual([]);
  });
});
