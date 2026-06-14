const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Filter query to scope data based on role
function scopeQuery(req, baseQuery, additionalParams = []) {
  if (req.user.role === 'admin') {
    return { query: baseQuery, params: additionalParams };
  } else {
    // Sales users only see their own data
    if (baseQuery.toLowerCase().includes('where')) {
      return {
        query: baseQuery + ' AND user_id = ?',
        params: [...additionalParams, req.user.id]
      };
    } else {
      return {
        query: baseQuery + ' WHERE user_id = ?',
        params: [...additionalParams, req.user.id]
      };
    }
  }
}

module.exports = { authenticate, requireAdmin, scopeQuery, JWT_SECRET };
