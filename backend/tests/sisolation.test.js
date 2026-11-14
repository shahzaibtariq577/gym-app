const request = require('supertest');
const jwt = require('jsonwebtoken');
const Gym = require('../models/Gym');
const { app, startDb, stopDb, clearDb, loginToken, auth, makeMember } = require('./helpers');

const SLIP = 'data:image/png;base64,AAAA';

let tokenA;
let tokenB;
let memberA;
let packageA;
let paymentA;
let expenseA;
let gymA;

function monthText() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

function get(path, token) {
  return request(app).get(path).set(auth(token));
}

function send(method, path, token, body) {
  return request(app)[method](path).set(auth(token)).send(body || {});
}

beforeAll(startDb, 180000);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  tokenA = await loginToken();
  tokenB = await loginToken({ username: 'ownerb', gymName: 'Gym B' });

  memberA = await makeMember(tokenA);
  const packages = await get('/api/packages', tokenA);
  packageA = packages.body[0];

  const paid = await send('put', '/api/members/' + memberA._id + '/pay', tokenA, {
    amount: 1500,
    method: 'Bank',
    slipImage: SLIP,
  });
  paymentA = paid.body.payment;

  const expense = await send('post', '/api/expenses', tokenA, {
    date: monthText() + '-15',
    category: 'Rent',
    amount: 20000,
    note: 'Rent of gym A',
    billImage: SLIP,
  });
  expenseA = expense.body;

  gymA = await Gym.findOne({ name: 'Test Gym' });
});

