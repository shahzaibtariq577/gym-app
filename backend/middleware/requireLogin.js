const jwt = require('jsonwebtoken');

// A guard for the routes. It lets a request pass only if it brings a valid
// login token in the header:  Authorization: Bearer <token>
function requireLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Please log in' });
  }

  try {
    req.owner = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
    next();
  } catch (err) {
    res.status(401).json({ error: 'Login expired. Please log in again' });
  }
}

module.exports = requireLogin;