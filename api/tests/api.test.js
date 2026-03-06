const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Use a test database that doesn't overwrite the real one
const fs = require('fs');
const path = require('path');

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'db.test.json');
const REAL_DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

// Seed test DB with a known user
const TEST_DB = {
  users: [
    {
      id: '1',
      username: 'admin',
      // bcrypt hash for 'admin123'
      passwordHash: '$2b$10$lwT4qvSoxvRCxCSZcGchquKNpehToB3ZK6KKAuoqLSUqWeKDlqkKK',
      role: 'admin',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ],
  projects: [],
  deployments: [],
  subscriptions: [],
  invoices: [],
};

let server;
let baseUrl;
let authToken;

// Helper: make an HTTP request
function request(method, pathname, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, baseUrl);
    const payload = body ? JSON.stringify(body) : undefined;
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

before(() => {
  // Point store at test DB
  process.env.DB_PATH_OVERRIDE = TEST_DB_PATH;
  fs.writeFileSync(TEST_DB_PATH, JSON.stringify(TEST_DB, null, 2));

  const app = require('../server');
  server = http.createServer(app);
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(() => {
  // Clean up test DB
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  return new Promise(resolve => server.close(resolve));
});

describe('GET /api/health', () => {
  test('returns ok status', async () => {
    const res = await request('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });
});

describe('POST /api/auth/login', () => {
  test('returns 400 when credentials are missing', async () => {
    const res = await request('POST', '/api/auth/login', {});
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('returns 401 for wrong password', async () => {
    const res = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'wrongpassword',
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Invalid credentials');
  });

  test('returns 401 for unknown user', async () => {
    const res = await request('POST', '/api/auth/login', {
      username: 'nobody',
      password: 'admin123',
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Invalid credentials');
  });

  test('returns token for valid credentials', async () => {
    const res = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123',
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.username, 'admin');
    authToken = res.body.token;
  });
});

describe('POST /api/projects/create', () => {
  test('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/projects/create', {
      name: 'my-project',
      stack: 'node',
    });
    assert.equal(res.status, 401);
  });

  test('returns 400 when project name is missing', async () => {
    const res = await request('POST', '/api/projects/create', { stack: 'node' }, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('returns 400 for invalid stack', async () => {
    const res = await request('POST', '/api/projects/create', {
      name: 'my-project',
      stack: 'invalid-stack',
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('creates a project successfully', async () => {
    const res = await request('POST', '/api/projects/create', {
      name: 'my-node-app',
      stack: 'node',
      description: 'A test project',
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 201);
    assert.equal(res.body.project.name, 'my-node-app');
    assert.equal(res.body.project.stack, 'node');
    assert.ok(res.body.project.id);
  });

  test('returns 409 for duplicate project name', async () => {
    const res = await request('POST', '/api/projects/create', {
      name: 'my-node-app',
      stack: 'node',
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 409);
  });
});

describe('POST /api/deploy', () => {
  let projectId;

  before(async () => {
    const res = await request('POST', '/api/projects/create', {
      name: 'deploy-test-project',
      stack: 'next',
    }, { Authorization: `Bearer ${authToken}` });
    projectId = res.body.project.id;
  });

  test('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/deploy', { projectId });
    assert.equal(res.status, 401);
  });

  test('returns 400 when projectId is missing', async () => {
    const res = await request('POST', '/api/deploy', {}, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('returns 404 for nonexistent project', async () => {
    const res = await request('POST', '/api/deploy', {
      projectId: 'proj_nonexistent',
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 404);
  });

  test('triggers deployment successfully', async () => {
    const res = await request('POST', '/api/deploy', {
      projectId,
      environment: 'staging',
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 201);
    assert.ok(res.body.deployment.id);
    assert.equal(res.body.deployment.environment, 'staging');
    assert.equal(res.body.deployment.status, 'queued');
  });

  test('returns 400 for invalid environment', async () => {
    const res = await request('POST', '/api/deploy', {
      projectId,
      environment: 'outer-space',
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 400);
  });
});

describe('GET /api/projects', () => {
  test('returns list of user projects', async () => {
    const res = await request('GET', '/api/projects', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.projects));
    assert.ok(res.body.projects.length >= 1);
  });
});

describe('GET /api/deploy', () => {
  test('returns list of deployments', async () => {
    const res = await request('GET', '/api/deploy', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.deployments));
  });
});

describe('GET /api/billing/plans', () => {
  test('returns all plans without authentication', async () => {
    const res = await request('GET', '/api/billing/plans');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.plans));
    assert.equal(res.body.plans.length, 5);
    const ids = res.body.plans.map(p => p.id);
    assert.ok(ids.includes('free'));
    assert.ok(ids.includes('starter'));
    assert.ok(ids.includes('pro'));
    assert.ok(ids.includes('team'));
    assert.ok(ids.includes('enterprise'));
  });
});

describe('GET /api/billing/subscription', () => {
  test('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/billing/subscription');
    assert.equal(res.status, 401);
  });

  test('returns subscription, plan, and usage for authenticated user', async () => {
    const res = await request('GET', '/api/billing/subscription', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.subscription);
    assert.equal(res.body.subscription.planId, 'free');
    assert.ok(res.body.plan);
    assert.equal(res.body.plan.id, 'free');
    assert.ok(res.body.usage);
    assert.ok(typeof res.body.usage.deploymentsThisMonth === 'number');
  });
});

describe('POST /api/billing/subscribe', () => {
  test('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/billing/subscribe', { planId: 'starter' });
    assert.equal(res.status, 401);
  });

  test('returns 400 for invalid plan', async () => {
    const res = await request('POST', '/api/billing/subscribe', { planId: 'ultra' }, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('returns 400 for enterprise plan (requires sales contact)', async () => {
    const res = await request('POST', '/api/billing/subscribe', { planId: 'enterprise' }, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('subscribes to starter plan successfully (no Stripe configured)', async () => {
    const res = await request('POST', '/api/billing/subscribe', { planId: 'starter' }, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.subscription);
    assert.equal(res.body.subscription.planId, 'starter');
    assert.ok(res.body.plan);
    assert.equal(res.body.plan.id, 'starter');
    assert.ok(res.body.message);
  });

  test('subscription is persisted – GET /api/billing/subscription reflects new plan', async () => {
    const res = await request('GET', '/api/billing/subscription', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.subscription.planId, 'starter');
  });

  test('can downgrade back to free plan', async () => {
    const res = await request('POST', '/api/billing/subscribe', { planId: 'free' }, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.subscription.planId, 'free');
  });
});

describe('GET /api/billing/invoices', () => {
  test('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/billing/invoices');
    assert.equal(res.status, 401);
  });

  test('returns invoices array for authenticated user', async () => {
    // Subscribe to starter to generate an invoice
    await request('POST', '/api/billing/subscribe', { planId: 'starter' }, {
      Authorization: `Bearer ${authToken}`,
    });
    const res = await request('GET', '/api/billing/invoices', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.invoices));
    assert.ok(res.body.invoices.length >= 1);
    const inv = res.body.invoices[0];
    assert.ok(inv.id);
    assert.ok(inv.amount);
    assert.equal(inv.status, 'paid');
  });
});
