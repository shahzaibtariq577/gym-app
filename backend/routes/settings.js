const express = require('express');
const bcrypt = require('bcryptjs');
const Setting = require('../models/Setting');
const Owner = require('../models/Owner');
const Gym = require('../models/Gym');

const router = express.Router();

const MAX_PHOTO_LENGTH = 100000;

function checkPhoto(photo) {
  if (!photo) return '';
  if (typeof photo !== 'string') return 'Photo is not valid';
  if (!photo.startsWith('data:image/')) return 'Photo must be a picture';
  if (photo.length > MAX_PHOTO_LENGTH) return 'Photo is too big';
  return '';
}

async function getSetting(gymId) {
  let setting = await Setting.findOne({ gymId });
  if (!setting) setting = await Setting.create({ gymId });
  return setting;
}

function findOwner(req) {
  return Owner.findOne({ _id: req.owner.id, gymId: req.gymId });
}

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

function checkText(value, max, label) {
  if (String(value).trim().length > max) {
    return label + ' is too long (max ' + max + ' letters)';
  }
  return '';
}

router.get('/', async (req, res) => {
  try {
    const setting = await getSetting(req.gymId);
    const owner = await findOwner(req);
    res.json(toJson(setting, owner ? owner.username : ''));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const body = req.body || {};
    const setting = await getSetting(req.gymId);

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

    if (body.ownerPhoto !== undefined) {
      const photoProblem = checkPhoto(body.ownerPhoto);
      if (photoProblem) return res.status(400).json({ error: photoProblem });
      setting.ownerPhoto = body.ownerPhoto || '';
    }

    await setting.save();
    if (body.gymName !== undefined) {
      await Gym.updateOne({ _id: req.gymId }, { name: setting.gymName });
    }
    const owner = await findOwner(req);
    res.json(toJson(setting, owner ? owner.username : ''));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/account', async (req, res) => {
  try {
    const body = req.body || {};
    const owner = await findOwner(req);
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