const request = require('supertest');
const { app, startDb, stopDb, clearDb, loginToken, auth, makeMember } = require('./helpers');

const DAY = 24 * 60 * 60 * 1000;

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

async function getMember() {
  const res = await request(app).get('/api/members').set(auth(token));
  return res.body.find((m) => m._id === member._id);
}

describe('Mark as paid', () => {
  test('saves a payment with the fee and Cash as the default method', async () => {
    const res = await pay();
    expect(res.status).toBe(200);
    expect(res.body.payment.amount).toBe(4000);
    expect(res.body.payment.method).toBe('Cash');
    expect(res.body.payment.feeAtPayment).toBe(4000);
    expect(res.body.payment.memberName).toBe('Ali Khan');
  });

  test('a member who is not late: the new due date is old due date + 30 days', async () => {
    const res = await pay();
    const oldDue = new Date(member.nextDueDate);
    const newDue = new Date(res.body.member.nextDueDate);
    expect(Math.round((newDue - oldDue) / DAY)).toBe(30);
  });

  test('a late member: the 30 days start from today', async () => {
    const late = new Date(Date.now() - 10 * DAY).toISOString();
    await request(app)
      .put('/api/members/' + member._id)
      .set(auth(token))
      .send({ nextDueDate: late });

    const res = await pay();
    const newDue = new Date(res.body.member.nextDueDate);
    expect(Math.round((newDue - Date.now()) / DAY)).toBe(30);
  });

  test('a different amount and method are saved', async () => {
    const res = await pay({ amount: 1500, method: 'JazzCash' });
    expect(res.status).toBe(200);
    expect(res.body.payment.amount).toBe(1500);
    expect(res.body.payment.method).toBe('JazzCash');
    expect(res.body.payment.feeAtPayment).toBe(4000);
  });

  test('amount 0, a negative amount and a too big amount are refused', async () => {
    expect((await pay({ amount: 0 })).status).toBe(400);
    expect((await pay({ amount: -50 })).status).toBe(400);
    expect((await pay({ amount: 99999999 })).status).toBe(400);
  });

  test('a wrong method is refused', async () => {
    const res = await pay({ method: 'Bitcoin' });
    expect(res.status).toBe(400);
  });

  test('a refused payment saves nothing and keeps the due date', async () => {
    await pay({ amount: 0 });
    const list = await request(app).get('/api/payments').set(auth(token));
    expect(list.body).toEqual([]);
    const now = await getMember();
    expect(now.nextDueDate).toBe(member.nextDueDate);
  });

  test('a slip that is not a picture is refused', async () => {
    const res = await pay({ slipImage: 'hello' });
    expect(res.status).toBe(400);
  });

  test('a member that does not exist gives 404', async () => {
    const res = await request(app)
      .put('/api/members/000000000000000000000000/pay')
      .set(auth(token))
      .send({});
    expect(res.status).toBe(404);
  });
});

describe('bank slip', () => {
  const SLIP = 'data:image/png;base64,AAAA';

  test('the list says hasSlip but never sends the big picture', async () => {
    await pay({ slipImage: SLIP, method: 'Bank' });
    const list = await request(app).get('/api/payments').set(auth(token));
    expect(list.body).toHaveLength(1);
    expect(list.body[0].hasSlip).toBe(true);
    expect(list.body[0].slipImage).toBeUndefined();
  });

  test('the slip door gives the picture back', async () => {
    const res = await pay({ slipImage: SLIP, method: 'Bank' });
    const slip = await request(app)
      .get('/api/payments/' + res.body.payment._id + '/slip')
      .set(auth(token));
    expect(slip.status).toBe(200);
    expect(slip.body.slip).toBe(SLIP);
  });

  test('a payment without a slip gives 404 on the slip door', async () => {
    const res = await pay();
    const slip = await request(app)
      .get('/api/payments/' + res.body.payment._id + '/slip')
      .set(auth(token));
    expect(slip.status).toBe(404);
  });
});

describe('Undo', () => {
  test('undo puts the old due date back and removes the payment', async () => {
    const res = await pay();
    const undo = await request(app)
      .delete('/api/payments/' + res.body.payment._id)
      .set(auth(token));
    expect(undo.status).toBe(200);

    const now = await getMember();
    expect(now.nextDueDate).toBe(member.nextDueDate);

    const list = await request(app).get('/api/payments').set(auth(token));
    expect(list.body).toEqual([]);
  });

  test('only the newest payment of a member can be undone', async () => {
    const first = await pay();
    await pay();
    const undo = await request(app)
      .delete('/api/payments/' + first.body.payment._id)
      .set(auth(token));
    expect(undo.status).toBe(400);

    const list = await request(app).get('/api/payments').set(auth(token));
    expect(list.body).toHaveLength(2);
  });

  test('undo of a payment that does not exist gives 404', async () => {
    const undo = await request(app)
      .delete('/api/payments/000000000000000000000000')
      .set(auth(token));
    expect(undo.status).toBe(404);
  });
});

describe('lists and totals', () => {
  test('the list can be filtered by member', async () => {
    await pay();
    const other = await request(app)
      .get('/api/payments?memberId=000000000000000000000000')
      .set(auth(token));
    expect(other.body).toEqual([]);
    const mine = await request(app)
      .get('/api/payments?memberId=' + member._id)
      .set(auth(token));
    expect(mine.body).toHaveLength(1);
  });

  test('the month total adds the payments of this month', async () => {
    await pay({ amount: 4000 });
    await pay({ amount: 1000 });
    const res = await request(app).get('/api/payments/summary').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5000);
    expect(res.body.count).toBe(2);
  });
});