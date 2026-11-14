process.env.JWT_SECRET = 'test-secret-only-for-jest-123456';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Gym = require('../models/Gym');
const Owner = require('../models/Owner');
const Setting = require('../models/Setting');
const app = require('../app');

let mongod;

async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { runtimeAdapters: { os: require('os') } });
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

async function stopDb() {
  await mongoose.disconnect();
  await mongod.stop();
}

async function clearDb() {
  const collections = mongoose.connection.collections;
  for (const name of Object.keys(collections)) {
    await collections[name].deleteMany({});
  }
}

async function loginToken(options) {
  const opts = options || {};
  const username = opts.username || 'testowner';
  const password = opts.password || 'password123';
  const gymName = opts.gymName || 'Test Gym';

  const gym = await Gym.create({ name: gymName });
  await Owner.create({
    gymId: gym._id,
    username: username,
    passwordHash: await bcrypt.hash(password, 4),
  });
  await Setting.create({ gymId: gym._id, gymName: gymName });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: username, password: password });
  return res.body.token;
}

function auth(token) {
  return { Authorization: 'Bearer ' + token };
}

async function makeMember(token) {
  const pkg = await request(app)
    .post('/api/packages')
    .set(auth(token))
    .send({ name: 'Gold', fee: 4000, durationDays: 30 });
  const member = await request(app)
    .post('/api/members')
    .set(auth(token))
    .send({ name: 'Ali Khan', phone: '03001234567', packageId: pkg.body._id });
  return member.body;
}

module.exports = { app, startDb, stopDb, clearDb, loginToken, auth, makeMember };