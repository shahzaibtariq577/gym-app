const express = require('express');
const Package = require('../models/Package');
const Member = require('../models/Member');

const router = express.Router();

// Clean the details list: text only, no empty lines, no repeats, max 10
function cleanFeatures(list) {
  if (!Array.isArray(list)) return [];
  const result = [];
  for (const item of list) {
    const text = String(item).trim().slice(0, 40);
    if (text && !result.some((r) => r.toLowerCase() === text.toLowerCase())) {
      result.push(text);
    }
  }
  return result.slice(0, 10);
}

// Check name, fee and days. Returns an error text, or '' if all is fine
function checkPackage(name, fee, durationDays) {
  const cleanName = String(name || '').trim();
  const feeNumber = Number(fee);
  const daysNumber = Number(durationDays);

  if (!cleanName) return 'Package name is required';
  if (cleanName.length > 30) return 'Package name is too long (max 30 letters)';
  if (!(feeNumber > 0)) return 'Fee must be more than 0';
  if (!(daysNumber > 0) || !Number.isInteger(daysNumber)) {
    return 'Days must be a whole number more than 0';
  }
  return '';
}

// Show all packages
router.get('/', async (req, res) => {
  try {
    const packages = await Package.find().sort({ fee: 1 });
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new package
router.post('/', async (req, res) => {
  try {
    const { name, fee, durationDays, features } = req.body;

    const problem = checkPackage(name, fee, durationDays);
    if (problem) {
      return res.status(400).json({ error: problem });
    }

    const pkg = await Package.create({
      name: String(name).trim(),
      fee: Number(fee),
      durationDays: Number(durationDays),
      features: cleanFeatures(features),
    });
    res.status(201).json(pkg);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Edit a package (name, fee, days and details)
router.put('/:id', async (req, res) => {
  try {
    const { name, fee, durationDays, features } = req.body;

    const pkg = await Package.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const problem = checkPackage(
      name || pkg.name,
      fee || pkg.fee,
      durationDays || pkg.durationDays
    );
    if (problem) {
      return res.status(400).json({ error: problem });
    }

    const oldName = pkg.name;
    const newName = name ? String(name).trim() : '';

    if (newName && newName !== oldName) {
      const exists = await Package.findOne({
        name: newName,
        _id: { $ne: pkg._id },
      });
      if (exists) {
        return res
          .status(400)
          .json({ error: 'A package named ' + newName + ' already exists' });
      }
      pkg.name = newName;
    }

    if (fee) pkg.fee = Number(fee);
    if (durationDays) pkg.durationDays = Number(durationDays);
    if (Array.isArray(features)) pkg.features = cleanFeatures(features);
    await pkg.save();

    // Keep the members of this package in sync with the new name
    if (pkg.name !== oldName) {
      await Member.updateMany(
        { packageName: oldName },
        { packageName: pkg.name }
      );
    }

    res.json(pkg);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a package (only if no member uses it)
router.delete('/:id', async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const count = await Member.countDocuments({ packageName: pkg.name });
    if (count > 0) {
      return res.status(400).json({
        error:
          'Cannot delete ' + pkg.name + ': ' + count + ' member(s) use this package',
      });
    }

    await Package.findByIdAndDelete(req.params.id);
    res.json({ message: 'Package deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;