// api/_lib/auth.js
// Vercel serverless functions are stateless (no PHP $_SESSION), so login
// issues a signed JWT instead. The frontend sends it back as:
//   Authorization: Bearer <token>
// This also sidesteps CSRF entirely (no cookies involved in the auth check).

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = '12h';

export function signToken(payload) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET env var is not set');
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function sendJson(res, status, body) {
  res.status(status).json(body);
}

export function sendError(res, status, message, extra) {
  res.status(status).json({ success: false, error: message, ...(extra || {}) });
}

// Reads + verifies the Bearer token, throws a {status, message} style error
// via the response if invalid. Returns the decoded payload on success.
export function requireDealerAuth(req, res) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    sendError(res, 401, 'Not logged in. Please login again.');
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'dealer_user' || !decoded.dealer_id || !decoded.dealer_user_id) {
      sendError(res, 401, 'Invalid session. Please login again.');
      return null;
    }
    return decoded; // { type, dealer_id, dealer_user_id, role }
  } catch (e) {
    sendError(res, 401, 'Session expired. Please login again.');
    return null;
  }
}

export function methodGuard(req, res, method) {
  if (req.method !== method) {
    sendError(res, 405, 'Method not allowed');
    return false;
  }
  return true;
}
