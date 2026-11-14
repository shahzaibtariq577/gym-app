process.env.TZ = process.env.TZ || 'Asia/Karachi';

require('dotenv').config();
const mongoose = require('mongoose');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.log('Missing JWT_SECRET in .env (at least 16 random letters and numbers)');
  process.exit(1);
}

const app = require('./app');

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