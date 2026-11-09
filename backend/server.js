const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
const memberRoutes = require('./routes/members');
app.use('/api/members', memberRoutes);
const packageRoutes = require('./routes/packages');
app.use('/api/packages', packageRoutes);

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