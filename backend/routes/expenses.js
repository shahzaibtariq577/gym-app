const express = require('express');
const Expense = require('../models/Expense');
const Payment = require('../models/Payment');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');

const router = express.Router();

const CATEGORIES = [
  'Electricity',
  'Rent',
  'Staff salary',
  'Equipment repair',
  'New equipment',
  'Internet',
  'Cleaning',
  'Supplements',
  'Other',
];
const MAX_AMOUNT = 10000000;
const MAX_BILL_LENGTH = 700000;
const TREND_MONTHS = 6;

function checkBill(bill) {
  if (!bill) return '';
  if (typeof bill !== 'string') return 'Bill picture is not valid';
  if (!bill.startsWith('data:image/')) return 'Bill must be a picture';
  if (bill.length > MAX_BILL_LENGTH) return 'Bill picture is too big';
  return '';
}

function pad(number) {
  return String(number).padStart(2, '0');
}

function monthKey(date) {
  const d = new Date(date);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1);
}

function monthRange(text) {
  const match = /^(\d{4})-(\d{2})$/.exec(text || '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return {
    year: year,
    month: month,
    key: year + '-' + pad(month),
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  };
}

function parseDay(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || ''));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

const LOCKED_MESSAGE = 'Remove it from Shop > Purchase history';

async function isLocked(expense, gymId) {
  if (!expense.purchaseId) return false;
  const found = await Purchase.exists({ _id: expense.purchaseId, gymId: gymId });
  return !!found;
}

function withoutBill(expense) {
  const json = expense.toObject();
  delete json.billImage;
  return json;
}

