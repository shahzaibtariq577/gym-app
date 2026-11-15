const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const Purchase = require('../models/Purchase');

const router = express.Router();

const MAX_PRICE = 10000000;
const MAX_STOCK = 1000000;
const MAX_QUANTITY = 10000;
const MAX_PHOTO_LENGTH = 100000;
const LOW_STOCK = 5;
const METHODS = ['Cash', 'JazzCash', 'Easypaisa', 'Bank'];
const MAX_SLIP_LENGTH = 300000;
const MAX_BILL_LENGTH = 300000;
const MAX_EXPENSE = 10000000;

function checkPhoto(photo) {
  if (!photo) return '';
  if (typeof photo !== 'string') return 'Photo is not valid';
  if (!photo.startsWith('data:image/')) return 'Photo must be a picture';
  if (photo.length > MAX_PHOTO_LENGTH) return 'Photo is too big';
  return '';
}

function checkSlip(slip) {
  if (!slip) return '';
  if (typeof slip !== 'string') return 'Payment slip is not valid';
  if (!slip.startsWith('data:image/')) return 'Payment slip must be a picture';
  if (slip.length > MAX_SLIP_LENGTH) return 'Payment slip picture is too big';
  return '';
}

function checkBill(bill) {
  if (!bill) return '';
  if (typeof bill !== 'string') return 'Bill picture is not valid';
  if (!bill.startsWith('data:image/')) return 'Bill must be a picture';
  if (bill.length > MAX_BILL_LENGTH) return 'Bill picture is too big';
  return '';
}

function paidOf(sale) {
  return typeof sale.amountPaid === 'number' ? sale.amountPaid : sale.total;
}

function shapeSale(sale) {
  const json = typeof sale.toObject === 'function' ? sale.toObject() : { ...sale };
  delete json.slipImage;
  const payments = (json.payments || []).map((p) => {
    const copy = { ...p };
    delete copy.slipImage;
    return copy;
  });
  const paid = round2(paidOf(json));
  const later = round2(payments.reduce((sum, p) => sum + p.amount, 0));
  const balance = round2(json.total - paid);
  json.payments = payments;
  json.amountPaid = paid;
  json.paidAtSale = round2(paid - later);
  json.balance = balance > 0 ? balance : 0;
  json.status = balance <= 0 ? 'Paid' : paid > 0 ? 'Part paid' : 'Unpaid';
  return json;
}

function withoutBill(purchase) {
  const json = purchase.toObject();
  delete json.billImage;
  return json;
}

function round2(number) {
  return Math.round(number * 100) / 100;
}

function pad(number) {
  return String(number).padStart(2, '0');
}

function monthRange(text) {
  const match = /^(\d{4})-(\d{2})$/.exec(text || '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return {
    key: year + '-' + pad(month),
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  };
}

function currentMonthText() {
  const now = new Date();
  return now.getFullYear() + '-' + pad(now.getMonth() + 1);
}

function readProduct(body, isNew) {
  const values = {};

  if (isNew || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name) return { error: 'Product name is required' };
    if (name.length > 60) {
      return { error: 'Product name is too long (max 60 letters)' };
    }
    values.name = name;
  }

  if (isNew || body.salePrice !== undefined) {
    const salePrice = Number(body.salePrice);
    if (!(salePrice > 0) || salePrice > MAX_PRICE) {
      return {
        error: 'Sale price must be more than 0 and not more than ' + MAX_PRICE,
      };
    }
    values.salePrice = salePrice;
  }

  if (isNew || body.costPrice !== undefined) {
    const costPrice = Number(body.costPrice);
    if (!(costPrice > 0) || costPrice > MAX_PRICE) {
      return {
        error: 'Buying price must be more than 0 and not more than ' + MAX_PRICE,
      };
    }
    values.costPrice = costPrice;
  }

  if (isNew || body.stock !== undefined) {
    const stock =
      body.stock === undefined || body.stock === '' ? 0 : Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) {
      return {
        error: 'Stock must be a whole number from 0 to ' + MAX_STOCK,
      };
    }
    values.stock = stock;
  }

  if (body.photo !== undefined) {
    const photoProblem = checkPhoto(body.photo);
    if (photoProblem) return { error: photoProblem };
    values.photo = body.photo || '';
  }

  return { values: values };
}