describe('gym B cannot see anything of gym A', () => {
  test('setup: gym A sees its own data', async () => {
    expect((await get('/api/members', tokenA)).body).toHaveLength(1);
    expect((await get('/api/packages', tokenA)).body).toHaveLength(1);
    expect((await get('/api/payments', tokenA)).body).toHaveLength(1);
    expect((await get('/api/expenses?month=' + monthText(), tokenA)).body).toHaveLength(1);
  });

  test('members list', async () => {
    const res = await get('/api/members', tokenB);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('packages list', async () => {
    const res = await get('/api/packages', tokenB);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('payments list, also when the member id of gym A is asked for', async () => {
    expect((await get('/api/payments', tokenB)).body).toEqual([]);
    const byMember = await get('/api/payments?memberId=' + memberA._id, tokenB);
    expect(byMember.body).toEqual([]);
  });

  test('payment summary', async () => {
    const a = await get('/api/payments/summary', tokenA);
    expect(a.body.total).toBe(1500);
    const b = await get('/api/payments/summary', tokenB);
    expect(b.body.total).toBe(0);
    expect(b.body.count).toBe(0);
  });

  test('expenses list and insights', async () => {
    const list = await get('/api/expenses?month=' + monthText(), tokenB);
    expect(list.body).toEqual([]);

    const a = await get('/api/expenses/insights?month=' + monthText(), tokenA);
    expect(a.body.spent).toBe(20000);
    expect(a.body.earned).toBe(1500);

    const b = await get('/api/expenses/insights?month=' + monthText(), tokenB);
    expect(b.body.spent).toBe(0);
    expect(b.body.earned).toBe(0);
    expect(b.body.profit).toBe(0);
  });

  test('settings show only the own gym', async () => {
    const a = await get('/api/settings', tokenA);
    const b = await get('/api/settings', tokenB);
    expect(a.body.gymName).toBe('Test Gym');
    expect(a.body.username).toBe('testowner');
    expect(b.body.gymName).toBe('Gym B');
    expect(b.body.username).toBe('ownerb');
  });

  test('bank slip and bill pictures', async () => {
    expect((await get('/api/payments/' + paymentA._id + '/slip', tokenA)).status).toBe(200);
    expect((await get('/api/payments/' + paymentA._id + '/slip', tokenB)).status).toBe(404);
    expect((await get('/api/expenses/' + expenseA._id + '/bill', tokenA)).status).toBe(200);
    expect((await get('/api/expenses/' + expenseA._id + '/bill', tokenB)).status).toBe(404);
  });
});

describe('gym B cannot change anything of gym A', () => {
  test('edit a member', async () => {
    const res = await send('put', '/api/members/' + memberA._id, tokenB, { name: 'Hacked' });
    expect(res.status).toBe(404);
    const now = await get('/api/members', tokenA);
    expect(now.body[0].name).toBe('Ali Khan');
  });

  test('delete a member', async () => {
    const res = await send('delete', '/api/members/' + memberA._id, tokenB);
    expect(res.status).toBe(404);
    expect((await get('/api/members', tokenA)).body).toHaveLength(1);
  });

  test('mark a member of gym A as paid', async () => {
    const res = await send('put', '/api/members/' + memberA._id + '/pay', tokenB, { amount: 100 });
    expect(res.status).toBe(404);
    expect((await get('/api/payments', tokenA)).body).toHaveLength(1);
    expect((await get('/api/members', tokenA)).body[0].balance).toBe(2500);
  });

  test('undo a payment of gym A', async () => {
    const res = await send('delete', '/api/payments/' + paymentA._id, tokenB);
    expect(res.status).toBe(404);
    expect((await get('/api/payments', tokenA)).body).toHaveLength(1);
    expect((await get('/api/members', tokenA)).body[0].balance).toBe(2500);
  });

  test('edit a package of gym A', async () => {
    const res = await send('put', '/api/packages/' + packageA._id, tokenB, { name: 'Hacked', fee: 1 });
    expect(res.status).toBe(404);
    const now = await get('/api/packages', tokenA);
    expect(now.body[0].name).toBe('Gold');
    expect(now.body[0].fee).toBe(4000);
  });

  test('delete a package of gym A', async () => {
    const res = await send('delete', '/api/packages/' + packageA._id, tokenB);
    expect(res.status).toBe(404);
    expect((await get('/api/packages', tokenA)).body).toHaveLength(1);
  });

  test('edit and delete an expense of gym A', async () => {
    const edit = await send('put', '/api/expenses/' + expenseA._id, tokenB, { amount: 1 });
    expect(edit.status).toBe(404);
    const del = await send('delete', '/api/expenses/' + expenseA._id, tokenB);
    expect(del.status).toBe(404);
    const now = await get('/api/expenses?month=' + monthText(), tokenA);
    expect(now.body).toHaveLength(1);
    expect(now.body[0].amount).toBe(20000);
  });

  test('change the settings: only the own gym changes', async () => {
    const res = await send('put', '/api/settings', tokenB, { gymName: 'New B', gymPhone: '0300' });
    expect(res.status).toBe(200);
    const a = await get('/api/settings', tokenA);
    expect(a.body.gymName).toBe('Test Gym');
    expect(a.body.gymPhone).toBe('');
    const b = await get('/api/settings', tokenB);
    expect(b.body.gymName).toBe('New B');
  });

  test('a package of gym A cannot be used by gym B', async () => {
    const add = await send('post', '/api/members', tokenB, {
      name: 'Bilal',
      phone: '03001234568',
      packageId: packageA._id,
    });
    expect(add.status).toBe(400);

    const own = await makeMember(tokenB);
    const edit = await send('put', '/api/members/' + own._id, tokenB, { packageId: packageA._id });
    expect(edit.status).toBe(400);
    const now = await get('/api/members', tokenB);
    expect(now.body[0].packageName).toBe('Gold');
    expect(now.body[0].fee).toBe(4000);
  });
});

describe('the gym comes only from the login token', () => {
  test('a gymId in the body is ignored when adding a package', async () => {
    const add = await send('post', '/api/packages', tokenB, {
      name: 'Silver',
      fee: 3000,
      durationDays: 30,
      gymId: String(gymA._id),
    });
    expect(add.status).toBe(201);
    expect((await get('/api/packages', tokenA)).body).toHaveLength(1);
    expect((await get('/api/packages', tokenB)).body).toHaveLength(1);
  });

  test('a gymId in the body is ignored when adding a member', async () => {
    await makeMember(tokenB);
    const packagesB = await get('/api/packages', tokenB);
    const add = await send('post', '/api/members', tokenB, {
      name: 'Bilal',
      phone: '03001234568',
      packageId: packagesB.body[0]._id,
      gymId: String(gymA._id),
    });
    expect(add.status).toBe(201);
    expect((await get('/api/members', tokenA)).body).toHaveLength(1);
    expect((await get('/api/members', tokenB)).body).toHaveLength(2);
  });

  test('a gymId in the address is ignored', async () => {
    const res = await get('/api/members?gymId=' + gymA._id, tokenB);
    expect(res.body).toEqual([]);
    const pay = await get('/api/payments?gymId=' + gymA._id, tokenB);
    expect(pay.body).toEqual([]);
  });

  test('an old token without a gym is refused', async () => {
    const oldToken = jwt.sign(
      { id: '000000000000000000000001', username: 'testowner' },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '7d' }
    );
    const res = await get('/api/members', oldToken);
    expect(res.status).toBe(401);
  });

  test('a token that is signed with another secret is refused', async () => {
    const fake = jwt.sign(
      { id: '000000000000000000000001', username: 'x', gymId: String(gymA._id) },
      'another-secret-another-secret',
      { algorithm: 'HS256', expiresIn: '7d' }
    );
    const res = await get('/api/members', fake);
    expect(res.status).toBe(401);
  });
});

describe('two gyms live side by side', () => {
  test('both gyms can have a package with the same name', async () => {
    const own = await makeMember(tokenB);
    expect(own._id).toBeDefined();
    expect(own.packageName).toBe('Gold');
    expect((await get('/api/packages', tokenA)).body).toHaveLength(1);
    expect((await get('/api/packages', tokenB)).body).toHaveLength(1);
  });

  test('renaming a package in gym B does not touch the members of gym A', async () => {
    const own = await makeMember(tokenB);
    const packagesB = await get('/api/packages', tokenB);
    await send('put', '/api/packages/' + packagesB.body[0]._id, tokenB, { name: 'Gold Plus' });
    const membersB = await get('/api/members', tokenB);
    expect(membersB.body.find((m) => m._id === own._id).packageName).toBe('Gold Plus');
    const membersA = await get('/api/members', tokenA);
    expect(membersA.body[0].packageName).toBe('Gold');
  });

  test('gym A does not see the data of gym B either', async () => {
    await makeMember(tokenB);
    expect((await get('/api/members', tokenA)).body).toHaveLength(1);
    expect((await get('/api/packages', tokenA)).body).toHaveLength(1);
  });
});