import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { taskInputSchema, Task } from '../schemas/task';
import { tasksDb } from '../storage/tasksDb';
import { HttpError } from '../middlewares/errorHandler';

export const tasksRouter = Router();

tasksRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json(tasksDb.list());
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
