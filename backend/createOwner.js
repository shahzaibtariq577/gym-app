require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Owner = require('./models/Owner');

async function main() {
  const usernameArg = process.argv[2];
  const passwordArg = process.argv[3];

  if (!usernameArg || !passwordArg) {
    console.log('Use:  node createOwner.js username "newpassword"');
    process.exit(1);
  }

  const username = usernameArg.trim().toLowerCase();
  if (passwordArg.length < 8) {
    console.log('Password must have at least 8 characters');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const owner = await Owner.findOne({ username });
  if (!owner) {
    console.log('No owner found with the username: ' + username);
    await mongoose.disconnect();
    process.exit(1);
  }

  owner.passwordHash = await bcrypt.hash(passwordArg, 10);
  await owner.save();
  console.log('Password changed. You can log in as: ' + username);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.log('Error:', err.message);
  process.exit(1);
});