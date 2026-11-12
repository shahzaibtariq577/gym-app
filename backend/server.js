const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// The secret used to sign login tokens. Without it, the server must not start.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.log('Missing JWT_SECRET in .env (at least 16 random letters and numbers)');
  process.exit(1);
}

const requireLogin = require('./middleware/requireLogin');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));   // bank slip pictures are bigger than 100kb

// Login is open to everyone; everything else needs a login token
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const memberRoutes = require('./routes/members');
app.use('/api/members', requireLogin, memberRoutes);
const packageRoutes = require('./routes/packages');
app.use('/api/packages', requireLogin, packageRoutes);
const paymentRoutes = require('./routes/payments');
app.use('/api/payments', requireLogin, paymentRoutes);
const settingsRoutes = require('./routes/settings');
app.use('/api/settings', requireLogin, settingsRoutes);

app.get('/', (req, res) => {
  res.send('Gym app backend is running');
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Database connected');
    app.listen(5000, () => {
      console.log('Server running on port 5000');
    });
  })
  .catch((err) => {
    console.log('Database error:', err.message);
  });