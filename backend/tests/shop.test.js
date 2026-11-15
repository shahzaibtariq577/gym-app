const request = require('supertest');
const { app, startDb, stopDb, clearDb, loginToken, auth } = require('./helpers');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

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

function todayText() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

async function addExpense(token, category, amount) {
  return request(app)
    .post('/api/expenses')
    .set(auth(token))
    .send({ date: todayText(), category: category, amount: amount });
}

async function stockOf(token, productId) {
  const res = await request(app).get('/api/shop/products').set(auth(token));
  return res.body.find((p) => p._id === productId).stock;
}

describe('shop login', () => {
  test('shop doors need a login', async () => {
    const res = await request(app).get('/api/shop/products');
    expect(res.status).toBe(401);
  });
});

describe('products', () => {
  test('adds and lists a product', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    expect(product.name).toBe('Whey Protein');
    expect(product.stock).toBe(10);

    const list = await request(app).get('/api/shop/products').set(auth(token));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  test('refuses a missing name', async () => {
    const token = await loginToken();
    const res = await request(app)
      .post('/api/shop/products')
      .set(auth(token))
      .send({ name: '  ', salePrice: 100, stock: 1 });
    expect(res.status).toBe(400);
  });

  test('refuses a sale price of 0 or less', async () => {
    const token = await loginToken();
    const res = await request(app)
      .post('/api/shop/products')
      .set(auth(token))
      .send({ name: 'Shaker', salePrice: 0, stock: 1 });
    expect(res.status).toBe(400);
  });

  test('refuses a stock that is not a whole number', async () => {
    const token = await loginToken();
    const res = await request(app)
      .post('/api/shop/products')
      .set(auth(token))
      .send({ name: 'Shaker', salePrice: 500, stock: 1.5 });
    expect(res.status).toBe(400);
  });

  test('refuses a photo that is not a picture', async () => {
    const token = await loginToken();
    const res = await request(app)
      .post('/api/shop/products')
      .set(auth(token))
      .send({ name: 'Shaker', salePrice: 500, stock: 1, photo: 'hello' });
    expect(res.status).toBe(400);
  });

  test('refuses the same name twice in one gym', async () => {
    const token = await loginToken();
    await addProduct(token);
    const res = await request(app)
      .post('/api/shop/products')
      .set(auth(token))
      .send({ name: 'Whey Protein', salePrice: 100, stock: 1 });
    expect(res.status).toBe(400);
  });

  test('edits a product and its stock', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await request(app)
      .put('/api/shop/products/' + product._id)
      .set(auth(token))
      .send({ salePrice: 9500, stock: 25 });
    expect(res.status).toBe(200);
    expect(res.body.salePrice).toBe(9500);
    expect(res.body.stock).toBe(25);
    expect(res.body.name).toBe('Whey Protein');
  });

  test('deletes a product', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await request(app)
      .delete('/api/shop/products/' + product._id)
      .set(auth(token));
    expect(res.status).toBe(200);
    const list = await request(app).get('/api/shop/products').set(auth(token));
    expect(list.body).toHaveLength(0);
  });
});

describe('sales', () => {
  test('a sale lowers the stock and saves the total and profit', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await sell(token, product._id, { buyer: 'Ali' });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(18000);
    expect(res.body.profit).toBe(4000);
    expect(res.body.buyer).toBe('Ali');
    expect(await stockOf(token, product._id)).toBe(8);
  });

  test('a different price each is used for the total', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await sell(token, product._id, { unitPrice: 8500 });
    expect(res.status).toBe(201);
    expect(res.body.total).toBe(17000);
    expect(res.body.profit).toBe(3000);
  });

  test('refuses more than the stock and keeps the stock', async () => {
    const token = await loginToken();
    const product = await addProduct(token, { stock: 1 });
    const res = await sell(token, product._id);
    expect(res.status).toBe(400);
    expect(await stockOf(token, product._id)).toBe(1);
  });

  test('refuses a quantity of 0 or a part number', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const zero = await sell(token, product._id, { quantity: 0 });
    const part = await sell(token, product._id, { quantity: 1.5 });
    expect(zero.status).toBe(400);
    expect(part.status).toBe(400);
    expect(await stockOf(token, product._id)).toBe(10);
  });

  test('removing a sale puts the stock back', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const sale = await sell(token, product._id);
    expect(await stockOf(token, product._id)).toBe(8);

    const res = await request(app)
      .delete('/api/shop/sales/' + sale.body._id)
      .set(auth(token));
    expect(res.status).toBe(200);
    expect(await stockOf(token, product._id)).toBe(10);

    const list = await request(app).get('/api/shop/sales').set(auth(token));
    expect(list.body).toHaveLength(0);
  });

  test('a sale stays in the list after its product is deleted', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    await sell(token, product._id);
    await request(app)
      .delete('/api/shop/products/' + product._id)
      .set(auth(token));

    const list = await request(app).get('/api/shop/sales').set(auth(token));
    expect(list.body).toHaveLength(1);
    expect(list.body[0].productName).toBe('Whey Protein');
  });

  test('a bad month is refused', async () => {
    const token = await loginToken();
    const res = await request(app)
      .get('/api/shop/sales?month=abc')
      .set(auth(token));
    expect(res.status).toBe(400);
  });
});

