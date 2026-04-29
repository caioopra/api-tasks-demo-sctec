import { Task, TaskInput } from '../schemas/task';

const tasks = new Map<string, Task>();

export const tasksDb = {
  list(): Task[] {
    return Array.from(tasks.values());
  },

  get(id: string): Task | undefined {
    return tasks.get(id);
  },

  create(task: Task): Task {
    tasks.set(task.id, task);
    return task;
  },

  update(id: string, input: TaskInput): Task | undefined {
    const existing = tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...input };
    tasks.set(id, updated);
    return updated;
  },

  delete(id: string): boolean {
    return tasks.delete(id);
  },

  _reset(): void {
    tasks.clear();
  },
};
