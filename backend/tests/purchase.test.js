const request = require('supertest');
const { app, startDb, stopDb, clearDb, loginToken, auth } = require('./helpers');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const BILL = 'data:image/png;base64,AAAA';

async function addProduct(token, extra) {
  const res = await request(app)
    .post('/api/shop/products')
    .set(auth(token))
    .send({
      name: 'Whey Protein',
      salePrice: 9000,
      costPrice: 7000,
      stock: 10,
      ...extra,
    });
  return res.body;
}

async function buy(token, productId, extra) {
  return request(app)
    .post('/api/shop/purchases')
    .set(auth(token))
    .send({ productId: productId, quantity: 10, unitCost: 8000, ...extra });
}

async function getProduct(token, productId) {
  const res = await request(app).get('/api/shop/products').set(auth(token));
  return res.body.find((p) => p._id === productId);
}

async function expensesOf(token) {
  const res = await request(app).get('/api/expenses').set(auth(token));
  return res.body;
}

describe('buy stock', () => {
  test('purchase doors need a login', async () => {
    const res = await request(app).get('/api/shop/purchases');
    expect(res.status).toBe(401);
  });

  test('adds stock and sets the weighted average buying price', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await buy(token, product._id);
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(80000);
    expect(res.body.billImage).toBeUndefined();
    const after = await getProduct(token, product._id);
    expect(after.stock).toBe(20);
    expect(after.costPrice).toBe(7500);
  });

  test('the first purchase on an empty shelf uses the new price', async () => {
    const token = await loginToken();
    const product = await addProduct(token, { stock: 0 });
    await buy(token, product._id, { quantity: 4, unitCost: 7200 });
    const after = await getProduct(token, product._id);
    expect(after.stock).toBe(4);
    expect(after.costPrice).toBe(7200);
  });

  test('creates one locked Supplements expense with the bill', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await buy(token, product._id, { billImage: BILL, supplier: 'Ali Traders' });
    const list = await expensesOf(token);
    expect(list.length).toBe(1);
    expect(list[0].category).toBe('Supplements');
    expect(list[0].amount).toBe(80000);
    expect(list[0].hasBill).toBe(true);
    expect(list[0].purchaseId).toBe(res.body._id);
    const bill = await request(app)
      .get('/api/expenses/' + list[0]._id + '/bill')
      .set(auth(token));
    expect(bill.body.bill).toBe(BILL);
  });

  test('refuses bad numbers and keeps stock and expenses unchanged', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const bad = [
      { quantity: 0 },
      { quantity: 1.5 },
      { quantity: -2 },
      { unitCost: 0 },
      { unitCost: 'abc' },
      { billImage: 'hello' },
      { billImage: 'data:image/png;base64,' + 'A'.repeat(300001) },
      { unitCost: 10000000, quantity: 5 },
    ];
    for (const extra of bad) {
      const res = await buy(token, product._id, extra);
      expect(res.status).toBe(400);
    }
    const after = await getProduct(token, product._id);
    expect(after.stock).toBe(10);
    expect(after.costPrice).toBe(7000);
    expect((await expensesOf(token)).length).toBe(0);
  });

  test('unknown product gives 404', async () => {
    const token = await loginToken();
    const res = await buy(token, '64b000000000000000000000');
    expect(res.status).toBe(404);
  });

  test('the Shop summary counts the purchase as stock bought', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    await buy(token, product._id);
    const res = await request(app).get('/api/shop/summary').set(auth(token));
    expect(res.body.spent).toBe(80000);
    expect(res.body.spentCount).toBe(1);
    expect(res.body.stockUnits).toBe(20);
  });

  test('the Expenses insights count the purchase as stock bought, not as spent', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    await buy(token, product._id);
    const res = await request(app).get('/api/expenses/insights').set(auth(token));
    expect(res.body.stockBought).toBe(80000);
    expect(res.body.spent).toBe(0);
  });
});

describe('locked purchase expenses', () => {
  test('edit and delete are refused with a clear message', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    await buy(token, product._id);
    const expense = (await expensesOf(token))[0];

    const put = await request(app)
      .put('/api/expenses/' + expense._id)
      .set(auth(token))
      .send({ amount: 5 });
    expect(put.status).toBe(400);
    expect(put.body.error).toBe('Remove it from Shop > Purchase history');

    const del = await request(app)
      .delete('/api/expenses/' + expense._id)
      .set(auth(token));
    expect(del.status).toBe(400);
    expect(del.body.error).toBe('Remove it from Shop > Purchase history');
    expect((await expensesOf(token)).length).toBe(1);
  });

  test('a Supplements expense typed by hand can still be edited and deleted', async () => {
    const token = await loginToken();
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const day = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const made = await request(app)
      .post('/api/expenses')
      .set(auth(token))
      .send({ date: day, category: 'Supplements', amount: 500 });
    expect(made.status).toBe(201);
    const put = await request(app)
      .put('/api/expenses/' + made.body._id)
      .set(auth(token))
      .send({ amount: 600 });
    expect(put.status).toBe(200);
    const del = await request(app)
      .delete('/api/expenses/' + made.body._id)
      .set(auth(token));
    expect(del.status).toBe(200);
  });
});

