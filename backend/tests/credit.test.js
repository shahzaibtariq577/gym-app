const request = require('supertest');
const { app, startDb, stopDb, clearDb, loginToken, auth } = require('./helpers');
const Sale = require('../models/Sale');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const SLIP = 'data:image/png;base64,AAAA';

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

async function sell(token, productId, extra) {
  return request(app)
    .post('/api/shop/sales')
    .set(auth(token))
    .send({ productId: productId, quantity: 2, ...extra });
}

async function pay(token, saleId, body) {
  return request(app)
    .post('/api/shop/sales/' + saleId + '/pay')
    .set(auth(token))
    .send(body);
}

async function stockOf(token, productId) {
  const res = await request(app).get('/api/shop/products').set(auth(token));
  return res.body.find((p) => p._id === productId).stock;
}

describe('payment status on a new sale', () => {
  test('a normal sale is Paid with no balance', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await sell(token, product._id);
    expect(res.status).toBe(201);
    expect(res.body.amountPaid).toBe(18000);
    expect(res.body.balance).toBe(0);
    expect(res.body.status).toBe('Paid');
    expect(res.body.payments).toEqual([]);
  });

  test('paying less than the total with a buyer is Part paid', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await sell(token, product._id, { amountPaid: 5000, buyer: 'Ali' });
    expect(res.status).toBe(201);
    expect(res.body.amountPaid).toBe(5000);
    expect(res.body.balance).toBe(13000);
    expect(res.body.status).toBe('Part paid');
    expect(res.body.profit).toBe(4000);
    expect(await stockOf(token, product._id)).toBe(8);
  });

  test('paying nothing is Unpaid', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await sell(token, product._id, {
      amountPaid: 0,
      buyer: 'Ali',
      method: 'Bank',
      slipImage: SLIP,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('Unpaid');
    expect(res.body.balance).toBe(18000);
    expect(res.body.method).toBe('Cash');
    expect(res.body.hasSlip).toBe(false);
  });

  test('the buyer name is needed when the customer pays less', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await sell(token, product._id, { amountPaid: 5000 });
    expect(res.status).toBe(400);
    expect(await stockOf(token, product._id)).toBe(10);
  });

  test('refuses an amount above the total or below zero', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const tooMuch = await sell(token, product._id, { amountPaid: 18001, buyer: 'Ali' });
    const negative = await sell(token, product._id, { amountPaid: -1, buyer: 'Ali' });
    const text = await sell(token, product._id, { amountPaid: 'abc', buyer: 'Ali' });
    expect(tooMuch.status).toBe(400);
    expect(negative.status).toBe(400);
    expect(text.status).toBe(400);
    expect(await stockOf(token, product._id)).toBe(10);
  });

  test('a custom price changes the total that must be paid', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await sell(token, product._id, { unitPrice: 8000, amountPaid: 16000 });
    expect(res.body.total).toBe(16000);
    expect(res.body.status).toBe('Paid');
  });
});

