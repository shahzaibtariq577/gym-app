const jwt = require('jsonwebtoken');

const OBJECT_ID = /^[a-f0-9]{24}$/i;

function requireLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Please log in' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
  } catch (err) {
    return res.status(401).json({ error: 'Login expired. Please log in again' });
  }

  if (
    !payload ||
    !OBJECT_ID.test(String(payload.gymId || '')) ||
    !OBJECT_ID.test(String(payload.id || ''))
  ) {
    return res.status(401).json({ error: 'Please log in again' });
  }

  req.owner = payload;
  req.gymId = String(payload.gymId);
  next();
}

module.exports = requireLogin;