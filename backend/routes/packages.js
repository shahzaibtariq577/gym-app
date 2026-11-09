const express = require('express');
const Package = require('../models/Package');

const router = express.Router();

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
    const pkg = await Package.create(req.body);
    res.status(201).json(pkg);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a package
router.delete('/:id', async (req, res) => {
  try {
    await Package.findByIdAndDelete(req.params.id);
    res.json({ message: 'Package deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;