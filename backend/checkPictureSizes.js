require('dotenv').config();
const mongoose = require('mongoose');

const checks = [
  { collection: 'members', field: 'photo', label: 'Member photos' },
  { collection: 'settings', field: 'ownerPhoto', label: 'Owner photo' },
  { collection: 'payments', field: 'slipImage', label: 'Bank slip pictures' },
  { collection: 'expenses', field: 'billImage', label: 'Expense bill pictures' },
];

function kb(bytes) {
  return (bytes / 1024).toFixed(1) + ' KB';
}

function mb(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

async function run() {
  if (!process.env.MONGO_URI) {
    console.log('MONGO_URI is missing in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  console.log('');
  console.log('PICTURE SIZES (read only, nothing is changed)');
  console.log('---------------------------------------------');

  let allPictures = 0;

  for (const c of checks) {
    const rows = await db
      .collection(c.collection)
      .aggregate([
        { $match: { [c.field]: { $type: 'string', $ne: '' } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            total: { $sum: { $strLenBytes: '$' + c.field } },
            biggest: { $max: { $strLenBytes: '$' + c.field } },
          },
        },
      ])
      .toArray();

    if (rows.length === 0) {
      console.log(c.label + ': none');
      continue;
    }

    const r = rows[0];
    allPictures += r.total;
    console.log(c.label + ':');
    console.log('  how many : ' + r.count);
    console.log('  total    : ' + kb(r.total));
    console.log('  average  : ' + kb(r.total / r.count));
    console.log('  biggest  : ' + kb(r.biggest));
  }

  console.log('---------------------------------------------');
  console.log('All pictures together: ' + mb(allPictures));

  const stats = await db.command({ dbStats: 1 });
  console.log('');
  console.log('WHOLE DATABASE');
  console.log('  data size   : ' + mb(stats.dataSize));
  console.log('  storage size: ' + mb(stats.storageSize));
  console.log('  free limit  : 512 MB');
  console.log('  used (about): ' + ((stats.storageSize / 1024 / 1024 / 512) * 100).toFixed(1) + ' %');
  console.log('');

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.log('Could not finish. Error type: ' + err.name);
  try {
    await mongoose.disconnect();
  } catch (e) {}
  process.exit(1);
});
