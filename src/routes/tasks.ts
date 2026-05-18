import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { taskInputSchema, Task } from '../schemas/task';
import { tasksDb } from '../storage/tasksDb';
import { HttpError } from '../middlewares/errorHandler';

export const tasksRouter = Router();

const searchQuerySchema = z.object({
  priority: z.enum(['low', 'med', 'high']).optional(),
  q: z
    .string()
    .min(1, 'q must have at least 1 character')
    .max(100, 'q must have at most 100 characters')
    .optional(),
});

tasksRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json(tasksDb.list());
});

tasksRouter.get('/search', (req: Request, res: Response) => {
  const { priority, q } = searchQuerySchema.parse(req.query);
  const needle = q?.toLowerCase();
  const result = tasksDb.list().filter((task) => {
    if (priority && task.priority !== priority) return false;
    if (needle && !task.title.toLowerCase().includes(needle)) return false;
    return true;
  });
  res.status(200).json(result);
});

tasksRouter.get('/stats', (_req: Request, res: Response) => {
  const all = tasksDb.list();
  const byPriority: Record<Task['priority'], number> = { low: 0, med: 0, high: 0 };
  for (const task of all) byPriority[task.priority]++;
  res.status(200).json({ total: all.length, byPriority });
});

tasksRouter.get('/:id', (req: Request, res: Response) => {
  const task = tasksDb.get(req.params.id);
  if (!task) throw new HttpError(404, 'task not found');
  res.status(200).json(task);
});

tasksRouter.post('/', (req: Request, res: Response) => {
  const input = taskInputSchema.parse(req.body);
  const task: Task = {
    id: randomUUID(),
    title: input.title,
    priority: input.priority,
    created_at: new Date().toISOString(),
  };
  tasksDb.create(task);
  res.status(201).json(task);
});

tasksRouter.put('/:id', (req: Request, res: Response) => {
  const input = taskInputSchema.parse(req.body);
  const updated = tasksDb.update(req.params.id, input);
  if (!updated) throw new HttpError(404, 'task not found');
  res.status(200).json(updated);
});

tasksRouter.delete('/:id', (req: Request, res: Response) => {
  const removed = tasksDb.delete(req.params.id);
  if (!removed) throw new HttpError(404, 'task not found');
  res.status(204).send();
});
