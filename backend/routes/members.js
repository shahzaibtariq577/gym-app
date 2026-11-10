const express = require('express');
const Member = require('../models/Member');
const Package = require('../models/Package');
const Payment = require('../models/Payment');

const router = express.Router();

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
      photo,
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

// Edit a member (name and phone only)
router.put('/:id', async (req, res) => {
  try {
    const { name, phone } = req.body;

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

    if (name) member.name = String(name).trim();
    if (phone) member.phone = String(phone).trim();
    await member.save();

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
router.put('/:id/pay', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
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
    await member.save();

    await Payment.create({
      memberId: member._id,
      memberName: member.name,
      packageName: member.packageName,
      amount: member.fee,
      paidOn: today,
      oldDueDate: oldDueDate,
      newDueDate: newDueDate,
    });

    res.json(member);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;