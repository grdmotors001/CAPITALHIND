import collectionHandler from './collection.js';
import customerHandler from './customer.js';
import staffHandler from './staff.js';
import teamLeaderHandler from './team-leader.js';
import teleCallerHandler from './tele-caller.js';
import usersHandler from './users.js';

const handlers = {
  collection: collectionHandler,
  customer: customerHandler,
  staff: staffHandler,
  'team-leader': teamLeaderHandler,
  'tele-caller': teleCallerHandler,
  users: usersHandler,
};

export default async function handler(req, res) {
  const rawPath = req.query?.path;

  const fullPath = Array.isArray(rawPath)
    ? rawPath.join('/')
    : String(rawPath || '').replace(/^\/+|\/+$/g, '');

  const parts = fullPath.split('/').filter(Boolean);
  const group = parts.shift();
  const handlerForGroup = handlers[group];

  if (!handlerForGroup) {
    return res.status(404).json({
      success: false,
      error: `API route not found: ${fullPath}`,
    });
  }

  req.query.path = parts.join('/');

  return handlerForGroup(req, res);
}
