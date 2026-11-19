const express = require('express');
const Payment = require('../models/Payment');
const Sale = require('../models/Sale');
const Setting = require('../models/Setting');

const router = express.Router();

const TOKEN = /^[a-f0-9]{32}$/;

function round2(number) {
  return Math.round(number * 100) / 100;
}

async function gymInfo(gymId) {
  const setting = await Setting.findOne({ gymId: gymId })
    .select('gymName gymPhone gymAddress')
    .lean();
  return {
    gymName: (setting && setting.gymName) || 'Gym',
    gymPhone: (setting && setting.gymPhone) || '',
    gymAddress: (setting && setting.gymAddress) || '',
  };
}

router.get('/:token', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex');

    const token = String(req.params.token || '');
    if (!TOKEN.test(token)) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const payment = await Payment.findOne({ shareToken: token })
      .select('-slipImage')
      .lean();
    if (payment) {
      const gym = await gymInfo(payment.gymId);
      return res.json({
        type: 'gym',
        ...gym,
        payment: {
          _id: payment._id,
          memberName: payment.memberName,
          packageName: payment.packageName,
          amount: payment.amount,
          method: payment.method,
          feeAtPayment: payment.feeAtPayment,
          balanceBefore: payment.balanceBefore,
          balanceAfter: payment.balanceAfter,
          hasSlip: false,
          paidOn: payment.paidOn,
          oldDueDate: payment.oldDueDate,
          newDueDate: payment.newDueDate,
        },
      });
    }

    const sale = await Sale.findOne({ shareToken: token })
      .select('-slipImage -payments.slipImage')
      .lean();
    if (sale) {
      const gym = await gymInfo(sale.gymId);
      const payments = (sale.payments || []).map((p) => ({
        _id: p._id,
        amount: p.amount,
        method: p.method,
        paidOn: p.paidOn,
        hasSlip: false,
      }));
      const paid = round2(
        typeof sale.amountPaid === 'number' ? sale.amountPaid : sale.total
      );
      const later = round2(payments.reduce((sum, p) => sum + p.amount, 0));
      return res.json({
        type: 'shop',
        ...gym,
        sale: {
          _id: sale._id,
          soldOn: sale.soldOn,
          buyer: sale.buyer,
          productName: sale.productName,
          quantity: sale.quantity,
          unitPrice: sale.unitPrice,
          total: sale.total,
          amountPaid: paid,
          paidAtSale: round2(paid - later),
          method: sale.method,
          note: sale.note,
          hasSlip: false,
          payments: payments,
        },
      });
    }

    res.status(404).json({ error: 'Receipt not found' });
  } catch (err) {
    res.status(500).json({ error: 'Could not load the receipt' });
  }
});

module.exports = router;