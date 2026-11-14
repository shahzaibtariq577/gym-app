require('dotenv').config();
const mongoose = require('mongoose');
const Gym = require('./models/Gym');
const Owner = require('./models/Owner');
const Setting = require('./models/Setting');
const Member = require('./models/Member');
const Package = require('./models/Package');
const Payment = require('./models/Payment');
const Expense = require('./models/Expense');

const MODELS = [
  ['Owners', Owner],
  ['Settings', Setting],
  ['Members', Member],
  ['Packages', Package],
  ['Payments', Payment],
  ['Expenses', Expense],
];

async function dropOldPackageIndex() {
  let indexes = [];
  try {
    indexes = await Package.collection.indexes();
  } catch (err) {
    if (err.code !== 26) throw err;
  }
  if (indexes.some((index) => index.name === 'name_1')) {
    await Package.collection.dropIndex('name_1');
    console.log('Old package name index removed');
  }
}

async function countMissing() {
  let total = 0;
  for (const [, Model] of MODELS) {
    total += await Model.countDocuments({ gymId: null });
  }
  return total;
}

async function run() {
  if (!process.env.MONGO_URI) {
    console.log('MONGO_URI is missing in backend\\.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Database connected');

  await dropOldPackageIndex();

  const missing = await countMissing();
  const gymCount = await Gym.countDocuments();

  if (missing === 0) {
    console.log('Nothing to do: every document already has a gym.');
  } else {
    if (gymCount > 1) {
      console.log(
        missing + ' documents have no gym, but there is more than one gym.'
      );
      console.log('Stopped, because it is not clear which gym they belong to.');
      await mongoose.disconnect();
      process.exit(1);
    }

    let gym = await Gym.findOne();
    if (gym) {
      console.log('Using the existing gym: ' + gym.name);
    } else {
      const setting = await Setting.findOne({ gymId: null });
      const name = (setting && setting.gymName) || 'My Gym';
      gym = await Gym.create({ name: name.slice(0, 40) });
      console.log('Gym created: ' + gym.name);
    }

    for (const [label, Model] of MODELS) {
      const result = await Model.updateMany(
        { gymId: null },
        { $set: { gymId: gym._id } },
        { timestamps: false }
      );
      console.log(label + ': ' + result.modifiedCount + ' updated');
    }
  }

  await Promise.all(MODELS.map(([, Model]) => Model.init()));
  await Package.createIndexes();

  const left = await countMissing();
  console.log('');
  console.log('Documents without a gym now: ' + left);
  console.log('Gyms: ' + (await Gym.countDocuments()));
  for (const [label, Model] of MODELS) {
    console.log(label + ': ' + (await Model.countDocuments()));
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.log('Migration failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch (e) {}
  process.exit(1);
});