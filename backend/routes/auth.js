const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner');
const Gym = require('../models/Gym');
const Setting = require('../models/Setting');

const router = express.Router();

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const MAX_TRIES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failed = new Map();

const MAX_SIGNUPS = 20;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const signups = new Map();

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

function signupBlocked(ip) {
  const record = signups.get(ip);
  if (!record) return false;
  if (Date.now() - record.firstAt > SIGNUP_WINDOW_MS) {
    signups.delete(ip);
    return false;
  }
  return record.count >= MAX_SIGNUPS;
}

function noteSignup(ip) {
  const record = signups.get(ip);
  if (!record || Date.now() - record.firstAt > SIGNUP_WINDOW_MS) {
    signups.set(ip, { count: 1, firstAt: Date.now() });
  } else {
    record.count += 1;
  }
}

function makeToken(owner) {
  return jwt.sign(
    {
      id: String(owner._id),
      username: owner.username,
      gymId: String(owner.gymId),
    },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '7d' }
  );
}

function checkSignup(gymName, username, password) {
  if (gymName.length < 2 || gymName.length > 40) {
    return 'Gym name must have 2 to 40 characters';
  }
  if (username.length < 3 || username.length > 30) {
    return 'Username must have 3 to 30 characters';
  }
  if (!/^[a-z0-9_.-]+$/.test(username)) {
    return 'Username can have only letters, numbers, dot, dash and underscore';
  }
  if (password.length < 8 || password.length > 100) {
    return 'Password must have 8 to 100 characters';
  }
  return '';
}

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

    if (!owner.gymId) {
      return res
        .status(403)
        .json({ error: 'This account has no gym yet. Run migrate.js first' });
    }

    failed.delete(ip);

    res.json({ token: makeToken(owner), username: owner.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/signup', async (req, res) => {
  let gym = null;
  let owner = null;
  let setting = null;

  try {
    const ip = req.ip;
    if (signupBlocked(ip)) {
      return res.status(429).json({
        error: 'Too many sign ups from this address. Please try again later',
      });
    }
    noteSignup(ip);

    const body = req.body || {};
    const gymName = String(body.gymName || '').trim();
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');

    const problem = checkSignup(gymName, username, password);
    if (problem) {
      return res.status(400).json({ error: problem });
    }

    if (await Owner.findOne({ username })) {
      return res.status(400).json({ error: 'That username is already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    gym = await Gym.create({ name: gymName });
    owner = await Owner.create({
      gymId: gym._id,
      username: username,
      passwordHash: passwordHash,
    });
    setting = await Setting.create({ gymId: gym._id, gymName: gymName });

    res.status(201).json({
      token: makeToken(owner),
      username: owner.username,
      gymName: gymName,
    });
  } catch (err) {
    try {
      if (setting) await Setting.deleteOne({ _id: setting._id });
      if (owner) await Owner.deleteOne({ _id: owner._id });
      if (gym) await Gym.deleteOne({ _id: gym._id });
    } catch (cleanupError) {
      console.log('Sign up clean-up failed:', cleanupError.message);
    }

    if (err && err.code === 11000) {
      return res.status(400).json({ error: 'That username is already taken' });
    }
    res.status(500).json({ error: 'Could not sign up. Please try again' });
  }
});

module.exports = router;