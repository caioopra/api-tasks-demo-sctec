import { Task, TaskInput } from '../schemas/task';

/**
 * Backing store: an in-memory Map keyed by `task.id`. Suitable for this
 * educational demo — data does not survive a process restart. A real app
 * would swap this for a database without changing the {@link tasksDb} API.
 */
const tasks = new Map<string, Task>();

/**
 * Tiny repository wrapping {@link tasks}. Centralising access here keeps
 * route handlers free of storage details and gives the test suite a single
 * place to reset state via {@link tasksDb._reset}.
 */
export const tasksDb = {
  /** @returns every stored task as an array. Order is insertion order. */
  list(): Task[] {
    return Array.from(tasks.values());
  },

  /** @returns the task with the given id, or `undefined` if it does not exist. */
  get(id: string): Task | undefined {
    return tasks.get(id);
  },

  /**
   * Insert a fully-formed task. Caller owns id/timestamp generation so this
   * function stays free of clock/UUID concerns and is easy to test.
   *
   * @returns the same task that was inserted (for fluent use).
   */
  create(task: Task): Task {
    tasks.set(task.id, task);
    return task;
  },

  /**
   * Patch a task's user-supplied fields. Server-owned fields (`id`,
   * `created_at`) are preserved by spreading the existing record first.
   *
   * @param id     - id of the task to update.
   * @param input  - validated {@link TaskInput} from the request body.
   * @returns the updated task, or `undefined` when the id is unknown.
   */
  update(id: string, input: TaskInput): Task | undefined {
    const existing = tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...input };
    tasks.set(id, updated);
    return updated;
  },

  /**
   * Remove a task by id.
   *
   * @returns `true` if a task was removed, `false` if the id was unknown.
   */
  delete(id: string): boolean {
    return tasks.delete(id);
  },

  /**
   * Wipe the store. Test-only helper — the underscore prefix signals that
   * production code should not call this. Used by `beforeEach` to guarantee
   * test isolation.
   */
  _reset(): void {
    tasks.clear();
  },
};
