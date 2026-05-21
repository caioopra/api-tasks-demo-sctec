import request from 'supertest';
import { createApp } from '../src/app';
import { usersDb } from '../src/auth/usersDb';

const app = createApp();

beforeEach(() => {
  usersDb._reset();
});

describe('auth API', () => {
  it('POST /auth/register returns 201 with a user and a token', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'password-123' });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: expect.any(String), email: 'ada@example.com' });
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.split('.')).toHaveLength(3);
  });

  it('POST /auth/register normalises email casing', async () => {
    const first = await request(app)
      .post('/auth/register')
      .send({ email: 'Ada@Example.com', password: 'password-123' });
    expect(first.status).toBe(201);
    expect(first.body.user.email).toBe('ada@example.com');

    const dup = await request(app)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'password-123' });
    expect(dup.status).toBe(409);
    expect(dup.body).toEqual({ error: 'email already registered', status: 409 });
  });

  it('POST /auth/register rejects short passwords with 400 in {error, status} shape', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String), status: 400 });
  });

  it('POST /auth/login with valid credentials returns 200 and a token', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'password-123' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'password-123' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('ada@example.com');
    expect(typeof res.body.token).toBe('string');
  });

  it('POST /auth/login with the wrong password returns 401', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'password-123' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'invalid email or password', status: 401 });
  });

  it('POST /auth/login with unknown email returns 401 with the same message', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'ghost@example.com', password: 'password-123' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'invalid email or password', status: 401 });
  });
});

describe('JWT middleware', () => {
  it('GET /tasks without an Authorization header returns 401', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: 'missing or malformed Authorization header',
      status: 401,
    });
  });

  it('GET /tasks with a malformed Authorization header returns 401', async () => {
    const res = await request(app).get('/tasks').set('Authorization', 'Token foo');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: 'missing or malformed Authorization header',
      status: 401,
    });
  });

  it('GET /tasks with a forged token returns 401', async () => {
    const res = await request(app)
      .get('/tasks')
      .set('Authorization', 'Bearer header.payload.not-a-real-signature');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'invalid or expired token', status: 401 });
  });
});
