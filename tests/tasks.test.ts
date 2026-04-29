import request from 'supertest';
import { createApp } from '../src/app';
import { tasksDb } from '../src/storage/tasksDb';

const app = createApp();

beforeEach(() => {
  tasksDb._reset();
});

describe('tasks API', () => {
  it('POST /tasks with a valid body returns 201 and the created task', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Buy milk', priority: 'low' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Buy milk', priority: 'low' });
    expect(typeof res.body.id).toBe('string');
    expect(res.body.id.length).toBeGreaterThan(0);
    expect(typeof res.body.created_at).toBe('string');
    expect(() => new Date(res.body.created_at).toISOString()).not.toThrow();
  });

  it('POST /tasks with empty title returns 400 in {error, status} shape', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: '', priority: 'low' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: expect.any(String),
      status: 400,
    });
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  it('GET /tasks/:id for unknown id returns 404', async () => {
    const res = await request(app).get('/tasks/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'task not found', status: 404 });
  });

  it('DELETE /tasks/:id for an existing task returns 204', async () => {
    const created = await request(app)
      .post('/tasks')
      .send({ title: 'Throwaway', priority: 'med' });

    const res = await request(app).delete(`/tasks/${created.body.id}`);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(tasksDb.get(created.body.id)).toBeUndefined();
  });

  it('full lifecycle: create -> get -> update -> delete', async () => {
    const create = await request(app)
      .post('/tasks')
      .send({ title: 'Original', priority: 'low' });
    expect(create.status).toBe(201);
    const { id, created_at } = create.body;

    const fetched = await request(app).get(`/tasks/${id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body).toEqual({ id, title: 'Original', priority: 'low', created_at });

    const updated = await request(app)
      .put(`/tasks/${id}`)
      .send({ title: 'Updated', priority: 'high' });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({ id, title: 'Updated', priority: 'high', created_at });

    const removed = await request(app).delete(`/tasks/${id}`);
    expect(removed.status).toBe(204);

    const after = await request(app).get(`/tasks/${id}`);
    expect(after.status).toBe(404);
    expect(after.body).toEqual({ error: 'task not found', status: 404 });
  });
});