describe('collect money later', () => {
  test('two payments finish the sale', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const sale = await sell(token, product._id, { amountPaid: 5000, buyer: 'Ali' });

    const first = await pay(token, sale.body._id, { amount: 8000, method: 'JazzCash', slipImage: SLIP });
    expect(first.status).toBe(200);
    expect(first.body.amountPaid).toBe(13000);
    expect(first.body.balance).toBe(5000);
    expect(first.body.status).toBe('Part paid');
    expect(first.body.payments.length).toBe(1);
    expect(first.body.payments[0].hasSlip).toBe(true);
    expect(first.body.payments[0].slipImage).toBeUndefined();

    const second = await pay(token, sale.body._id, { amount: 5000 });
    expect(second.status).toBe(200);
    expect(second.body.status).toBe('Paid');
    expect(second.body.balance).toBe(0);
    expect(second.body.payments.length).toBe(2);
    expect(second.body.payments[1].method).toBe('Cash');
    expect(second.body.paidAtSale).toBe(5000);
  });

  test('refuses zero, too much, a paid sale, a wrong method and a bad slip', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const sale = await sell(token, product._id, { amountPaid: 5000, buyer: 'Ali' });
    const id = sale.body._id;

    expect((await pay(token, id, { amount: 0 })).status).toBe(400);
    expect((await pay(token, id, { amount: -5 })).status).toBe(400);
    expect((await pay(token, id, { amount: 'abc' })).status).toBe(400);
    expect((await pay(token, id, { amount: 13001 })).status).toBe(400);
    expect((await pay(token, id, { amount: 100, method: 'Gold' })).status).toBe(400);
    expect((await pay(token, id, { amount: 100, method: 'Bank', slipImage: 'hello' })).status).toBe(400);
    expect(
      (await pay(token, id, { amount: 100, method: 'Bank', slipImage: 'data:image/png;base64,' + 'A'.repeat(300001) })).status
    ).toBe(400);

    const list = await request(app).get('/api/shop/sales').set(auth(token));
    expect(list.body[0].amountPaid).toBe(5000);
    expect(list.body[0].payments.length).toBe(0);

    await pay(token, id, { amount: 13000 });
    const again = await pay(token, id, { amount: 1 });
    expect(again.status).toBe(400);
  });

  test('a later payment slip opens on its own door and the list never sends it', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const sale = await sell(token, product._id, { amountPaid: 1000, buyer: 'Ali' });
    const paid = await pay(token, sale.body._id, { amount: 2000, method: 'Easypaisa', slipImage: SLIP });
    const paymentId = paid.body.payments[0]._id;

    const slip = await request(app)
      .get('/api/shop/sales/' + sale.body._id + '/payments/' + paymentId + '/slip')
      .set(auth(token));
    expect(slip.status).toBe(200);
    expect(slip.body.slip).toBe(SLIP);

    const list = await request(app).get('/api/shop/sales').set(auth(token));
    expect(list.body[0].payments[0].slipImage).toBeUndefined();
    expect(list.body[0].payments[0].hasSlip).toBe(true);
  });

  test('a Cash payment keeps no slip picture', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const sale = await sell(token, product._id, { amountPaid: 1000, buyer: 'Ali' });
    const paid = await pay(token, sale.body._id, { amount: 2000, method: 'Cash', slipImage: SLIP });
    expect(paid.body.payments[0].hasSlip).toBe(false);
  });

  test('unknown sale gives 404', async () => {
    const token = await loginToken();
    const res = await pay(token, '64b000000000000000000000', { amount: 100 });
    expect(res.status).toBe(404);
  });

  test('gym B cannot collect money or open payment slips of gym A', async () => {
    const tokenA = await loginToken({ username: 'ownera', gymName: 'Gym A' });
    const tokenB = await loginToken({ username: 'ownerb', gymName: 'Gym B' });
    const product = await addProduct(tokenA);
    const sale = await sell(tokenA, product._id, { amountPaid: 1000, buyer: 'Ali' });
    const paid = await pay(tokenA, sale.body._id, { amount: 500, method: 'Bank', slipImage: SLIP });

    const tryPay = await pay(tokenB, sale.body._id, { amount: 100 });
    expect(tryPay.status).toBe(404);

    const slip = await request(app)
      .get('/api/shop/sales/' + sale.body._id + '/payments/' + paid.body.payments[0]._id + '/slip')
      .set(auth(tokenB));
    expect(slip.status).toBe(404);

    const list = await request(app).get('/api/shop/sales').set(auth(tokenB));
    expect(list.body.length).toBe(0);
  });
});

describe('old sales and money rule', () => {
  test('an old sale without amountPaid counts as fully paid', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const sale = await sell(token, product._id);
    await Sale.updateOne({ _id: sale.body._id }, { $unset: { amountPaid: 1 } });

    const list = await request(app).get('/api/shop/sales').set(auth(token));
    expect(list.body[0].status).toBe('Paid');
    expect(list.body[0].balance).toBe(0);
    expect(list.body[0].amountPaid).toBe(18000);
    expect(list.body[0].paidAtSale).toBe(18000);

    const res = await pay(token, sale.body._id, { amount: 10 });
    expect(res.status).toBe(400);

    const sum = await request(app).get('/api/shop/summary').set(auth(token));
    expect(sum.body.owed).toBe(0);
    expect(sum.body.owedCount).toBe(0);
  });

  test('summary counts the whole sale as earned and shows what customers owe', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    await sell(token, product._id, { amountPaid: 5000, buyer: 'Ali' });
    await sell(token, product._id, { amountPaid: 0, buyer: 'Sara', quantity: 1 });
    await sell(token, product._id);
    const sum = await request(app).get('/api/shop/summary').set(auth(token));
    expect(sum.body.total).toBe(18000 + 9000 + 18000);
    expect(sum.body.profit).toBe(4000 + 2000 + 4000);
    expect(sum.body.owed).toBe(13000 + 9000);
    expect(sum.body.owedCount).toBe(2);
  });

  test('owed goes down when money is collected', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const sale = await sell(token, product._id, { amountPaid: 0, buyer: 'Ali' });
    await pay(token, sale.body._id, { amount: 18000 });
    const sum = await request(app).get('/api/shop/summary').set(auth(token));
    expect(sum.body.owed).toBe(0);
    expect(sum.body.owedCount).toBe(0);
    expect(sum.body.total).toBe(18000);
  });

  test('the Expenses profit still counts the full sale', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    await sell(token, product._id, { amountPaid: 0, buyer: 'Ali' });
    const res = await request(app).get('/api/expenses/insights').set(auth(token));
    expect(res.body.shopEarned).toBe(18000);
    expect(res.body.profit).toBe(4000);
  });
});

describe('remove a credit sale', () => {
  test('puts the stock back and removes the payments with it', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const sale = await sell(token, product._id, { amountPaid: 1000, buyer: 'Ali' });
    await pay(token, sale.body._id, { amount: 2000, method: 'Bank', slipImage: SLIP });
    expect(await stockOf(token, product._id)).toBe(8);

    const del = await request(app)
      .delete('/api/shop/sales/' + sale.body._id)
      .set(auth(token));
    expect(del.status).toBe(200);
    expect(await stockOf(token, product._id)).toBe(10);
    expect(await Sale.countDocuments({})).toBe(0);
  });
});