import { z } from 'zod';

export const taskInputSchema = z.object({
  title: z
    .string({ required_error: 'title is required' })
    .min(1, 'title must have at least 1 character')
    .max(100, 'title must have at most 100 characters'),
  priority: z.enum(['low', 'med', 'high'], {
    errorMap: () => ({ message: "priority must be one of: 'low', 'med', 'high'" }),
  }),
});

export type TaskInput = z.infer<typeof taskInputSchema>;

export interface Task extends TaskInput {
  id: string;
  created_at: string;
}