describe('purchase history', () => {
  test('lists purchases for a month and for all, never sends the bill', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    await buy(token, product._id, { billImage: BILL });
    const month = await request(app).get('/api/shop/purchases').set(auth(token));
    expect(month.body.length).toBe(1);
    expect(month.body[0].billImage).toBeUndefined();
    expect(month.body[0].hasBill).toBe(true);
    const all = await request(app).get('/api/shop/purchases?month=all').set(auth(token));
    expect(all.body.length).toBe(1);
    const old = await request(app).get('/api/shop/purchases?month=2020-01').set(auth(token));
    expect(old.body.length).toBe(0);
    const wrong = await request(app).get('/api/shop/purchases?month=abc').set(auth(token));
    expect(wrong.status).toBe(400);
  });

  test('the bill opens on its own door', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await buy(token, product._id, { billImage: BILL });
    const bill = await request(app)
      .get('/api/shop/purchases/' + res.body._id + '/bill')
      .set(auth(token));
    expect(bill.status).toBe(200);
    expect(bill.body.bill).toBe(BILL);
  });
});

describe('undo a purchase', () => {
  test('puts the stock and the old buying price back and deletes the expense', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await buy(token, product._id);
    const del = await request(app)
      .delete('/api/shop/purchases/' + res.body._id)
      .set(auth(token));
    expect(del.status).toBe(200);
    const after = await getProduct(token, product._id);
    expect(after.stock).toBe(10);
    expect(after.costPrice).toBe(7000);
    expect((await expensesOf(token)).length).toBe(0);
    const list = await request(app).get('/api/shop/purchases').set(auth(token));
    expect(list.body.length).toBe(0);
  });

  test('is refused when the bought stock is already sold', async () => {
    const token = await loginToken();
    const product = await addProduct(token, { stock: 0 });
    const res = await buy(token, product._id, { quantity: 5 });
    await request(app)
      .post('/api/shop/sales')
      .set(auth(token))
      .send({ productId: product._id, quantity: 4 });
    const del = await request(app)
      .delete('/api/shop/purchases/' + res.body._id)
      .set(auth(token));
    expect(del.status).toBe(400);
    const after = await getProduct(token, product._id);
    expect(after.stock).toBe(1);
    expect((await expensesOf(token)).length).toBe(1);
  });

  test('only the newest purchase of a product can be removed', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const first = await buy(token, product._id, { quantity: 2 });
    const second = await buy(token, product._id, { quantity: 3, unitCost: 9000 });
    const tooEarly = await request(app)
      .delete('/api/shop/purchases/' + first.body._id)
      .set(auth(token));
    expect(tooEarly.status).toBe(400);
    const ok = await request(app)
      .delete('/api/shop/purchases/' + second.body._id)
      .set(auth(token));
    expect(ok.status).toBe(200);
    const next = await request(app)
      .delete('/api/shop/purchases/' + first.body._id)
      .set(auth(token));
    expect(next.status).toBe(200);
    const after = await getProduct(token, product._id);
    expect(after.stock).toBe(10);
    expect(after.costPrice).toBe(7000);
    expect((await expensesOf(token)).length).toBe(0);
  });

  test('unknown purchase gives 404', async () => {
    const token = await loginToken();
    const del = await request(app)
      .delete('/api/shop/purchases/64b000000000000000000000')
      .set(auth(token));
    expect(del.status).toBe(404);
  });
});

describe('two gyms and purchases', () => {
  test('gym B cannot buy for, list, open or remove gym A purchases', async () => {
    const tokenA = await loginToken({ username: 'ownera', gymName: 'Gym A' });
    const tokenB = await loginToken({ username: 'ownerb', gymName: 'Gym B' });
    const product = await addProduct(tokenA);
    const res = await buy(tokenA, product._id, { billImage: BILL });

    const tryBuy = await buy(tokenB, product._id);
    expect(tryBuy.status).toBe(404);

    const list = await request(app).get('/api/shop/purchases?month=all').set(auth(tokenB));
    expect(list.body.length).toBe(0);

    const bill = await request(app)
      .get('/api/shop/purchases/' + res.body._id + '/bill')
      .set(auth(tokenB));
    expect(bill.status).toBe(404);

    const del = await request(app)
      .delete('/api/shop/purchases/' + res.body._id)
      .set(auth(tokenB));
    expect(del.status).toBe(404);

    const after = await getProduct(tokenA, product._id);
    expect(after.stock).toBe(20);
  });
});