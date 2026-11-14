const express = require('express');
const Member = require('../models/Member');
const Package = require('../models/Package');
const Payment = require('../models/Payment');

const router = express.Router();

const MAX_PHOTO_LENGTH = 100000;

const PAYMENT_METHODS = ['Cash', 'JazzCash', 'Easypaisa', 'Bank'];
const MAX_PAYMENT = 1000000;

const MAX_SLIP_LENGTH = 300000;

function checkNameAndPhone(name, phone) {
  const cleanName = String(name || '').trim();
  const digits = String(phone || '').replace(/\D/g, '');

  if (!cleanName) return 'Name is required';
  if (cleanName.length > 60) return 'Name is too long (max 60 letters)';
  if (digits.length < 10 || digits.length > 15) {
    return 'Phone must have 10 to 15 digits';
  }
  return '';
}

function checkPhoto(photo) {
  if (!photo) return '';
  if (typeof photo !== 'string') return 'Photo is not valid';
  if (!photo.startsWith('data:image/')) return 'Photo must be a picture';
  if (photo.length > MAX_PHOTO_LENGTH) return 'Photo is too big';
  return '';
}

function checkSlip(slip) {
  if (!slip) return '';
  if (typeof slip !== 'string') return 'Slip is not valid';
  if (!slip.startsWith('data:image/')) return 'Slip must be a picture';
  if (slip.length > MAX_SLIP_LENGTH) return 'Slip picture is too big';
  return '';
}

async function saveMemberWithPayment(member, paymentData) {
  const payment = await Payment.create(paymentData);
  try {
    await member.save();
  } catch (err) {
    await Payment.findByIdAndDelete(payment._id);
    throw err;
  }
  return payment;
}

router.get('/', async (req, res) => {
  try {
    const members = await Member.find().sort({ nextDueDate: 1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, photo, packageId } = req.body;

    const problem = checkNameAndPhone(name, phone);
    if (problem) {
      return res.status(400).json({ error: problem });
    }

    const photoProblem = checkPhoto(photo);
    if (photoProblem) {
      return res.status(400).json({ error: photoProblem });
    }

    const pkg = await Package.findById(packageId);
    if (!pkg) {
      return res.status(400).json({ error: 'Package not found' });
    }

    const joinDate = new Date();
    const nextDueDate = new Date(joinDate);
    nextDueDate.setDate(nextDueDate.getDate() + pkg.durationDays);

    const member = await Member.create({
      name: String(name).trim(),
      phone: String(phone).trim(),
      photo: photo || '',
      packageName: pkg.name,
      fee: pkg.fee,
      joinDate,
      nextDueDate,
    });

    res.status(201).json(member);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, phone, photo, packageId, nextDueDate, startToday } = req.body;

    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const problem = checkNameAndPhone(
      name || member.name,
      phone || member.phone
    );
    if (problem) {
      return res.status(400).json({ error: problem });
    }

    if (photo !== undefined) {
      const photoProblem = checkPhoto(photo);
      if (photoProblem) {
        return res.status(400).json({ error: photoProblem });
      }
      member.photo = photo || '';
    }

    let newPayment = null;

    if (packageId) {
      const pkg = await Package.findById(packageId);
      if (!pkg) {
        return res.status(400).json({ error: 'Package not found' });
      }
      if (pkg.name !== member.packageName) {
        if (startToday === true && member.balance > 0) {
          return res.status(400).json({
            error:
              'Collect the remaining Rs ' + member.balance + ' first, then start the new package',
          });
        }

        member.packageName = pkg.name;
        member.fee = pkg.fee;

        if (startToday === true) {
          const today = new Date();
          const oldDueDate = member.nextDueDate;
          const newDueDate = new Date(today);
          newDueDate.setDate(newDueDate.getDate() + pkg.durationDays);

          member.nextDueDate = newDueDate;
          newPayment = {
            memberId: member._id,
            memberName: member.name,
            packageName: pkg.name,
            amount: pkg.fee,
            feeAtPayment: pkg.fee,
            balanceBefore: 0,
            balanceAfter: 0,
            paidOn: today,
            oldDueDate: oldDueDate,
            newDueDate: newDueDate,
          };
        }
      }
    }

    if (nextDueDate && !newPayment) {
      const newDate = new Date(nextDueDate);
      if (isNaN(newDate.getTime())) {
        return res.status(400).json({ error: 'Due date is not valid' });
      }
      member.nextDueDate = newDate;
    }

    if (name) member.name = String(name).trim();
    if (phone) member.phone = String(phone).trim();

    if (newPayment) {
      newPayment.memberName = member.name;
      await saveMemberWithPayment(member, newPayment);
    } else {
      await member.save();
    }

    res.json(member);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Member.findByIdAndDelete(req.params.id);
    res.json({ message: 'Member deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id/pay', async (req, res) => {
  try {
    const body = req.body || {};

    const method = body.method === undefined ? 'Cash' : body.method;
    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({
        error: 'Payment method must be Cash, JazzCash, Easypaisa or Bank',
      });
    }

    const slip = body.slipImage || '';
    const slipProblem = checkSlip(slip);
    if (slipProblem) {
      return res.status(400).json({ error: slipProblem });
    }

    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const balanceBefore = member.balance || 0;
    const owed = balanceBefore > 0 ? balanceBefore : member.fee;

    const amount = body.amount === undefined ? owed : Number(body.amount);
    if (!(amount > 0) || amount > MAX_PAYMENT) {
      return res.status(400).json({
        error: 'Amount must be more than 0 and not more than ' + MAX_PAYMENT,
      });
    }
    if (amount > owed) {
      return res.status(400).json({
        error: 'Amount cannot be more than Rs ' + owed + ' (what this member owes now)',
      });
    }

    const pkg = await Package.findOne({ name: member.packageName });
    if (!pkg) {
      return res.status(400).json({ error: 'Package not found' });
    }

    const today = new Date();
    const oldDueDate = member.nextDueDate;
    const fullyPaid = amount >= owed;

    let newDueDate = oldDueDate;
    let balanceAfter = 0;

    if (fullyPaid) {
      const startFrom = oldDueDate > today ? oldDueDate : today;
      newDueDate = new Date(startFrom);
      newDueDate.setDate(newDueDate.getDate() + pkg.durationDays);
    } else {
      balanceAfter = Math.round((owed - amount) * 100) / 100;
    }

    member.nextDueDate = newDueDate;
    member.balance = balanceAfter;

    const savedPayment = await saveMemberWithPayment(member, {
      memberId: member._id,
      memberName: member.name,
      packageName: member.packageName,
      amount: amount,
      method: method,
      feeAtPayment: member.fee,
      balanceBefore: balanceBefore,
      balanceAfter: balanceAfter,
      slipImage: slip,
      hasSlip: slip !== '',
      paidOn: today,
      oldDueDate: oldDueDate,
      newDueDate: newDueDate,
    });

    const paymentInfo = savedPayment.toObject();
    delete paymentInfo.slipImage;
    res.json({ member: member, payment: paymentInfo });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;