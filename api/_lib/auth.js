// api/_lib/auth.js

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
  res.status(status).json({
    success: false,
    error: message,
    ...(extra || {}),
  });
}

export function requireDealerAuth(req, res) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : null;

  if (!token) {
    sendError(res, 401, 'Not logged in. Please login again.');
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (
      decoded.type !== 'dealer_user' ||
      !decoded.dealer_id ||
      !decoded.dealer_user_id
    ) {
      sendError(res, 401, 'Invalid session. Please login again.');
      return null;
    }

    return decoded;
  } catch (e) {
    sendError(res, 401, 'Session expired. Please login again.');
    return null;
  }
}

// Admin authentication
export function requireAdminAuth(req, res) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : null;

  if (!token) {
    sendError(res, 401, 'Not logged in. Please login again.');
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (
      decoded.type !== 'admin_user' ||
      decoded.role !== 'admin' ||
      !decoded.user_id
    ) {
      sendError(res, 401, 'Invalid admin session. Please login again.');
      return null;
    }

    return decoded;
  } catch (e) {
    sendError(res, 401, 'Session expired. Please login again.');
    return null;
  }
}

// Generic auth for `users` table roles other than admin (field_executive,
// tele_caller, customer, do). Pass the roles this endpoint accepts.
export function requireUserAuth(req, res, allowRoles) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : null;

  if (!token) {
    sendError(res, 401, 'Not logged in. Please login again.');
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (
      decoded.type !== 'app_user' ||
      !decoded.user_id ||
      !allowRoles.includes(decoded.role)
    ) {
      sendError(res, 401, 'Invalid session. Please login again.');
      return null;
    }

    return decoded;
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