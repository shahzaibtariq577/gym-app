// Run once to create the owner account (or to reset the password):
//   node createOwner.js yourname "yourpassword"
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Owner = require('./models/Owner');

async function main() {
  const usernameArg = process.argv[2];
  const passwordArg = process.argv[3];

  if (!usernameArg || !passwordArg) {
    console.log('Use:  node createOwner.js yourname "yourpassword"');
    process.exit(1);
  }

  const username = usernameArg.trim().toLowerCase();
  if (username.length < 3) {
    console.log('Username must have at least 3 letters');
    process.exit(1);
  }
  if (passwordArg.length < 8) {
    console.log('Password must have at least 8 characters');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const passwordHash = await bcrypt.hash(passwordArg, 10);

  // There is only one owner: change it if it exists, otherwise create it
  const existing = await Owner.findOne();
  if (existing) {
    existing.username = username;
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log('Owner updated. You can log in as: ' + username);
  } else {
    await Owner.create({ username: username, passwordHash: passwordHash });
    console.log('Owner created. You can log in as: ' + username);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.log('Error:', err.message);
  process.exit(1);
});