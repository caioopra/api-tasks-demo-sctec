import request from 'supertest';
import { createApp } from '../src/app';
import { tasksDb } from '../src/storage/tasksDb';
import { usersDb } from '../src/auth/usersDb';
import { cacheService } from '../src/services/cache.service';

const app = createApp();

let bearer: string;

beforeAll(async () => {
  usersDb._reset();
  const res = await request(app)
    .post('/auth/register')
    .send({ email: 'tester@example.com', password: 'password-123' });
  bearer = `Bearer ${res.body.token}`;
});

beforeEach(() => {
  tasksDb._reset();
  cacheService._reset();
});

describe('tasks API', () => {
  it('POST /tasks with a valid body returns 201 and the created task', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Authorization', bearer)
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
      .set('Authorization', bearer)
      .send({ title: '', priority: 'low' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: expect.any(String),
      status: 400,
    });
    expect(res.body.error.length).toBeGreaterThan(0);
  });

  it('GET /tasks/:id for unknown id returns 404', async () => {
    const res = await request(app).get('/tasks/does-not-exist').set('Authorization', bearer);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'task not found', status: 404 });
  });

  it('DELETE /tasks/:id for an existing task returns 204', async () => {
    const created = await request(app)
      .post('/tasks')
      .set('Authorization', bearer)
      .send({ title: 'Throwaway', priority: 'med' });

    const res = await request(app).delete(`/tasks/${created.body.id}`).set('Authorization', bearer);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(tasksDb.get(created.body.id)).toBeUndefined();
  });

  describe('GET /tasks/search', () => {
    beforeEach(async () => {
      await request(app)
        .post('/tasks')
        .set('Authorization', bearer)
        .send({ title: 'Buy milk', priority: 'low' });
      await request(app)
        .post('/tasks')
        .set('Authorization', bearer)
        .send({ title: 'Buy bread', priority: 'high' });
      await request(app)
        .post('/tasks')
        .set('Authorization', bearer)
        .send({ title: 'Write report', priority: 'high' });
    });

    it('with no params returns all tasks', async () => {
      const res = await request(app).get('/tasks/search').set('Authorization', bearer);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
    });

    it('filters by priority', async () => {
      const res = await request(app)
        .get('/tasks/search?priority=high')
        .set('Authorization', bearer);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.every((t: { priority: string }) => t.priority === 'high')).toBe(true);
    });

    it('filters by q (case-insensitive title substring)', async () => {
      const res = await request(app).get('/tasks/search?q=BUY').set('Authorization', bearer);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(
        res.body.every((t: { title: string }) => t.title.toLowerCase().includes('buy')),
      ).toBe(true);
    });

    it('combines priority and q filters', async () => {
      const res = await request(app)
        .get('/tasks/search?priority=high&q=bread')
        .set('Authorization', bearer);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ title: 'Buy bread', priority: 'high' });
    });

    it('rejects an invalid priority with 400 in {error, status} shape', async () => {
      const res = await request(app)
        .get('/tasks/search?priority=urgent')
        .set('Authorization', bearer);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: expect.any(String), status: 400 });
    });
  });

  describe('GET /tasks/stats', () => {
    it('returns zeros when there are no tasks', async () => {
      const res = await request(app).get('/tasks/stats').set('Authorization', bearer);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ total: 0, byPriority: { low: 0, med: 0, high: 0 } });
    });

    it('counts total and per priority', async () => {
      await request(app)
        .post('/tasks')
        .set('Authorization', bearer)
        .send({ title: 'a', priority: 'low' });
      await request(app)
        .post('/tasks')
        .set('Authorization', bearer)
        .send({ title: 'b', priority: 'high' });
      await request(app)
        .post('/tasks')
        .set('Authorization', bearer)
        .send({ title: 'c', priority: 'high' });

      const res = await request(app).get('/tasks/stats').set('Authorization', bearer);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ total: 3, byPriority: { low: 1, med: 0, high: 2 } });
    });
  });

  it('full lifecycle: create -> get -> update -> delete', async () => {
    const create = await request(app)
      .post('/tasks')
      .set('Authorization', bearer)
      .send({ title: 'Original', priority: 'low' });
    expect(create.status).toBe(201);
    const { id, created_at } = create.body;

    const fetched = await request(app).get(`/tasks/${id}`).set('Authorization', bearer);
    expect(fetched.status).toBe(200);
    expect(fetched.body).toEqual({ id, title: 'Original', priority: 'low', created_at });

    const updated = await request(app)
      .put(`/tasks/${id}`)
      .set('Authorization', bearer)
      .send({ title: 'Updated', priority: 'high' });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({ id, title: 'Updated', priority: 'high', created_at });

    const removed = await request(app).delete(`/tasks/${id}`).set('Authorization', bearer);
    expect(removed.status).toBe(204);

    const after = await request(app).get(`/tasks/${id}`).set('Authorization', bearer);
    expect(after.status).toBe(404);
    expect(after.body).toEqual({ error: 'task not found', status: 404 });
  });

  describe('POST /tasks/:id/share', () => {
    it('returns 200 with task, shared_by and shared_at for an existing task', async () => {
      const created = await request(app)
        .post('/tasks')
        .set('Authorization', bearer)
        .send({ title: 'Shareable', priority: 'med' });

      const res = await request(app)
        .post(`/tasks/${created.body.id}/share`)
        .set('Authorization', bearer);

      expect(res.status).toBe(200);
      expect(res.body.task).toEqual(created.body);
      expect(res.body.shared_by).toEqual({ email: 'tester@example.com' });
      expect(typeof res.body.shared_at).toBe('string');
      expect(() => new Date(res.body.shared_at).toISOString()).not.toThrow();
    });

    it('returns 404 when the task id does not exist', async () => {
      const res = await request(app)
        .post('/tasks/does-not-exist/share')
        .set('Authorization', bearer);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'task not found', status: 404 });
    });

    it('returns 401 when no bearer token is supplied', async () => {
      const res = await request(app).post('/tasks/anything/share');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: expect.any(String), status: 401 });
    });
  });

  describe('cache behaviour', () => {
    it('GET /tasks/:id serves stale cached value after the underlying row is deleted from the db directly', async () => {
      // This test demonstrates the read-through cache: once a task is fetched,
      // a subsequent read with the row gone from the db (but not the cache)
      // still returns the cached copy.
      const create = await request(app)
        .post('/tasks')
        .set('Authorization', bearer)
        .send({ title: 'Cached', priority: 'low' });
      const id = create.body.id;

      // Populate the cache via GET.
      const first = await request(app).get(`/tasks/${id}`).set('Authorization', bearer);
      expect(first.status).toBe(200);

      // Bypass the route — wipe the db directly. The cache still has the entry.
      tasksDb._reset();

      const second = await request(app).get(`/tasks/${id}`).set('Authorization', bearer);
      expect(second.status).toBe(200);
      expect(second.body).toMatchObject({ id, title: 'Cached', priority: 'low' });
    });
  });
});
