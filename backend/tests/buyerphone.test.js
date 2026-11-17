const request = require('supertest');
const { app, startDb, stopDb, clearDb, loginToken, auth } = require('./helpers');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

async function addProduct(token) {
  const res = await request(app)
    .post('/api/shop/products')
    .set(auth(token))
    .send({ name: 'Whey Protein', salePrice: 9000, costPrice: 7000, stock: 10 });
  return res.body;
}

async function sell(token, productId, extra) {
  return request(app)
    .post('/api/shop/sales')
    .set(auth(token))
    .send({ productId: productId, quantity: 2, ...extra });
}

async function stockOf(token, productId) {
  const res = await request(app).get('/api/shop/products').set(auth(token));
  return res.body.find((p) => p._id === productId).stock;
}

describe('buyer phone', () => {
  test('is saved with the sale and comes back in the list', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await sell(token, product._id, {
      amountPaid: 5000,
      buyer: 'Ali',
      buyerPhone: '0300 1234567',
    });
    expect(res.status).toBe(201);
    expect(res.body.buyerPhone).toBe('0300 1234567');
    expect(res.body.balance).toBe(13000);

    const list = await request(app).get('/api/shop/sales').set(auth(token));
    expect(list.body[0].buyerPhone).toBe('0300 1234567');
  });

  test('is optional and is empty when not sent', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await sell(token, product._id);
    expect(res.status).toBe(201);
    expect(res.body.buyerPhone).toBe('');
  });

  test('a phone with too few or too many digits is refused and the stock stays', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const bad = ['123', 'abc', '1'.repeat(16), '0'.repeat(31)];
    for (const phone of bad) {
      const res = await sell(token, product._id, { buyer: 'Ali', buyerPhone: phone });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Buyer phone must have 10 to 15 digits');
    }
    expect(await stockOf(token, product._id)).toBe(10);
  });

  test('gym B does not see the phone of gym A', async () => {
    const tokenA = await loginToken({ username: 'ownera', gymName: 'Gym A' });
    const tokenB = await loginToken({ username: 'ownerb', gymName: 'Gym B' });
    const product = await addProduct(tokenA);
    await sell(tokenA, product._id, { buyer: 'Ali', buyerPhone: '03001234567' });
    const list = await request(app).get('/api/shop/sales').set(auth(tokenB));
    expect(list.body).toEqual([]);
  });
});