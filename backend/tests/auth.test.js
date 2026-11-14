const request = require('supertest');
const { app, startDb, stopDb, clearDb, loginToken, auth } = require('./helpers');

beforeAll(startDb, 180000);
afterAll(stopDb);
beforeEach(clearDb);

describe('login', () => {
  test('right username and password gives a token', async () => {
    await loginToken();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testowner', password: 'password123' });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.username).toBe('testowner');
  });

  test('username is not case sensitive', async () => {
    await loginToken();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: '  TestOwner ', password: 'password123' });
    expect(res.status).toBe(200);
  });

  test('wrong password gives 401', async () => {
    await loginToken();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testowner', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  test('unknown username gives the same 401 answer', async () => {
    await loginToken();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Wrong username or password');
  });
});

describe('login guard', () => {
  test('a data route without a token gives 401', async () => {
    const res = await request(app).get('/api/members');
    expect(res.status).toBe(401);
  });

  test('every data route is guarded', async () => {
    const routes = [
      '/api/members',
      '/api/packages',
      '/api/payments',
      '/api/payments/summary',
      '/api/settings',
      '/api/expenses',
      '/api/expenses/insights',
    ];
    for (const route of routes) {
      const res = await request(app).get(route);
      expect(res.status).toBe(401);
    }
  });

  test('a fake token gives 401', async () => {
    const res = await request(app)
      .get('/api/members')
      .set({ Authorization: 'Bearer not-a-real-token' });
    expect(res.status).toBe(401);
  });

  test('a good token opens the route', async () => {
    const token = await loginToken();
    const res = await request(app).get('/api/members').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('too many wrong tries', () => {
  test('after 5 wrong tries even the right password is blocked (429)', async () => {
    await loginToken();
    for (let i = 0; i < 5; i++) {
      const wrong = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testowner', password: 'wrong-password' });
      expect(wrong.status).toBe(401);
    }
    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testowner', password: 'password123' });
    expect(blocked.status).toBe(429);
  });
});