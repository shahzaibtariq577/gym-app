const express = require('express');
const Payment = require('../models/Payment');

const router = express.Router();

// Show payments (newest first). Use ?memberId=... for one member
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.memberId) filter.memberId = req.query.memberId;

    const payments = await Payment.find(filter).sort({ paidOn: -1 });
    res.json(payments);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Total collected this month
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const payments = await Payment.find({
      paidOn: { $gte: start, $lt: end },
    });

    const total = payments.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      month: start.toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      }),
      total: total,
      count: payments.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;