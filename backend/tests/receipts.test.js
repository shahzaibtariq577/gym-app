const request = require('supertest');
const { app, startDb, stopDb, clearDb, loginToken, auth, makeMember } = require('./helpers');

const SLIP = 'data:image/png;base64,AAAA';

beforeAll(startDb, 180000);
afterAll(stopDb);
beforeEach(clearDb);

async function payOnce(token, member) {
  const res = await request(app)
    .put('/api/members/' + member._id + '/pay')
    .set(auth(token))
    .send({ amount: 1500, method: 'Bank', slipImage: SLIP });
  return res.body.payment;
}

async function shareOf(token, payment) {
  return request(app)
    .post('/api/payments/' + payment._id + '/share')
    .set(auth(token));
}

async function addProduct(token) {
  const res = await request(app)
    .post('/api/shop/products')
    .set(auth(token))
    .send({ name: 'Whey Protein', salePrice: 9000, costPrice: 7000, stock: 10 });
  return res.body;
}

describe('gym fee receipt link', () => {
  test('gives a long token and the same token every time', async () => {
    const token = await loginToken();
    const member = await makeMember(token);
    const payment = await payOnce(token, member);
    const one = await shareOf(token, payment);
    const two = await shareOf(token, payment);
    expect(one.status).toBe(200);
    expect(one.body.token).toMatch(/^[a-f0-9]{32}$/);
    expect(two.body.token).toBe(one.body.token);
  });

  test('anyone with the token can read the receipt without logging in', async () => {
    const token = await loginToken();
    const member = await makeMember(token);
    const payment = await payOnce(token, member);
    const shared = await shareOf(token, payment);

    const res = await request(app).get('/api/receipts/' + shared.body.token);
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('gym');
    expect(res.body.gymName).toBe('Test Gym');
    expect(res.body.payment.memberName).toBe('Ali Khan');
    expect(res.body.payment.amount).toBe(1500);
    expect(res.body.payment.balanceAfter).toBe(2500);
    expect(res.body.payment.hasSlip).toBe(false);
  });

  test('never sends the bank slip picture, the gym id or the phone number', async () => {
    const token = await loginToken();
    const member = await makeMember(token);
    const payment = await payOnce(token, member);
    const shared = await shareOf(token, payment);
    const res = await request(app).get('/api/receipts/' + shared.body.token);
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('data:image');
    expect(text).not.toContain('gymId');
    expect(text).not.toContain('03001234567');
  });

  test('a wrong or unknown token gives 404', async () => {
    expect((await request(app).get('/api/receipts/abc')).status).toBe(404);
    expect(
      (await request(app).get('/api/receipts/' + 'a'.repeat(32))).status
    ).toBe(404);
  });

  test('making a link needs a login', async () => {
    const res = await request(app).post('/api/payments/000000000000000000000000/share');
    expect(res.status).toBe(401);
  });

  test('gym B cannot make a link for a payment of gym A', async () => {
    const tokenA = await loginToken({ username: 'ownera', gymName: 'Gym A' });
    const tokenB = await loginToken({ username: 'ownerb', gymName: 'Gym B' });
    const member = await makeMember(tokenA);
    const payment = await payOnce(tokenA, member);
    const res = await shareOf(tokenB, payment);
    expect(res.status).toBe(404);
  });

  test('an unknown payment gives 404', async () => {
    const token = await loginToken();
    const res = await request(app)
      .post('/api/payments/000000000000000000000000/share')
      .set(auth(token));
    expect(res.status).toBe(404);
  });
});

describe('shop receipt link', () => {
  test('shows the sale and the later payments, without the buyer phone', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const sale = await request(app)
      .post('/api/shop/sales')
      .set(auth(token))
      .send({
        productId: product._id,
        quantity: 2,
        amountPaid: 5000,
        buyer: 'Ali',
        buyerPhone: '03001234567',
      });
    await request(app)
      .post('/api/shop/sales/' + sale.body._id + '/pay')
      .set(auth(token))
      .send({ amount: 3000, method: 'Bank', slipImage: SLIP });

    const shared = await request(app)
      .post('/api/shop/sales/' + sale.body._id + '/share')
      .set(auth(token));
    expect(shared.status).toBe(200);

    const res = await request(app).get('/api/receipts/' + shared.body.token);
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('shop');
    expect(res.body.sale.productName).toBe('Whey Protein');
    expect(res.body.sale.total).toBe(18000);
    expect(res.body.sale.amountPaid).toBe(8000);
    expect(res.body.sale.paidAtSale).toBe(5000);
    expect(res.body.sale.payments).toHaveLength(1);
    expect(res.body.sale.payments[0].hasSlip).toBe(false);
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('data:image');
    expect(text).not.toContain('03001234567');
    expect(text).not.toContain('gymId');
  });

  test('gym B cannot make a link for a sale of gym A', async () => {
    const tokenA = await loginToken({ username: 'ownera', gymName: 'Gym A' });
    const tokenB = await loginToken({ username: 'ownerb', gymName: 'Gym B' });
    const product = await addProduct(tokenA);
    const sale = await request(app)
      .post('/api/shop/sales')
      .set(auth(tokenA))
      .send({ productId: product._id, quantity: 1 });
    const res = await request(app)
      .post('/api/shop/sales/' + sale.body._id + '/share')
      .set(auth(tokenB));
    expect(res.status).toBe(404);
  });
});