const request = require('supertest');
const { app, startDb, stopDb, clearDb, loginToken, auth, makeMember } = require('./helpers');

const DAY = 24 * 60 * 60 * 1000;

let token;

beforeAll(startDb, 180000);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  token = await loginToken();
});

function addPackage(body) {
  return request(app).post('/api/packages').set(auth(token)).send(body);
}

describe('packages', () => {
  test('add a package and see it in the list', async () => {
    const res = await addPackage({ name: 'Silver', fee: 3000, durationDays: 30 });
    expect(res.status).toBe(201);
    const list = await request(app).get('/api/packages').set(auth(token));
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe('Silver');
  });

  test('the list is sorted by fee, the cheapest first', async () => {
    await addPackage({ name: 'Big', fee: 9000, durationDays: 90 });
    await addPackage({ name: 'Small', fee: 200, durationDays: 1 });
    const list = await request(app).get('/api/packages').set(auth(token));
    expect(list.body.map((p) => p.name)).toEqual(['Small', 'Big']);
  });

  test('a fee of 0, no name, and days that are not whole are refused', async () => {
    expect((await addPackage({ name: 'A', fee: 0, durationDays: 30 })).status).toBe(400);
    expect((await addPackage({ name: '  ', fee: 100, durationDays: 30 })).status).toBe(400);
    expect((await addPackage({ name: 'B', fee: 100, durationDays: 1.5 })).status).toBe(400);
  });

  test('the same package name twice is refused', async () => {
    await addPackage({ name: 'Gold', fee: 4000, durationDays: 30 });
    const again = await addPackage({ name: 'Gold', fee: 5000, durationDays: 30 });
    expect(again.status).toBe(400);
  });

  test('the details list is cleaned (no empty lines, no repeats)', async () => {
    const res = await addPackage({
      name: 'Pro',
      fee: 6000,
      durationDays: 30,
      features: ['Cardio', ' ', 'cardio', 'Sauna'],
    });
    expect(res.body.features).toEqual(['Cardio', 'Sauna']);
  });

  test('rename a package: its members get the new name', async () => {
    const member = await makeMember(token);
    const list = await request(app).get('/api/packages').set(auth(token));
    const gold = list.body[0];

    const edit = await request(app)
      .put('/api/packages/' + gold._id)
      .set(auth(token))
      .send({ name: 'Gold Plus' });
    expect(edit.status).toBe(200);

    const members = await request(app).get('/api/members').set(auth(token));
    const mine = members.body.find((m) => m._id === member._id);
    expect(mine.packageName).toBe('Gold Plus');
  });

  test('a package used by a member cannot be deleted', async () => {
    await makeMember(token);
    const list = await request(app).get('/api/packages').set(auth(token));
    const del = await request(app)
      .delete('/api/packages/' + list.body[0]._id)
      .set(auth(token));
    expect(del.status).toBe(400);
  });

  test('a package nobody uses can be deleted', async () => {
    const pkg = await addPackage({ name: 'Temp', fee: 100, durationDays: 1 });
    const del = await request(app)
      .delete('/api/packages/' + pkg.body._id)
      .set(auth(token));
    expect(del.status).toBe(200);
    const list = await request(app).get('/api/packages').set(auth(token));
    expect(list.body).toEqual([]);
  });
});

describe('adding members', () => {
  test('a new member gets the package fee and a due date after the package days', async () => {
    const member = await makeMember(token);
    expect(member.fee).toBe(4000);
    expect(member.packageName).toBe('Gold');
    const days = Math.round((new Date(member.nextDueDate) - Date.now()) / DAY);
    expect(days).toBe(30);
  });

  test('a short phone number is refused', async () => {
    const pkg = await addPackage({ name: 'Gold', fee: 4000, durationDays: 30 });
    const res = await request(app)
      .post('/api/members')
      .set(auth(token))
      .send({ name: 'Ali', phone: '123', packageId: pkg.body._id });
    expect(res.status).toBe(400);
  });

  test('an empty name is refused', async () => {
    const pkg = await addPackage({ name: 'Gold', fee: 4000, durationDays: 30 });
    const res = await request(app)
      .post('/api/members')
      .set(auth(token))
      .send({ name: ' ', phone: '03001234567', packageId: pkg.body._id });
    expect(res.status).toBe(400);
  });

  test('a photo that is not a picture is refused', async () => {
    const pkg = await addPackage({ name: 'Gold', fee: 4000, durationDays: 30 });
    const res = await request(app)
      .post('/api/members')
      .set(auth(token))
      .send({
        name: 'Ali',
        phone: '03001234567',
        photo: 'not-a-picture',
        packageId: pkg.body._id,
      });
    expect(res.status).toBe(400);
  });

  test('a package that does not exist is refused', async () => {
    const res = await request(app)
      .post('/api/members')
      .set(auth(token))
      .send({
        name: 'Ali',
        phone: '03001234567',
        packageId: '000000000000000000000000',
      });
    expect(res.status).toBe(400);
  });
});
