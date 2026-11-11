const express = require('express');
const Payment = require('../models/Payment');
const Member = require('../models/Member');

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

// Undo a payment. Only the newest payment of a member can be undone.
// The member's due date goes back to the date before that payment.
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const member = await Member.findById(payment.memberId);

    // If the member still exists, check this is the newest payment
    // and put the old due date back
    if (member) {
      const newest = await Payment.findOne({ memberId: payment.memberId })
        .sort({ paidOn: -1, _id: -1 });

      if (String(newest._id) !== String(payment._id)) {
        return res.status(400).json({
          error: 'Only the newest payment of this member can be undone',
        });
      }

      if (payment.oldDueDate) {
        member.nextDueDate = payment.oldDueDate;
        await member.save();
      }
    }

    await Payment.findByIdAndDelete(payment._id);

    res.json({ message: 'Payment undone' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;