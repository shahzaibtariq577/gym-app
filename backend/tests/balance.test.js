const request = require('supertest');
const Payment = require('../models/Payment');
const Member = require('../models/Member');
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

describe('part payments', () => {
  test('a new member has balance 0', async () => {
    expect(member.balance).toBe(0);
  });

  test('a part payment keeps the due date and saves the balance', async () => {
    const res = await pay({ amount: 1500 });
    expect(res.status).toBe(200);
    expect(res.body.payment.amount).toBe(1500);
    expect(res.body.payment.balanceBefore).toBe(0);
    expect(res.body.payment.balanceAfter).toBe(2500);
    expect(res.body.payment.newDueDate).toBe(res.body.payment.oldDueDate);

    const now = await getMember();
    expect(now.balance).toBe(2500);
    expect(now.nextDueDate).toBe(member.nextDueDate);
  });

  test('the next payment without an amount asks for the remaining balance', async () => {
    await pay({ amount: 1500 });
    const res = await pay();
    expect(res.status).toBe(200);
    expect(res.body.payment.amount).toBe(2500);
    expect(res.body.payment.balanceBefore).toBe(2500);
    expect(res.body.payment.balanceAfter).toBe(0);
  });

  test('paying the rest moves the due date by the package days and clears the balance', async () => {
    await pay({ amount: 1500 });
    const res = await pay({ amount: 2500 });
    const oldDue = new Date(member.nextDueDate);
    const newDue = new Date(res.body.member.nextDueDate);
    expect(Math.round((newDue - oldDue) / DAY)).toBe(30);
    expect(res.body.member.balance).toBe(0);
  });

  test('two part payments in a row lower the balance each time', async () => {
    await pay({ amount: 1000 });
    const second = await pay({ amount: 1000 });
    expect(second.body.payment.balanceBefore).toBe(3000);
    expect(second.body.payment.balanceAfter).toBe(2000);
    const now = await getMember();
    expect(now.balance).toBe(2000);
    expect(now.nextDueDate).toBe(member.nextDueDate);
  });

  test('an amount more than what is owed is refused and saves nothing', async () => {
    const big = await pay({ amount: 5000 });
    expect(big.status).toBe(400);

    await pay({ amount: 1500 });
    const tooMuch = await pay({ amount: 3000 });
    expect(tooMuch.status).toBe(400);

    const list = await request(app).get('/api/payments').set(auth(token));
    expect(list.body).toHaveLength(1);
    const now = await getMember();
    expect(now.balance).toBe(2500);
  });

  test('a late member who pays only part stays late', async () => {
    const late = new Date(Date.now() - 10 * DAY).toISOString();
    await request(app)
      .put('/api/members/' + member._id)
      .set(auth(token))
      .send({ nextDueDate: late });

    await pay({ amount: 1000 });
    const now = await getMember();
    expect(new Date(now.nextDueDate).getTime()).toBe(new Date(late).getTime());
    expect(now.balance).toBe(3000);
  });

  test('a late member who pays everything gets 30 days from today', async () => {
    const late = new Date(Date.now() - 10 * DAY).toISOString();
    await request(app)
      .put('/api/members/' + member._id)
      .set(auth(token))
      .send({ nextDueDate: late });

    await pay({ amount: 1000 });
    const res = await pay({ amount: 3000 });
    const newDue = new Date(res.body.member.nextDueDate);
    expect(Math.round((newDue - Date.now()) / DAY)).toBe(30);
    expect(res.body.member.balance).toBe(0);
  });
});

describe('undo with balance', () => {
  test('undo of a part payment puts the balance and due date back', async () => {
    const res = await pay({ amount: 1500 });
    const undo = await request(app)
      .delete('/api/payments/' + res.body.payment._id)
      .set(auth(token));
    expect(undo.status).toBe(200);

    const now = await getMember();
    expect(now.balance).toBe(0);
    expect(now.nextDueDate).toBe(member.nextDueDate);
  });

  test('undo of the payment that finished the fee brings the balance back', async () => {
    await pay({ amount: 1500 });
    const last = await pay({ amount: 2500 });
    const undo = await request(app)
      .delete('/api/payments/' + last.body.payment._id)
      .set(auth(token));
    expect(undo.status).toBe(200);

    const now = await getMember();
    expect(now.balance).toBe(2500);
    expect(now.nextDueDate).toBe(member.nextDueDate);
  });

  test('only the newest payment can be undone, also with balances', async () => {
    const first = await pay({ amount: 1000 });
    await pay({ amount: 1000 });
    const undo = await request(app)
      .delete('/api/payments/' + first.body.payment._id)
      .set(auth(token));
    expect(undo.status).toBe(400);
    const now = await getMember();
    expect(now.balance).toBe(2000);
  });

  test('an old payment without balance fields can still be undone', async () => {
    const oldDue = new Date(Date.now() + 5 * DAY);
    const newDue = new Date(Date.now() + 35 * DAY);
    await Member.updateOne({ _id: member._id }, { nextDueDate: newDue });
    const old = await Payment.collection.insertOne({
      memberId: new (require('mongoose').Types.ObjectId)(member._id),
      memberName: 'Ali Khan',
      packageName: 'Gold',
      amount: 4000,
      method: 'Cash',
      paidOn: new Date(),
      oldDueDate: oldDue,
      newDueDate: newDue,
    });

    const undo = await request(app)
      .delete('/api/payments/' + old.insertedId)
      .set(auth(token));
    expect(undo.status).toBe(200);

    const now = await getMember();
    expect(now.balance).toBe(0);
    expect(new Date(now.nextDueDate).getTime()).toBe(oldDue.getTime());
  });
});

describe('package change and balance', () => {
  async function otherPackage() {
    const res = await request(app)
      .post('/api/packages')
      .set(auth(token))
      .send({ name: 'Silver', fee: 3000, durationDays: 30 });
    return res.body;
  }

  test('starting a new package today is refused while a balance is open', async () => {
    const silver = await otherPackage();
    await pay({ amount: 1500 });

    const res = await request(app)
      .put('/api/members/' + member._id)
      .set(auth(token))
      .send({ packageId: silver._id, startToday: true });
    expect(res.status).toBe(400);

    const now = await getMember();
    expect(now.packageName).toBe('Gold');
    expect(now.balance).toBe(2500);
  });

  test('starting a new package today works when nothing is owed', async () => {
    const silver = await otherPackage();
    const res = await request(app)
      .put('/api/members/' + member._id)
      .set(auth(token))
      .send({ packageId: silver._id, startToday: true });
    expect(res.status).toBe(200);
    expect(res.body.packageName).toBe('Silver');

    const list = await request(app).get('/api/payments').set(auth(token));
    expect(list.body).toHaveLength(1);
    expect(list.body[0].amount).toBe(3000);
    expect(list.body[0].balanceAfter).toBe(0);
  });
});