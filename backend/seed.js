// FILE: gym-app\backend\seed.js   (create this new file inside the backend folder)
//
// What this file does:
// Creates the first owner (username + password) in the database, so you do
// not need PowerShell. It also creates the gym Settings if there are none.
// It is safe to run again: if an owner already exists, it does nothing.
//
// How to run (in the backend window, folder gym-app\backend):
//   node seed.js

require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Owner = require('./models/Owner');
const Setting = require('./models/Setting');

// Ask one question in the window and wait for the typed answer
function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function seed() {
  if (!process.env.MONGO_URI) {
    console.log('MONGO_URI is missing in the .env file');
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to the database');

  // 1. Stop if an owner already exists (there is only one owner)
  const existing = await Owner.findOne();
  if (existing) {
    console.log('An owner already exists (username: ' + existing.username + ').');
    console.log('Nothing was changed. To change the password, use the Settings page.');
    return;
  }

  // 2. Ask for the username and password
  const username = (await ask('Choose a username: ')).trim().toLowerCase();
  const password = await ask('Choose a password (at least 8 characters): ');

  if (!username) {
    console.log('Username is required. Run node seed.js again.');
    return;
  }
  if (password.length < 8) {
    console.log('Password must have at least 8 characters. Run node seed.js again.');
    return;
  }

  // 3. Save the owner with a scrambled password (hash), never the real one
  const passwordHash = await bcrypt.hash(password, 10);
  await Owner.create({ username, passwordHash });
  console.log('Owner created. You can now log in as: ' + username);

  // 4. Make the gym Settings if there are none yet
  const setting = await Setting.findOne();
  if (!setting) {
    await Setting.create({});
    console.log('Gym settings created (change them on the Settings page).');
  }
}

seed()
  .catch((err) => {
    console.log('Seed failed: ' + err.message);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });