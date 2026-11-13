// Use Pakistan time for "this month" totals, even if the host is in another country
process.env.TZ = process.env.TZ || 'Asia/Karachi';

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

// Behind a host (Render, Railway, etc.) there is one proxy in front of us.
// This makes req.ip the real visitor address, so the login limiter works.
app.set('trust proxy', 1);

// Only our own website may call this server.
// CLIENT_URL can hold more than one address, separated by commas.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));

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
const expenseRoutes = require('./routes/expenses');
app.use('/api/expenses', requireLogin, expenseRoutes);

app.get('/', (req, res) => {
  res.send('Gym app backend is running');
});

// The host gives us the port in PORT. On your computer it is 5000.
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Database connected');
    app.listen(PORT, () => {
      console.log('Server running on port ' + PORT);
    });
  })
  .catch((err) => {
    console.log('Database error:', err.message);
  });