function sendError(res, err) {
  if (err && err.code === 11000) {
    return res
      .status(400)
      .json({ error: 'A product with this name already exists' });
  }
  return res.status(400).json({ error: err.message });
}

router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({ gymId: req.gymId }).sort({
      name: 1,
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const result = readProduct(req.body || {}, true);
    if (result.error) return res.status(400).json({ error: result.error });

    const product = await Product.create({
      gymId: req.gymId,
      ...result.values,
    });
    res.status(201).json(product);
  } catch (err) {
    sendError(res, err);
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const result = readProduct(req.body || {}, false);
    if (result.error) return res.status(400).json({ error: result.error });

    const product = await Product.findOne({
      _id: req.params.id,
      gymId: req.gymId,
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    product.set(result.values);
    await product.save();
    res.json(product);
  } catch (err) {
    sendError(res, err);
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const deleted = await Product.findOneAndDelete({
      _id: req.params.id,
      gymId: req.gymId,
    });
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/sales', async (req, res) => {
  try {
    const body = req.body || {};

    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return res.status(400).json({
        error: 'Quantity must be a whole number from 1 to ' + MAX_QUANTITY,
      });
    }

    let unitPrice = null;
    if (body.unitPrice !== undefined && body.unitPrice !== '') {
      unitPrice = Number(body.unitPrice);
      if (!(unitPrice > 0) || unitPrice > MAX_PRICE) {
        return res.status(400).json({
          error: 'Price must be more than 0 and not more than ' + MAX_PRICE,
        });
      }
    }

    const buyer = String(body.buyer || '').trim();
    if (buyer.length > 60) {
      return res.status(400).json({ error: 'Buyer name is too long (max 60 letters)' });
    }
    const note = String(body.note || '').trim();
    if (note.length > 200) {
      return res.status(400).json({ error: 'Note is too long (max 200 letters)' });
    }

    let method =
      body.method === undefined || body.method === '' ? 'Cash' : body.method;
    if (!METHODS.includes(method)) {
      return res
        .status(400)
        .json({ error: 'Please choose how the customer paid' });
    }

    let slip = '';
    if (method !== 'Cash') {
      const slipProblem = checkSlip(body.slipImage);
      if (slipProblem) return res.status(400).json({ error: slipProblem });
      slip = body.slipImage || '';
    }

    const before = await Product.findOne({
      _id: body.productId,
      gymId: req.gymId,
    }).select('salePrice');
    if (!before) return res.status(404).json({ error: 'Product not found' });

    const expectedTotal = round2(
      (unitPrice === null ? before.salePrice : unitPrice) * quantity
    );

    let paidGiven = null;
    if (
      body.amountPaid !== undefined &&
      body.amountPaid !== null &&
      body.amountPaid !== ''
    ) {
      paidGiven = round2(Number(body.amountPaid));
      if (!(paidGiven >= 0) || paidGiven > expectedTotal) {
        return res.status(400).json({
          error: 'Amount paid must be from 0 to the total (' + expectedTotal + ')',
        });
      }
      if (paidGiven < expectedTotal && !buyer) {
        return res.status(400).json({
          error: 'Buyer name is required when the customer pays less than the total',
        });
      }
    }

    const product = await Product.findOneAndUpdate(
      { _id: body.productId, gymId: req.gymId, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { returnDocument: 'after' }
    );

    if (!product) {
      const exists = await Product.findOne({
        _id: body.productId,
        gymId: req.gymId,
      }).select('name stock');
      if (!exists) return res.status(404).json({ error: 'Product not found' });
      return res.status(400).json({
        error: 'Only ' + exists.stock + ' of ' + exists.name + ' in stock',
      });
    }

    const price = unitPrice === null ? product.salePrice : unitPrice;
    const total = round2(price * quantity);
    const paid = paidGiven === null ? total : Math.min(paidGiven, total);
    if (paid <= 0) {
      method = 'Cash';
      slip = '';
    }

    try {
      const sale = await Sale.create({
        gymId: req.gymId,
        productId: product._id,
        productName: product.name,
        quantity: quantity,
        unitPrice: price,
        costPrice: product.costPrice,
        total: total,
        profit: round2((price - product.costPrice) * quantity),
        soldOn: new Date(),
        amountPaid: paid,
        payments: [],
        method: method,
        slipImage: slip,
        hasSlip: slip !== '',
        buyer: buyer,
        note: note,
      });
      res.status(201).json(shapeSale(sale));
    } catch (err) {
      await Product.updateOne(
        { _id: product._id, gymId: req.gymId },
        { $inc: { stock: quantity } }
      );
      throw err;
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/sales', async (req, res) => {
  try {
    const filter = { gymId: req.gymId };

    if (req.query.month !== 'all') {
      const range = monthRange(req.query.month || currentMonthText());
      if (!range) {
        return res.status(400).json({ error: 'Month must look like 2026-11' });
      }
      filter.soldOn = { $gte: range.start, $lt: range.end };
    }

    const sales = await Sale.find(filter)
      .select('-slipImage -payments.slipImage')
      .sort({ soldOn: -1, _id: -1 })
      .lean();

    res.json(sales.map(shapeSale));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sales/:id/slip', async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      gymId: req.gymId,
    }).select('slipImage');
    if (!sale || !sale.slipImage) {
      return res.status(404).json({ error: 'No payment slip saved for this sale' });
    }
    res.json({ slip: sale.slipImage });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/sales/:id/payments/:paymentId/slip', async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      gymId: req.gymId,
    }).select('payments');
    const payment = sale ? sale.payments.id(req.params.paymentId) : null;
    if (!payment || !payment.slipImage) {
      return res.status(404).json({ error: 'No payment slip saved for this payment' });
    }
    res.json({ slip: payment.slipImage });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/sales/:id/pay', async (req, res) => {
  try {
    const body = req.body || {};

    const sale = await Sale.findOne({
      _id: req.params.id,
      gymId: req.gymId,
    }).select('-slipImage -payments.slipImage');
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const current = paidOf(sale);
    const balance = round2(sale.total - current);
    if (balance <= 0) {
      return res.status(400).json({ error: 'This sale is already fully paid' });
    }

    const amount = round2(Number(body.amount));
    if (!(amount > 0) || amount > balance) {
      return res.status(400).json({
        error: 'Amount must be more than 0 and not more than ' + balance,
      });
    }

    const method =
      body.method === undefined || body.method === '' ? 'Cash' : body.method;
    if (!METHODS.includes(method)) {
      return res
        .status(400)
        .json({ error: 'Please choose how the customer paid' });
    }

    let slip = '';
    if (method !== 'Cash') {
      const slipProblem = checkSlip(body.slipImage);
      if (slipProblem) return res.status(400).json({ error: slipProblem });
      slip = body.slipImage || '';
    }

    const updated = await Sale.findOneAndUpdate(
      { _id: sale._id, gymId: req.gymId, amountPaid: sale.amountPaid },
      {
        $set: { amountPaid: round2(current + amount) },
        $push: {
          payments: {
            amount: amount,
            method: method,
            slipImage: slip,
            hasSlip: slip !== '',
            paidOn: new Date(),
          },
        },
      },
      { returnDocument: 'after' }
    ).select('-slipImage -payments.slipImage');

    if (!updated) {
      return res
        .status(409)
        .json({ error: 'This sale changed while saving. Please try again.' });
    }
    res.json(shapeSale(updated));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/sales/:id', async (req, res) => {
  try {
    const sale = await Sale.findOneAndDelete({
      _id: req.params.id,
      gymId: req.gymId,
    });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    await Product.updateOne(
      { _id: sale.productId, gymId: req.gymId },
      { $inc: { stock: sale.quantity } }
    );
    res.json({ message: 'Sale removed and stock added back' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/purchases', async (req, res) => {
  try {
    const body = req.body || {};

    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_STOCK) {
      return res.status(400).json({
        error: 'Quantity must be a whole number from 1 to ' + MAX_STOCK,
      });
    }

    const unitCost = Number(body.unitCost);
    if (!(unitCost > 0) || unitCost > MAX_PRICE) {
      return res.status(400).json({
        error: 'Buying price must be more than 0 and not more than ' + MAX_PRICE,
      });
    }

    const total = round2(quantity * unitCost);
    if (total > MAX_EXPENSE) {
      return res.status(400).json({
        error: 'Total must not be more than ' + MAX_EXPENSE,
      });
    }

    const supplier = String(body.supplier || '').trim();
    if (supplier.length > 60) {
      return res.status(400).json({ error: 'Supplier name is too long (max 60 letters)' });
    }
    const note = String(body.note || '').trim();
    if (note.length > 200) {
      return res.status(400).json({ error: 'Note is too long (max 200 letters)' });
    }

    const bill = body.billImage || '';
    const billProblem = checkBill(bill);
    if (billProblem) return res.status(400).json({ error: billProblem });

    const product = await Product.findOne({
      _id: body.productId,
      gymId: req.gymId,
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const oldStock = product.stock;
    const oldCost = product.costPrice || 0;
    const newStock = oldStock + quantity;
    if (newStock > MAX_STOCK) {
      return res.status(400).json({
        error: 'Stock cannot be more than ' + MAX_STOCK,
      });
    }

    const newCost =
      oldStock > 0 && oldCost > 0
        ? round2((oldStock * oldCost + quantity * unitCost) / newStock)
        : unitCost;

    const updated = await Product.findOneAndUpdate(
      {
        _id: product._id,
        gymId: req.gymId,
        stock: oldStock,
        costPrice: product.costPrice,
      },
      { $inc: { stock: quantity }, $set: { costPrice: newCost } },
      { returnDocument: 'after' }
    );
    if (!updated) {
      return res
        .status(409)
        .json({ error: 'The stock changed while saving. Please try again.' });
    }

    const purchaseId = new mongoose.Types.ObjectId();
    const boughtOn = new Date();
    let expense = null;

    try {
      const expenseNote = (
        'Stock: ' + quantity + ' x ' + product.name + (supplier ? ' from ' + supplier : '')
      ).slice(0, 200);

      expense = await Expense.create({
        gymId: req.gymId,
        date: boughtOn,
        category: 'Supplements',
        amount: total,
        note: expenseNote,
        billImage: bill,
        hasBill: bill !== '',
        purchaseId: purchaseId,
      });

      const purchase = await Purchase.create({
        _id: purchaseId,
        gymId: req.gymId,
        productId: product._id,
        productName: product.name,
        quantity: quantity,
        unitCost: unitCost,
        total: total,
        supplier: supplier,
        note: note,
        billImage: bill,
        hasBill: bill !== '',
        boughtOn: boughtOn,
        expenseId: expense._id,
        previousCostPrice: oldCost,
      });

      res.status(201).json({
        ...withoutBill(purchase),
        newStock: updated.stock,
        newCostPrice: updated.costPrice,
      });
    } catch (err) {
      if (expense) {
        await Expense.deleteOne({ _id: expense._id, gymId: req.gymId });
      }
      await Product.updateOne(
        { _id: product._id, gymId: req.gymId },
        { $inc: { stock: -quantity }, $set: { costPrice: oldCost } }
      );
      throw err;
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/purchases', async (req, res) => {
  try {
    const filter = { gymId: req.gymId };

    if (req.query.month !== 'all') {
      const range = monthRange(req.query.month || currentMonthText());
      if (!range) {
        return res.status(400).json({ error: 'Month must look like 2026-11' });
      }
      filter.boughtOn = { $gte: range.start, $lt: range.end };
    }

    const purchases = await Purchase.find(filter)
      .select('-billImage')
      .sort({ boughtOn: -1, _id: -1 });

    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/purchases/:id/bill', async (req, res) => {
  try {
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      gymId: req.gymId,
    }).select('billImage');
    if (!purchase || !purchase.billImage) {
      return res.status(404).json({ error: 'No bill picture saved for this purchase' });
    }
    res.json({ bill: purchase.billImage });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/purchases/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      gymId: req.gymId,
    }).select('-billImage');
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

    const newer = await Purchase.exists({
      gymId: req.gymId,
      productId: purchase.productId,
      _id: { $gt: purchase._id },
    });
    if (newer) {
      return res.status(400).json({
        error: 'Remove the newer purchase of this product first',
      });
    }

    const productExists = await Product.exists({
      _id: purchase.productId,
      gymId: req.gymId,
    });

    if (productExists) {
      const restored = await Product.findOneAndUpdate(
        {
          _id: purchase.productId,
          gymId: req.gymId,
          stock: { $gte: purchase.quantity },
        },
        {
          $inc: { stock: -purchase.quantity },
          $set: { costPrice: purchase.previousCostPrice },
        },
        { returnDocument: 'after' }
      );
      if (!restored) {
        return res.status(400).json({
          error: 'Some of this stock is already sold, so this purchase cannot be removed',
        });
      }
    }

    try {
      await Purchase.deleteOne({ _id: purchase._id, gymId: req.gymId });
    } catch (err) {
      if (productExists) {
        await Product.updateOne(
          { _id: purchase.productId, gymId: req.gymId },
          { $inc: { stock: purchase.quantity } }
        );
      }
      throw err;
    }

    await Expense.deleteOne({ _id: purchase.expenseId, gymId: req.gymId });

    res.json({ message: 'Purchase removed, stock and expense taken back' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const range = monthRange(req.query.month || currentMonthText());
    if (!range) {
      return res.status(400).json({ error: 'Month must look like 2026-11' });
    }

    const [sales, stockProducts, supplementExpenses, owedSales] = await Promise.all([
      Sale.find({
        gymId: req.gymId,
        soldOn: { $gte: range.start, $lt: range.end },
      })
        .select('productName quantity total profit')
        .lean(),
      Product.find({ gymId: req.gymId }).select('stock costPrice').lean(),
      Expense.find({
        gymId: req.gymId,
        category: 'Supplements',
        date: { $gte: range.start, $lt: range.end },
      })
        .select('amount')
        .lean(),
      Sale.find({
        gymId: req.gymId,
        amountPaid: { $type: 'number' },
        $expr: { $lt: ['$amountPaid', '$total'] },
      })
        .select('total amountPaid')
        .lean(),
    ]);

    const owed = owedSales.reduce((sum, s) => sum + (s.total - s.amountPaid), 0);

    let total = 0;
    let profit = 0;
    let itemsSold = 0;
    const products = {};

    sales.forEach((s) => {
      total += s.total;
      profit += s.profit;
      itemsSold += s.quantity;
      if (!products[s.productName]) {
        products[s.productName] = {
          name: s.productName,
          quantity: 0,
          total: 0,
          profit: 0,
        };
      }
      products[s.productName].quantity += s.quantity;
      products[s.productName].total += s.total;
      products[s.productName].profit += s.profit;
    });

    const byProduct = Object.values(products).sort(
      (a, b) => b.quantity - a.quantity
    );

    const spent = supplementExpenses.reduce((sum, e) => sum + e.amount, 0);
    const lowStock = stockProducts.filter((p) => p.stock <= LOW_STOCK).length;
    const stockUnits = stockProducts.reduce((sum, p) => sum + p.stock, 0);
    const stockValue = stockProducts.reduce(
      (sum, p) => sum + p.stock * (p.costPrice || 0),
      0
    );
    const noCostCount = stockProducts.filter((p) => !(p.costPrice > 0)).length;

    res.json({
      month: range.key,
      total: round2(total),
      profit: round2(profit),
      spent: round2(spent),
      spentCount: supplementExpenses.length,
      owed: round2(owed),
      owedCount: owedSales.length,
      cost: round2(total - profit),
      stockValue: round2(stockValue),
      stockUnits: stockUnits,
      noCostCount: noCostCount,
      itemsSold: itemsSold,
      saleCount: sales.length,
      lowStock: lowStock,
      lowStockLimit: LOW_STOCK,
      byProduct: byProduct,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;