const express = require('express');
const bcrypt = require('bcryptjs');
const Setting = require('../models/Setting');
const Owner = require('../models/Owner');

const router = express.Router();

// Biggest photo text we accept (a 200x200 photo is about 10,000 to 20,000)
const MAX_PHOTO_LENGTH = 100000;

// Check the photo. It can be empty. Returns an error text, or '' if all is fine
function checkPhoto(photo) {
  if (!photo) return '';
  if (typeof photo !== 'string') return 'Photo is not valid';
  if (!photo.startsWith('data:image/')) return 'Photo must be a picture';
  if (photo.length > MAX_PHOTO_LENGTH) return 'Photo is too big';
  return '';
}

// There is only one settings record. Make it the first time it is needed.
async function getSetting() {
  let setting = await Setting.findOne();
  if (!setting) setting = await Setting.create({});
  return setting;
}

// What we send to the screen
function toJson(setting, username) {
  return {
    gymName: setting.gymName,
    gymPhone: setting.gymPhone,
    gymAddress: setting.gymAddress,
    ownerName: setting.ownerName,
    ownerPhoto: setting.ownerPhoto,
    username: username || '',
  };
}

// Check one text field. Returns an error text, or '' if all is fine
function checkText(value, max, label) {
  if (String(value).trim().length > max) {
    return label + ' is too long (max ' + max + ' letters)';
  }
  return '';
}

// Show the settings
router.get('/', async (req, res) => {
  try {
    const setting = await getSetting();
    const owner = await Owner.findById(req.owner.id);
    res.json(toJson(setting, owner ? owner.username : ''));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change the gym information and the owner profile (only the fields that are sent)
router.put('/', async (req, res) => {
  try {
    const body = req.body || {};
    const setting = await getSetting();

    if (body.gymName !== undefined) {
      const name = String(body.gymName).trim();
      if (!name) return res.status(400).json({ error: 'Gym name is required' });
      const problem = checkText(name, 40, 'Gym name');
      if (problem) return res.status(400).json({ error: problem });
      setting.gymName = name;
    }

    const fields = [
      ['gymPhone', 30, 'Phone'],
      ['gymAddress', 120, 'Address'],
      ['ownerName', 40, 'Owner name'],
    ];
    for (const [key, max, label] of fields) {
      if (body[key] !== undefined) {
        const problem = checkText(body[key], max, label);
        if (problem) return res.status(400).json({ error: problem });
        setting[key] = String(body[key]).trim();
      }
    }

    // New photo (an empty photo removes the picture)
    if (body.ownerPhoto !== undefined) {
      const photoProblem = checkPhoto(body.ownerPhoto);
      if (photoProblem) return res.status(400).json({ error: photoProblem });
      setting.ownerPhoto = body.ownerPhoto || '';
    }

    await setting.save();
    const owner = await Owner.findById(req.owner.id);
    res.json(toJson(setting, owner ? owner.username : ''));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Change the login username and/or password. The current password is needed.
// A wrong current password answers 400 (not 401), because 401 means "log out".
router.put('/account', async (req, res) => {
  try {
    const body = req.body || {};
    const owner = await Owner.findById(req.owner.id);
    if (!owner) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    const passwordOk = await bcrypt.compare(
      String(body.currentPassword || ''),
      owner.passwordHash
    );
    if (!passwordOk) {
      return res.status(400).json({ error: 'Current password is wrong' });
    }

    let changed = false;

    if (body.newUsername !== undefined) {
      const username = String(body.newUsername).trim().toLowerCase();
      if (username.length < 3 || username.length > 30) {
        return res
          .status(400)
          .json({ error: 'Username must have 3 to 30 characters' });
      }
      if (!/^[a-z0-9_.-]+$/.test(username)) {
        return res.status(400).json({
          error: 'Username can have only letters, numbers, dot, dash and underscore',
        });
      }
      if (username !== owner.username) {
        owner.username = username;
        changed = true;
      }
    }

    if (body.newPassword !== undefined && body.newPassword !== '') {
      const newPassword = String(body.newPassword);
      if (newPassword.length < 8 || newPassword.length > 100) {
        return res
          .status(400)
          .json({ error: 'New password must have 8 to 100 characters' });
      }
      owner.passwordHash = await bcrypt.hash(newPassword, 10);
      changed = true;
    }

    if (!changed) {
      return res.status(400).json({ error: 'Nothing to change' });
    }

    await owner.save();
    res.json({ username: owner.username });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;