describe('summary and total earning', () => {
  test('the summary adds up the sales of the month', async () => {
    const token = await loginToken();
    const whey = await addProduct(token);
    const shaker = await addProduct(token, {
      name: 'Shaker',
      salePrice: 800,
      costPrice: 500,
      stock: 5,
    });
    await sell(token, whey._id);
    await sell(token, shaker._id, { quantity: 1 });

    const res = await request(app).get('/api/shop/summary').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(18800);
    expect(res.body.profit).toBe(4300);
    expect(res.body.itemsSold).toBe(3);
    expect(res.body.saleCount).toBe(2);
    expect(res.body.byProduct[0].name).toBe('Whey Protein');
  });

  test('counts products with low stock', async () => {
    const token = await loginToken();
    await addProduct(token, { stock: 3 });
    const res = await request(app).get('/api/shop/summary').set(auth(token));
    expect(res.body.lowStock).toBe(1);
  });

  test('shop sales are added to the total earned in the insights', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    await sell(token, product._id);

    const res = await request(app)
      .get('/api/expenses/insights')
      .set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.shopEarned).toBe(18000);
    expect(res.body.feesEarned).toBe(0);
    expect(res.body.earned).toBe(18000);
    expect(res.body.profit).toBe(4000);
    expect(res.body.shopCost).toBe(14000);
    expect(res.body.shopSaleCount).toBe(1);
    expect(res.body.trend[res.body.trend.length - 1].shopEarned).toBe(18000);
  });
});

describe('two gyms', () => {
  test('gym B cannot see the products or sales of gym A', async () => {
    const tokenA = await loginToken({ username: 'ownera', gymName: 'Gym A' });
    const tokenB = await loginToken({ username: 'ownerb', gymName: 'Gym B' });
    const product = await addProduct(tokenA);
    await sell(tokenA, product._id);

    const products = await request(app).get('/api/shop/products').set(auth(tokenB));
    const sales = await request(app).get('/api/shop/sales').set(auth(tokenB));
    const summary = await request(app).get('/api/shop/summary').set(auth(tokenB));
    expect(products.body).toHaveLength(0);
    expect(sales.body).toHaveLength(0);
    expect(summary.body.total).toBe(0);
  });

  test('gym B cannot sell, edit or delete a product of gym A', async () => {
    const tokenA = await loginToken({ username: 'ownera', gymName: 'Gym A' });
    const tokenB = await loginToken({ username: 'ownerb', gymName: 'Gym B' });
    const product = await addProduct(tokenA);

    const soldRes = await sell(tokenB, product._id);
    const editRes = await request(app)
      .put('/api/shop/products/' + product._id)
      .set(auth(tokenB))
      .send({ stock: 999 });
    const deleteRes = await request(app)
      .delete('/api/shop/products/' + product._id)
      .set(auth(tokenB));

    expect(soldRes.status).toBe(404);
    expect(editRes.status).toBe(404);
    expect(deleteRes.status).toBe(404);
    expect(await stockOf(tokenA, product._id)).toBe(10);
  });

  test('gym B cannot remove a sale of gym A', async () => {
    const tokenA = await loginToken({ username: 'ownera', gymName: 'Gym A' });
    const tokenB = await loginToken({ username: 'ownerb', gymName: 'Gym B' });
    const product = await addProduct(tokenA);
    const sale = await sell(tokenA, product._id);

    const res = await request(app)
      .delete('/api/shop/sales/' + sale.body._id)
      .set(auth(tokenB));
    expect(res.status).toBe(404);
    expect(await stockOf(tokenA, product._id)).toBe(8);
  });

  test('two gyms can use the same product name', async () => {
    const tokenA = await loginToken({ username: 'ownera', gymName: 'Gym A' });
    const tokenB = await loginToken({ username: 'ownerb', gymName: 'Gym B' });
    const a = await addProduct(tokenA);
    const b = await addProduct(tokenB);
    expect(a.name).toBe('Whey Protein');
    expect(b.name).toBe('Whey Protein');
  });

  test('a gymId sent by the browser is ignored', async () => {
    const tokenA = await loginToken({ username: 'ownera', gymName: 'Gym A' });
    const tokenB = await loginToken({ username: 'ownerb', gymName: 'Gym B' });
    const product = await addProduct(tokenA);

    const res = await request(app)
      .post('/api/shop/products')
      .set(auth(tokenB))
      .send({
        name: 'Creatine',
        salePrice: 5000,
        costPrice: 3500,
        stock: 4,
        gymId: product.gymId,
      });
    expect(res.status).toBe(201);

    const listA = await request(app).get('/api/shop/products').set(auth(tokenA));
    expect(listA.body).toHaveLength(1);
  });
});

