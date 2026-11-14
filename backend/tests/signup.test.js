const request = require('supertest');
const { app, startDb, stopDb, clearDb, auth } = require('./helpers');

beforeAll(startDb, 180000);
afterAll(stopDb);
beforeEach(clearDb);

function signup(body) {
  return request(app).post('/api/auth/signup').send(body);
}

const GOOD = { gymName: 'Iron House', username: 'ironowner', password: 'password123' };

describe('sign up', () => {
  test('a new gym can sign up and gets a working token', async () => {
    const res = await signup(GOOD);
    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.username).toBe('ironowner');
    expect(res.body.gymName).toBe('Iron House');

    const members = await request(app).get('/api/members').set(auth(res.body.token));
    expect(members.status).toBe(200);
    expect(members.body).toEqual([]);

    const settings = await request(app).get('/api/settings').set(auth(res.body.token));
    expect(settings.body.gymName).toBe('Iron House');
  });

  test('after sign up the owner can log in', async () => {
    await signup(GOOD);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'IronOwner', password: 'password123' });
    expect(login.status).toBe(200);
    expect(typeof login.body.token).toBe('string');
  });

  test('a username that is taken is refused', async () => {
    await signup(GOOD);
    const again = await signup({ ...GOOD, gymName: 'Other Gym' });
    expect(again.status).toBe(400);
    expect(again.body.error).toBe('That username is already taken');
  });

  test('a short password, a bad username and a bad gym name are refused', async () => {
    expect((await signup({ ...GOOD, password: 'short' })).status).toBe(400);
    expect((await signup({ ...GOOD, username: 'a b' })).status).toBe(400);
    expect((await signup({ ...GOOD, username: 'ab' })).status).toBe(400);
    expect((await signup({ ...GOOD, gymName: ' ' })).status).toBe(400);
    expect((await signup({ ...GOOD, gymName: 'x'.repeat(41) })).status).toBe(400);
    expect((await signup({})).status).toBe(400);
  });

  test('a refused sign up creates nothing', async () => {
    await signup({ ...GOOD, password: 'short' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ironowner', password: 'short' });
    expect(login.status).toBe(401);
  });

  test('two new gyms never see each other', async () => {
    const one = await signup(GOOD);
    const two = await signup({ gymName: 'Power Gym', username: 'powerowner', password: 'password123' });

    const add = await request(app)
      .post('/api/packages')
      .set(auth(one.body.token))
      .send({ name: 'Monthly', fee: 3000, durationDays: 30 });
    expect(add.status).toBe(201);

    const seeOne = await request(app).get('/api/packages').set(auth(one.body.token));
    const seeTwo = await request(app).get('/api/packages').set(auth(two.body.token));
    expect(seeOne.body).toHaveLength(1);
    expect(seeTwo.body).toEqual([]);
  });
});

describe('sign up limit', () => {
  test('too many sign ups from one address are stopped (429)', async () => {
    const statuses = [];
    for (let i = 0; i < 30; i++) {
      const res = await signup({
        gymName: 'Gym ' + i,
        username: 'limituser' + i,
        password: 'password123',
      });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
    expect(statuses.indexOf(429)).toBeGreaterThan(0);
  });
});