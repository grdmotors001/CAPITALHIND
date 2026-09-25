import http from 'node:http';
import { URL } from 'node:url';

import adminHandler from './api/admin.js';
import miscHandler from './api/misc.js';
import dealerHandler from './api/dealer.js';
import doHandler from './api/do.js';
import fieldExecutiveHandler from './api/field-executive.js';
import grdHandler from './api/grd.js';
import grdSubmitLoanHandler from './api/grd-submit-loan.js';
import workflowAvailableLoansHandler from './api/workflow/available-loans.js';
import workflowDeliveriesHandler from './api/workflow/deliveries.js';
import workflowSalesHandler from './api/workflow/sales.js';

const PORT = 3000;

function createResponse(res) {
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },

    json(data) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.end(JSON.stringify(data));
      return this;
    },

    send(data) {
      if (Buffer.isBuffer(data)) {
        res.end(data);
      } else if (typeof data === 'object') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(data));
      } else {
        res.end(String(data ?? ''));
      }
      return this;
    },

    end(data) {
      res.end(data);
      return this;
    },

    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },

    getHeader(name) {
      return res.getHeader(name);
    },
  };
}

async function readBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) return undefined;

  const buffer = Buffer.concat(chunks);
  const contentType = String(req.headers['content-type'] || '');

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(buffer.toString('utf8'));
    } catch {
      return undefined;
    }
  }

  return buffer;
}

function resolveHandler(pathname, req) {
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  const parts = clean.split('/').filter(Boolean);

  if (parts[0] !== 'api') {
    return null;
  }

  const group = parts[1];
  const remaining = parts.slice(2);

  let handler;

  switch (group) {
    case 'admin':
      handler = adminHandler;
      break;

    case 'users':
    case 'staff':
    case 'customer':
    case 'collection':
    case 'team-leader':
    case 'tele-caller':
      handler = miscHandler;
      break;

    case 'dealer':
      handler = dealerHandler;
      break;

    case 'do':
      handler = doHandler;
      break;

    case 'field-executive':
      handler = fieldExecutiveHandler;
      break;

    case 'grd':
      handler = grdHandler;
      break;

    case 'grd-submit-loan':
      handler = grdSubmitLoanHandler;
      break;

    case 'workflow':
      if (remaining[0] === 'available-loans') {
        handler = workflowAvailableLoansHandler;
        remaining.shift();
      } else if (remaining[0] === 'deliveries') {
        handler = workflowDeliveriesHandler;
        remaining.shift();
      } else if (remaining[0] === 'sales') {
        handler = workflowSalesHandler;
        remaining.shift();
      }
      break;
  }

  if (!handler) return null;

  if (!req.query) req.query = {};

  if (
    group === 'users' ||
    group === 'staff' ||
    group === 'customer' ||
    group === 'collection' ||
    group === 'team-leader' ||
    group === 'tele-caller'
  ) {
    req.query.path = [group, ...remaining].join('/');
  } else {
    req.query.path = remaining.join('/');
  }

  return handler;
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(
      req.url,
      `http://${req.headers.host || 'localhost'}`
    );

    req.query = {};

    for (const [key, value] of requestUrl.searchParams.entries()) {
      if (req.query[key] === undefined) {
        req.query[key] = value;
      } else if (Array.isArray(req.query[key])) {
        req.query[key].push(value);
      } else {
        req.query[key] = [req.query[key], value];
      }
    }

    req.body = await readBody(req);

    const handler = resolveHandler(requestUrl.pathname, req);

    if (!handler) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        success: false,
        error: `Local API route not found: ${requestUrl.pathname}`,
      }));
      return;
    }

    await handler(req, createResponse(res));
  } catch (error) {
    console.error('LOCAL API ERROR:', error);

    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        success: false,
        error: error?.message || 'Internal server error',
      }));
    } else {
      res.end();
    }
  }
});

server.listen(PORT, () => {
  console.log(`Local API running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop.');
});


