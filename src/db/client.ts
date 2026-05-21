/**
 * In-memory stand-in for a real database client (PostgreSQL, etc.).
 *
 * Exposes a coarse, table-oriented API (`selectAll`, `findById`, `insert`,
 * `update`, `delete`) so the seam between domain repositories (e.g.
 * {@link tasksDb}) and "the database" is visible in the code — and therefore
 * in the architecture diagram. Swap this module for a real driver later
 * without touching the consumers.
 *
 * Storage is a `Map<tableName, Map<id, row>>`. Cast on read is safe because
 * the writes are typed and we are the only writer.
 */
const tables = new Map<string, Map<string, unknown>>();

function ensureTable(name: string): Map<string, unknown> {
  let table = tables.get(name);
  if (!table) {
    table = new Map<string, unknown>();
    tables.set(name, table);
  }
  return table;
}

export const dbClient = {
  /** @returns every row in `table`, in insertion order. */
  selectAll<T>(table: string): T[] {
    return Array.from(ensureTable(table).values()) as T[];
  },

  /** @returns the row keyed by `id`, or `undefined` if absent. */
  findById<T>(table: string, id: string): T | undefined {
    return ensureTable(table).get(id) as T | undefined;
  },

  /**
   * Insert or replace a row. Returns the same value for fluent chaining at
   * the call site.
   */
  insert<T>(table: string, id: string, row: T): T {
    ensureTable(table).set(id, row);
    return row;
  },

  /**
   * Shallow-merge `patch` into the existing row.
   *
   * @returns the updated row, or `undefined` when the id is unknown (so the
   *          caller can turn that into a 404).
   */
  update<T>(table: string, id: string, patch: Partial<T>): T | undefined {
    const existing = ensureTable(table).get(id) as T | undefined;
    if (!existing) return undefined;
    const updated: T = { ...existing, ...patch };
    ensureTable(table).set(id, updated);
    return updated;
  },

  /** @returns `true` when a row was removed, `false` when the id was unknown. */
  delete(table: string, id: string): boolean {
    return ensureTable(table).delete(id);
  },

  /** Test-only helper — wipe a single table. */
  clear(table: string): void {
    ensureTable(table).clear();
  },
};
