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

  describe('GET /tasks/search', () => {
    beforeEach(async () => {
      await request(app).post('/tasks').send({ title: 'Buy milk', priority: 'low' });
      await request(app).post('/tasks').send({ title: 'Buy bread', priority: 'high' });
      await request(app).post('/tasks').send({ title: 'Write report', priority: 'high' });
    });

    it('with no params returns all tasks', async () => {
      const res = await request(app).get('/tasks/search');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });

    it('filters by priority', async () => {
      const res = await request(app).get('/tasks/search?priority=high');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.every((t: { priority: string }) => t.priority === 'high')).toBe(true);
    });

    it('filters by q (case-insensitive title substring)', async () => {
      const res = await request(app).get('/tasks/search?q=BUY');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(
        res.body.every((t: { title: string }) => t.title.toLowerCase().includes('buy')),
      ).toBe(true);
    });

    it('combines priority and q filters', async () => {
      const res = await request(app).get('/tasks/search?priority=high&q=bread');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ title: 'Buy bread', priority: 'high' });
    });

    it('rejects an invalid priority with 400 in {error, status} shape', async () => {
      const res = await request(app).get('/tasks/search?priority=urgent');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: expect.any(String), status: 400 });
    });
  });

  describe('GET /tasks/stats', () => {
    it('returns zeros when there are no tasks', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ total: 0, byPriority: { low: 0, med: 0, high: 0 } });
    });

    it('counts total and per priority', async () => {
      await request(app).post('/tasks').send({ title: 'a', priority: 'low' });
      await request(app).post('/tasks').send({ title: 'b', priority: 'high' });
      await request(app).post('/tasks').send({ title: 'c', priority: 'high' });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ total: 3, byPriority: { low: 1, med: 0, high: 2 } });
    });
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
