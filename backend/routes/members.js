const express = require('express');
const Member = require('../models/Member');
const Package = require('../models/Package');
const Payment = require('../models/Payment');

const router = express.Router();

// Biggest photo text we accept (a 200x200 photo is about 10,000 to 20,000)
const MAX_PHOTO_LENGTH = 100000;

// Ways a member can pay, and the biggest amount we accept
const PAYMENT_METHODS = ['Cash', 'JazzCash', 'Easypaisa', 'Bank'];
const MAX_PAYMENT = 1000000;

// Biggest bank slip picture text we accept
const MAX_SLIP_LENGTH = 700000;

// Check name and phone. Returns an error text, or '' if all is fine
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

// Check the photo. It can be empty. Returns an error text, or '' if all is fine
function checkPhoto(photo) {
  if (!photo) return '';
  if (typeof photo !== 'string') return 'Photo is not valid';
  if (!photo.startsWith('data:image/')) return 'Photo must be a picture';
  if (photo.length > MAX_PHOTO_LENGTH) return 'Photo is too big';
  return '';
}

// Check the bank slip picture. It can be empty. Returns an error text, or '' if fine
function checkSlip(slip) {
  if (!slip) return '';
  if (typeof slip !== 'string') return 'Slip is not valid';
  if (!slip.startsWith('data:image/')) return 'Slip must be a picture';
  if (slip.length > MAX_SLIP_LENGTH) return 'Slip picture is too big';
  return '';
}

// Save a member together with a payment, safely.
// The payment is saved first. If saving the member fails,
// the payment is removed again, so the two always match.
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

// Show all members
router.get('/', async (req, res) => {
  try {
    const members = await Member.find().sort({ nextDueDate: 1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new member
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

// Edit a member (name, phone, photo, package, due date, or start a new package today)
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

    // New photo (an empty photo removes the picture)
    if (photo !== undefined) {
      const photoProblem = checkPhoto(photo);
      if (photoProblem) {
        return res.status(400).json({ error: photoProblem });
      }
      member.photo = photo || '';
    }

    // Filled only when the member starts a new package today
    let newPayment = null;

    // New package: change the name and the fee.
    if (packageId) {
      const pkg = await Package.findById(packageId);
      if (!pkg) {
        return res.status(400).json({ error: 'Package not found' });
      }
      if (pkg.name !== member.packageName) {
        member.packageName = pkg.name;
        member.fee = pkg.fee;

        // Start the new package today: new due date and a payment record
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
            paidOn: today,
            oldDueDate: oldDueDate,
            newDueDate: newDueDate,
          };
        }
      }
    }

    // New due date typed by the owner (ignored when starting today)
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

// Delete a member
router.delete('/:id', async (req, res) => {
  try {
    await Member.findByIdAndDelete(req.params.id);
    res.json({ message: 'Member deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Mark a member as paid (also saves a payment record)
// The screen may send amount (default: the member's fee) and method (default: Cash)
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

    const amount = body.amount === undefined ? member.fee : Number(body.amount);
    if (!(amount > 0) || amount > MAX_PAYMENT) {
      return res.status(400).json({
        error: 'Amount must be more than 0 and not more than ' + MAX_PAYMENT,
      });
    }

    const pkg = await Package.findOne({ name: member.packageName });
    if (!pkg) {
      return res.status(400).json({ error: 'Package not found' });
    }

    const today = new Date();
    const oldDueDate = member.nextDueDate;
    const startFrom = oldDueDate > today ? oldDueDate : today;
    const newDueDate = new Date(startFrom);
    newDueDate.setDate(newDueDate.getDate() + pkg.durationDays);

    member.nextDueDate = newDueDate;

    const savedPayment = await saveMemberWithPayment(member, {
      memberId: member._id,
      memberName: member.name,
      packageName: member.packageName,
      amount: amount,
      method: method,
      feeAtPayment: member.fee,
      slipImage: slip,
      hasSlip: slip !== '',
      paidOn: today,
      oldDueDate: oldDueDate,
      newDueDate: newDueDate,
    });

    // Send back the member and the new payment (without the big slip picture)
    const paymentInfo = savedPayment.toObject();
    delete paymentInfo.slipImage;
    res.json({ member: member, payment: paymentInfo });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;