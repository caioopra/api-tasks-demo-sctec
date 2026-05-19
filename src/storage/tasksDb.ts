import { Task, TaskInput } from '../schemas/task';
import { dbClient } from '../db/client';

/**
 * Logical table name used in the {@link dbClient} stub. Centralised here so
 * a future migration to a real database can map it to a SQL table without
 * hunting through call sites.
 */
const TABLE = 'tasks';

/**
 * Repository for tasks. Same surface as before — route handlers stay
 * untouched — but storage now flows through {@link dbClient} instead of a
 * private Map. That makes the boundary `tasksDb → db.client → "Postgres"`
 * visible both in the code and in the architecture diagram.
 */
export const tasksDb = {
  /** @returns every stored task as an array. Order is insertion order. */
  list(): Task[] {
    return dbClient.selectAll<Task>(TABLE);
  },

  /** @returns the task with the given id, or `undefined` if it does not exist. */
  get(id: string): Task | undefined {
    return dbClient.findById<Task>(TABLE, id);
  },

  /**
   * Insert a fully-formed task. Caller owns id/timestamp generation so this
   * function stays free of clock/UUID concerns and is easy to test.
   *
   * @returns the same task that was inserted (for fluent use).
   */
  create(task: Task): Task {
    return dbClient.insert<Task>(TABLE, task.id, task);
  },

  /**
   * Patch a task's user-supplied fields. Server-owned fields (`id`,
   * `created_at`) are preserved by {@link dbClient.update}.
   *
   * @returns the updated task, or `undefined` when the id is unknown.
   */
  update(id: string, input: TaskInput): Task | undefined {
    return dbClient.update<Task>(TABLE, id, input);
  },

  /**
   * Remove a task by id.
   *
   * @returns `true` if a task was removed, `false` if the id was unknown.
   */
  delete(id: string): boolean {
    return dbClient.delete(TABLE, id);
  },

  /**
   * Wipe the store. Test-only helper — the underscore prefix signals that
   * production code should not call this. Used by `beforeEach` to guarantee
   * test isolation.
   */
  _reset(): void {
    dbClient.clear(TABLE);
  },
};