describe('stock bought, stock value and profit', () => {
  test('a Supplements expense is shown as stock bought and not as a cost', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    await sell(token, product._id);

    const made = await addExpense(token, 'Supplements', 10000);
    expect(made.status).toBe(201);

    const res = await request(app).get('/api/shop/summary').set(auth(token));
    expect(res.body.total).toBe(18000);
    expect(res.body.cost).toBe(14000);
    expect(res.body.profit).toBe(4000);
    expect(res.body.spent).toBe(10000);
    expect(res.body.spentCount).toBe(1);
  });

  test('a big stock purchase does not reduce the shop profit', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    await sell(token, product._id);
    await addExpense(token, 'Supplements', 50000);

    const res = await request(app).get('/api/shop/summary').set(auth(token));
    expect(res.body.profit).toBe(4000);
    expect(res.body.spent).toBe(50000);
  });

  test('other expense categories are not counted as stock bought', async () => {
    const token = await loginToken();
    await addExpense(token, 'Rent', 50000);
    await addExpense(token, 'Supplements', 3000);

    const res = await request(app).get('/api/shop/summary').set(auth(token));
    expect(res.body.spent).toBe(3000);
    expect(res.body.spentCount).toBe(1);
  });

  test('gym B does not see the supplement expenses of gym A', async () => {
    const tokenA = await loginToken({ username: 'ownera', gymName: 'Gym A' });
    const tokenB = await loginToken({ username: 'ownerb', gymName: 'Gym B' });
    await addExpense(tokenA, 'Supplements', 10000);

    const res = await request(app).get('/api/shop/summary').set(auth(tokenB));
    expect(res.body.spent).toBe(0);
    expect(res.body.spentCount).toBe(0);
  });

  test('stock value is the stock times the buying price', async () => {
    const token = await loginToken();
    const whey = await addProduct(token);
    await addProduct(token, {
      name: 'Shaker',
      salePrice: 800,
      costPrice: 500,
      stock: 5,
    });
    await sell(token, whey._id);

    const res = await request(app).get('/api/shop/summary').set(auth(token));
    expect(res.body.stockUnits).toBe(13);
    expect(res.body.stockValue).toBe(58500);
  });

  test('a product must have a buying price', async () => {
    const token = await loginToken();
    const missing = await request(app)
      .post('/api/shop/products')
      .set(auth(token))
      .send({ name: 'Shaker', salePrice: 800, stock: 5 });
    const zero = await request(app)
      .post('/api/shop/products')
      .set(auth(token))
      .send({ name: 'Shaker', salePrice: 800, costPrice: 0, stock: 5 });
    expect(missing.status).toBe(400);
    expect(zero.status).toBe(400);
  });

  test('products without a buying price are counted', async () => {
    const token = await loginToken();
    const Product = require('../models/Product');
    const product = await addProduct(token);
    await Product.updateOne({ _id: product._id }, { costPrice: 0 });

    const res = await request(app).get('/api/shop/summary').set(auth(token));
    expect(res.body.noCostCount).toBe(1);
  });

  test('the insights do not count stock bought as a cost', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    await sell(token, product._id);
    await addExpense(token, 'Supplements', 50000);
    await addExpense(token, 'Rent', 10000);

    const res = await request(app)
      .get('/api/expenses/insights')
      .set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.earned).toBe(18000);
    expect(res.body.shopCost).toBe(14000);
    expect(res.body.spent).toBe(10000);
    expect(res.body.expenseCount).toBe(1);
    expect(res.body.stockBought).toBe(50000);
    expect(res.body.stockBoughtCount).toBe(1);
    expect(res.body.profit).toBe(-6000);
    expect(res.body.byCategory.map((c) => c.category)).toEqual(['Rent']);
  });
});