router.get('/insights', async (req, res) => {
  try {
    const now = new Date();
    const range = monthRange(req.query.month || now.getFullYear() + '-' + pad(now.getMonth() + 1));
    if (!range) {
      return res.status(400).json({ error: 'Month must look like 2026-11' });
    }

    const trendStart = new Date(
      range.year,
      range.month - 1 - (TREND_MONTHS - 1),
      1
    );

    const [payments, expenses, sales] = await Promise.all([
      Payment.find({
        gymId: req.gymId,
        paidOn: { $gte: trendStart, $lt: range.end },
      })
        .select('amount paidOn')
        .lean(),
      Expense.find({
        gymId: req.gymId,
        date: { $gte: trendStart, $lt: range.end },
      })
        .select('amount date category')
        .lean(),
      Sale.find({
        gymId: req.gymId,
        soldOn: { $gte: trendStart, $lt: range.end },
      })
        .select('total soldOn quantity costPrice')
        .lean(),
    ]);

    const trend = [];
    const rowOf = {};
    for (let i = TREND_MONTHS - 1; i >= 0; i--) {
      const d = new Date(range.year, range.month - 1 - i, 1);
      const row = {
        month: monthKey(d),
        earned: 0,
        feesEarned: 0,
        shopEarned: 0,
        shopCost: 0,
        spent: 0,
        stockBought: 0,
        profit: 0,
      };
      trend.push(row);
      rowOf[row.month] = row;
    }

    let paymentCount = 0;
    payments.forEach((p) => {
      const key = monthKey(p.paidOn);
      if (rowOf[key]) {
        rowOf[key].earned += p.amount;
        rowOf[key].feesEarned += p.amount;
      }
      if (key === range.key) paymentCount += 1;
    });

    let shopSaleCount = 0;
    sales.forEach((s) => {
      const key = monthKey(s.soldOn);
      if (rowOf[key]) {
        rowOf[key].earned += s.total;
        rowOf[key].shopEarned += s.total;
        rowOf[key].shopCost += (s.costPrice || 0) * s.quantity;
      }
      if (key === range.key) shopSaleCount += 1;
    });

    const categories = {};
    let expenseCount = 0;
    let stockBoughtCount = 0;
    expenses.forEach((e) => {
      const key = monthKey(e.date);
      if (e.category === 'Supplements') {
        if (rowOf[key]) rowOf[key].stockBought += e.amount;
        if (key === range.key) stockBoughtCount += 1;
        return;
      }
      if (rowOf[key]) rowOf[key].spent += e.amount;
      if (key === range.key) {
        expenseCount += 1;
        if (!categories[e.category]) {
          categories[e.category] = { category: e.category, total: 0, count: 0 };
        }
        categories[e.category].total += e.amount;
        categories[e.category].count += 1;
      }
    });

    trend.forEach((row) => {
      row.profit = row.earned - row.shopCost - row.spent;
    });

    const selected = rowOf[range.key];
    const byCategory = Object.values(categories).sort(
      (a, b) => b.total - a.total
    );

    res.json({
      month: range.key,
      earned: selected.earned,
      feesEarned: selected.feesEarned,
      shopEarned: selected.shopEarned,
      shopCost: selected.shopCost,
      stockBought: selected.stockBought,
      stockBoughtCount: stockBoughtCount,
      spent: selected.spent,
      profit: selected.profit,
      paymentCount: paymentCount,
      shopSaleCount: shopSaleCount,
      expenseCount: expenseCount,
      byCategory: byCategory,
      trend: trend,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const range = monthRange(req.query.month || now.getFullYear() + '-' + pad(now.getMonth() + 1));
    if (!range) {
      return res.status(400).json({ error: 'Month must look like 2026-11' });
    }

    const expenses = await Expense.find({
      gymId: req.gymId,
      date: { $gte: range.start, $lt: range.end },
    })
      .select('-billImage')
      .sort({ date: -1, _id: -1 });

    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/bill', async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      gymId: req.gymId,
    }).select('billImage');
    if (!expense || !expense.billImage) {
      return res.status(404).json({ error: 'No bill picture saved for this expense' });
    }
    res.json({ bill: expense.billImage });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};

    const date = parseDay(body.date);
    if (!date) return res.status(400).json({ error: 'Date is not valid' });

    if (!CATEGORIES.includes(body.category)) {
      return res.status(400).json({ error: 'Please choose a category' });
    }

    const amount = Number(body.amount);
    if (!(amount > 0) || amount > MAX_AMOUNT) {
      return res.status(400).json({
        error: 'Amount must be more than 0 and not more than ' + MAX_AMOUNT,
      });
    }

    const note = String(body.note || '').trim();
    if (note.length > 200) {
      return res.status(400).json({ error: 'Note is too long (max 200 letters)' });
    }

    const bill = body.billImage || '';
    const billProblem = checkBill(bill);
    if (billProblem) return res.status(400).json({ error: billProblem });

    const expense = await Expense.create({
      gymId: req.gymId,
      date: date,
      category: body.category,
      amount: amount,
      note: note,
      billImage: bill,
      hasBill: bill !== '',
    });

    res.status(201).json(withoutBill(expense));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const body = req.body || {};

    const expense = await Expense.findOne({
      _id: req.params.id,
      gymId: req.gymId,
    });
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (await isLocked(expense, req.gymId)) {
      return res.status(400).json({ error: LOCKED_MESSAGE });
    }

    if (body.date !== undefined) {
      const date = parseDay(body.date);
      if (!date) return res.status(400).json({ error: 'Date is not valid' });
      expense.date = date;
    }

    if (body.category !== undefined) {
      if (!CATEGORIES.includes(body.category)) {
        return res.status(400).json({ error: 'Please choose a category' });
      }
      expense.category = body.category;
    }

    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (!(amount > 0) || amount > MAX_AMOUNT) {
        return res.status(400).json({
          error: 'Amount must be more than 0 and not more than ' + MAX_AMOUNT,
        });
      }
      expense.amount = amount;
    }

    if (body.note !== undefined) {
      const note = String(body.note).trim();
      if (note.length > 200) {
        return res.status(400).json({ error: 'Note is too long (max 200 letters)' });
      }
      expense.note = note;
    }

    if (body.billImage !== undefined) {
      const bill = body.billImage || '';
      const billProblem = checkBill(bill);
      if (billProblem) return res.status(400).json({ error: billProblem });
      expense.billImage = bill;
      expense.hasBill = bill !== '';
    }

    await expense.save();
    res.json(withoutBill(expense));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const found = await Expense.findOne({
      _id: req.params.id,
      gymId: req.gymId,
    });
    if (!found) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    if (await isLocked(found, req.gymId)) {
      return res.status(400).json({ error: LOCKED_MESSAGE });
    }
    await Expense.deleteOne({ _id: found._id, gymId: req.gymId });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;