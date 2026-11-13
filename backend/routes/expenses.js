const express = require('express');
const Expense = require('../models/Expense');
const Payment = require('../models/Payment');

const router = express.Router();

const CATEGORIES = [
  'Electricity',
  'Rent',
  'Staff salary',
  'Equipment repair',
  'New equipment',
  'Internet',
  'Cleaning',
  'Other',
];
const MAX_AMOUNT = 10000000;
const MAX_BILL_LENGTH = 700000;
const TREND_MONTHS = 6;

// Check the bill picture. It can be empty. Returns an error text, or '' if fine
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

// A date -> "2026-11" (server time, the same way the payment totals work)
function monthKey(date) {
  const d = new Date(date);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1);
}

// "2026-11" -> the first day of that month and the first day of the next month.
// Returns null if the text is not a month.
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

// "2026-11-30" -> that day at midnight. Returns null if it is not a real date.
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

function withoutBill(expense) {
  const json = expense.toObject();
  delete json.billImage;
  return json;
}

// Earned, spent and profit: this month, spending by category, and the last 6 months
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

    const [payments, expenses] = await Promise.all([
      Payment.find({ paidOn: { $gte: trendStart, $lt: range.end } })
        .select('amount paidOn')
        .lean(),
      Expense.find({ date: { $gte: trendStart, $lt: range.end } })
        .select('amount date category')
        .lean(),
    ]);

    // One row for each of the last 6 months, oldest first
    const trend = [];
    const rowOf = {};
    for (let i = TREND_MONTHS - 1; i >= 0; i--) {
      const d = new Date(range.year, range.month - 1 - i, 1);
      const row = { month: monthKey(d), earned: 0, spent: 0, profit: 0 };
      trend.push(row);
      rowOf[row.month] = row;
    }

    let paymentCount = 0;
    payments.forEach((p) => {
      const key = monthKey(p.paidOn);
      if (rowOf[key]) rowOf[key].earned += p.amount;
      if (key === range.key) paymentCount += 1;
    });

    const categories = {};
    let expenseCount = 0;
    expenses.forEach((e) => {
      const key = monthKey(e.date);
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
      row.profit = row.earned - row.spent;
    });

    const selected = rowOf[range.key];
    const byCategory = Object.values(categories).sort(
      (a, b) => b.total - a.total
    );

    res.json({
      month: range.key,
      earned: selected.earned,
      spent: selected.spent,
      profit: selected.profit,
      paymentCount: paymentCount,
      expenseCount: expenseCount,
      byCategory: byCategory,
      trend: trend,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Show the expenses of one month (newest first). Use ?month=2026-11
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const range = monthRange(req.query.month || now.getFullYear() + '-' + pad(now.getMonth() + 1));
    if (!range) {
      return res.status(400).json({ error: 'Month must look like 2026-11' });
    }

    const expenses = await Expense.find({
      date: { $gte: range.start, $lt: range.end },
    })
      .select('-billImage')
      .sort({ date: -1, _id: -1 });

    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get the bill picture of one expense
router.get('/:id/bill', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id).select('billImage');
    if (!expense || !expense.billImage) {
      return res.status(404).json({ error: 'No bill picture saved for this expense' });
    }
    res.json({ bill: expense.billImage });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add an expense
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

// Edit an expense (only the fields that are sent).
// billImage: leave it out to keep the picture, send '' to remove it, or send a new one.
router.put('/:id', async (req, res) => {
  try {
    const body = req.body || {};

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
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

// Delete an expense
router.delete('/:id', async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;