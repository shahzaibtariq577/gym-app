require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Gym = require('./models/Gym');
const Owner = require('./models/Owner');
const Setting = require('./models/Setting');

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

  const existing = await Owner.findOne();
  if (existing) {
    console.log('An owner already exists (username: ' + existing.username + ').');
    console.log('Nothing was changed. New gyms sign up on the website.');
    return;
  }

  const gymName = (await ask('Gym name: ')).trim();
  const username = (await ask('Choose a username: ')).trim().toLowerCase();
  const password = await ask('Choose a password (at least 8 characters): ');

  if (gymName.length < 2 || gymName.length > 40) {
    console.log('Gym name must have 2 to 40 characters. Run node seed.js again.');
    return;
  }
  if (username.length < 3) {
    console.log('Username must have at least 3 characters. Run node seed.js again.');
    return;
  }
  if (password.length < 8) {
    console.log('Password must have at least 8 characters. Run node seed.js again.');
    return;
  }

  const gym = await Gym.create({ name: gymName });
  const passwordHash = await bcrypt.hash(password, 10);
  await Owner.create({ gymId: gym._id, username, passwordHash });
  await Setting.create({ gymId: gym._id, gymName });
  console.log('Gym and owner created. You can now log in as: ' + username);
}

seed()
  .catch((err) => {
    console.log('Seed failed: ' + err.message);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });