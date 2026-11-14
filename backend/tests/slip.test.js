const request = require('supertest');
const { app, startDb, stopDb, clearDb, loginToken, auth, makeMember } = require('./helpers');

const LIMIT = 300000;
const PREFIX = 'data:image/jpeg;base64,';

let token;
let member;

beforeAll(startDb, 180000);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  token = await loginToken();
  member = await makeMember(token);
});

function pay(body) {
  return request(app)
    .put('/api/members/' + member._id + '/pay')
    .set(auth(token))
    .send(body || {});
}

function slipOfLength(length) {
  return PREFIX + 'A'.repeat(length - PREFIX.length);
}

async function getMember() {
  const res = await request(app).get('/api/members').set(auth(token));
  return res.body.find((m) => m._id === member._id);
}

describe('slip size limit', () => {
  test('a slip of exactly 300000 characters is accepted', async () => {
    const res = await pay({ method: 'Bank', slipImage: slipOfLength(LIMIT) });
    expect(res.status).toBe(200);
    expect(res.body.payment.hasSlip).toBe(true);
  });

  test('a slip of 300001 characters is refused', async () => {
    const res = await pay({ method: 'Bank', slipImage: slipOfLength(LIMIT + 1) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Slip picture is too big');
  });

  test('a slip of the old size (700000) is now refused', async () => {
    const res = await pay({ method: 'JazzCash', slipImage: slipOfLength(700000) });
    expect(res.status).toBe(400);
  });

  test('a refused big slip saves nothing and keeps the due date', async () => {
    await pay({ method: 'Bank', slipImage: slipOfLength(LIMIT + 1) });
    const list = await request(app).get('/api/payments').set(auth(token));
    expect(list.body).toEqual([]);
    const now = await getMember();
    expect(now.nextDueDate).toBe(member.nextDueDate);
    expect(now.balance).toBe(0);
  });

  test('an accepted slip can be read back whole from the slip door', async () => {
    const slip = slipOfLength(LIMIT);
    const res = await pay({ method: 'Easypaisa', slipImage: slip });
    const back = await request(app)
      .get('/api/payments/' + res.body.payment._id + '/slip')
      .set(auth(token));
    expect(back.status).toBe(200);
    expect(back.body.slip).toHaveLength(LIMIT);
  });
});