const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner');

const router = express.Router();

// Used when the username does not exist, so a wrong username and a wrong
// password take the same time and give the same answer.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

// Stop password guessing: 5 wrong tries from one address, then wait 15 minutes
const MAX_TRIES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failed = new Map(); // address -> { count, firstAt }

function isBlocked(ip) {
  const record = failed.get(ip);
  if (!record) return false;
  if (Date.now() - record.firstAt > WINDOW_MS) {
    failed.delete(ip);
    return false;
  }
  return record.count >= MAX_TRIES;
}

function noteWrongTry(ip) {
  const record = failed.get(ip);
  if (!record || Date.now() - record.firstAt > WINDOW_MS) {
    failed.set(ip, { count: 1, firstAt: Date.now() });
  } else {
    record.count += 1;
  }
}

// Log in: send username and password, get a token back
router.post('/login', async (req, res) => {
  try {
    const ip = req.ip;
    if (isBlocked(ip)) {
      return res
        .status(429)
        .json({ error: 'Too many wrong tries. Please wait 15 minutes' });
    }

    const body = req.body || {};
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');

    const owner = await Owner.findOne({ username });
    const passwordOk = await bcrypt.compare(
      password,
      owner ? owner.passwordHash : DUMMY_HASH
    );

    if (!owner || !passwordOk) {
      noteWrongTry(ip);
      return res.status(401).json({ error: 'Wrong username or password' });
    }

    failed.delete(ip);

    const token = jwt.sign(
      { id: String(owner._id), username: owner.username },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '7d' }
    );

    res.json({ token: token, username: owner.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;