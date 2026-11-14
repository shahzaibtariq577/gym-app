process.env.JWT_SECRET = 'test-secret-only-for-jest-123456';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Owner = require('../models/Owner');
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

async function loginToken() {
  await Owner.create({
    username: 'testowner',
    passwordHash: await bcrypt.hash('password123', 4),
  });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'testowner', password: 'password123' });
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