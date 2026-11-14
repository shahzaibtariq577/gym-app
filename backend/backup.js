// backup.js - saves a copy of your whole database into JSON files.
// Run it in the backend folder:   node backup.js
// The copy goes to a folder OUTSIDE the project, so it can never be pushed
// to GitHub:   C:\Users\SHAZAIB\gym-backups\2026-11-13\

const fs = require('fs');
const path = require('path');
const os = require('os');
const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  if (!process.env.MONGO_URI) {
    console.log('MONGO_URI is missing in backend\\.env');
    process.exit(1);
  }

  // EJSON keeps dates and ids exact, so the copy can be restored later
  const EJSON = mongoose.mongo.EJSON || require('bson').EJSON;

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Database connected');

  const day = new Date().toLocaleDateString('en-CA'); // like 2026-11-13
  const folder = path.join(os.homedir(), 'gym-backups', day);
  fs.mkdirSync(folder, { recursive: true });

  const collections = await mongoose.connection.db.listCollections().toArray();

  for (const c of collections) {
    const docs = await mongoose.connection.db.collection(c.name).find({}).toArray();
    const file = path.join(folder, c.name + '.json');
    fs.writeFileSync(file, EJSON.stringify(docs, null, 2));
    console.log(c.name + ': ' + docs.length + ' saved');
  }

  console.log('Backup is ready in: ' + folder);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.log('Backup failed:', err.message);
  process.exit(1);
});