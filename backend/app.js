process.env.TZ = process.env.TZ || 'Asia/Karachi';

const express = require('express');
const cors = require('cors');
const requireLogin = require('./middleware/requireLogin');

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));

app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/members', requireLogin, require('./routes/members'));
app.use('/api/packages', requireLogin, require('./routes/packages'));
app.use('/api/payments', requireLogin, require('./routes/payments'));
app.use('/api/settings', requireLogin, require('./routes/settings'));
app.use('/api/expenses', requireLogin, require('./routes/expenses'));

app.get('/', (req, res) => {
  res.send('Gym app backend is running');
});

module.exports = app;