describe('payment method, slip and receipt', () => {
  const SLIP = 'data:image/jpeg;base64,AAAA';

  test('a sale is Cash when no method is sent', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await sell(token, product._id);
    expect(res.status).toBe(201);
    expect(res.body.method).toBe('Cash');
    expect(res.body.hasSlip).toBe(false);
  });

  test('a Bank sale saves the method and the payment slip', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await sell(token, product._id, {
      method: 'Bank',
      slipImage: SLIP,
    });
    expect(res.status).toBe(201);
    expect(res.body.method).toBe('Bank');
    expect(res.body.hasSlip).toBe(true);
    expect(res.body.slipImage).toBeUndefined();

    const slip = await request(app)
      .get('/api/shop/sales/' + res.body._id + '/slip')
      .set(auth(token));
    expect(slip.status).toBe(200);
    expect(slip.body.slip).toBe(SLIP);
  });

  test('the sales list never sends the slip picture', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    await sell(token, product._id, { method: 'JazzCash', slipImage: SLIP });

    const list = await request(app).get('/api/shop/sales').set(auth(token));
    expect(list.body).toHaveLength(1);
    expect(list.body[0].hasSlip).toBe(true);
    expect(list.body[0].slipImage).toBeUndefined();
  });

  test('a slip is optional for online payments', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await sell(token, product._id, { method: 'Easypaisa' });
    expect(res.status).toBe(201);
    expect(res.body.hasSlip).toBe(false);

    const slip = await request(app)
      .get('/api/shop/sales/' + res.body._id + '/slip')
      .set(auth(token));
    expect(slip.status).toBe(404);
  });

  test('a Cash sale does not keep a slip picture', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await sell(token, product._id, {
      method: 'Cash',
      slipImage: SLIP,
    });
    expect(res.status).toBe(201);
    expect(res.body.hasSlip).toBe(false);
  });

  test('refuses an unknown method and keeps the stock', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await sell(token, product._id, { method: 'Gold' });
    expect(res.status).toBe(400);
    expect(await stockOf(token, product._id)).toBe(10);
  });

  test('refuses a slip that is too big and keeps the stock', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await sell(token, product._id, {
      method: 'Bank',
      slipImage: 'data:image/jpeg;base64,' + 'A'.repeat(300001),
    });
    expect(res.status).toBe(400);
    expect(await stockOf(token, product._id)).toBe(10);
  });

  test('refuses a slip that is not a picture', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    const res = await sell(token, product._id, {
      method: 'Bank',
      slipImage: 'hello',
    });
    expect(res.status).toBe(400);
    expect(await stockOf(token, product._id)).toBe(10);
  });

  test('gym B cannot open the slip of gym A', async () => {
    const tokenA = await loginToken({ username: 'ownera', gymName: 'Gym A' });
    const tokenB = await loginToken({ username: 'ownerb', gymName: 'Gym B' });
    const product = await addProduct(tokenA);
    const sale = await sell(tokenA, product._id, {
      method: 'Bank',
      slipImage: SLIP,
    });

    const res = await request(app)
      .get('/api/shop/sales/' + sale.body._id + '/slip')
      .set(auth(tokenB));
    expect(res.status).toBe(404);
  });

  test('month=all lists the sales of every month', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    await sell(token, product._id);
    await sell(token, product._id);

    const res = await request(app)
      .get('/api/shop/sales?month=all')
      .set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('shop sales are not counted in the gym fees collected total', async () => {
    const token = await loginToken();
    const product = await addProduct(token);
    await sell(token, product._id);

    const res = await request(app)
      .get('/api/payments/summary')
      .set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });
});