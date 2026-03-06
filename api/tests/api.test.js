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
  billing: [],
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

  test('accepts optional gitUrl field', async () => {
    const res = await request('POST', '/api/deploy', {
      projectId,
      gitUrl: 'https://github.com/user/my-app.git',
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 201);
    assert.equal(res.body.deployment.gitUrl, 'https://github.com/user/my-app.git');
  });

  test('returns 400 for invalid gitUrl', async () => {
    const res = await request('POST', '/api/deploy', {
      projectId,
      gitUrl: 'not-a-valid-url',
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });
});

describe('GET /api/deploy/:id', () => {
  let deploymentId;

  before(async () => {
    // Create a project and deployment for these tests
    const projRes = await request('POST', '/api/projects/create', {
      name: 'get-deploy-test',
      stack: 'node',
    }, { Authorization: `Bearer ${authToken}` });
    const pid = projRes.body.project.id;

    const depRes = await request('POST', '/api/deploy', {
      projectId: pid,
    }, { Authorization: `Bearer ${authToken}` });
    deploymentId = depRes.body.deployment.id;
  });

  test('returns 401 without auth token', async () => {
    const res = await request('GET', `/api/deploy/${deploymentId}`);
    assert.equal(res.status, 401);
  });

  test('returns 404 for nonexistent deployment', async () => {
    const res = await request('GET', '/api/deploy/deploy_nonexistent', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 404);
  });

  test('returns deployment by id', async () => {
    const res = await request('GET', `/api/deploy/${deploymentId}`, null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.deployment);
    assert.equal(res.body.deployment.id, deploymentId);
    assert.ok(res.body.deployment.status);
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
  test('returns list of plans without authentication', async () => {
    const res = await request('GET', '/api/billing/plans');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.plans));
    const planIds = res.body.plans.map(p => p.id);
    assert.ok(planIds.includes('free'));
    assert.ok(planIds.includes('starter'));
    assert.ok(planIds.includes('pro'));
    assert.ok(planIds.includes('team'));
    assert.ok(planIds.includes('enterprise'));
  });
});

describe('GET /api/billing', () => {
  test('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/billing');
    assert.equal(res.status, 401);
  });

  test('returns billing info for authenticated user (defaults to free)', async () => {
    const res = await request('GET', '/api/billing', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.billing);
    assert.equal(res.body.billing.plan, 'free');
    assert.ok(res.body.billing.planDetails);
    assert.equal(res.body.billing.planDetails.id, 'free');
  });
});

describe('POST /api/billing/subscribe', () => {
  test('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/billing/subscribe', { planId: 'starter' });
    assert.equal(res.status, 401);
  });

  test('returns 400 for invalid plan', async () => {
    const res = await request('POST', '/api/billing/subscribe', { planId: 'nonexistent' }, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('subscribes to starter plan successfully', async () => {
    const res = await request('POST', '/api/billing/subscribe', { planId: 'starter' }, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.billing.plan, 'starter');
    assert.ok(res.body.billing.planDetails);
  });

  test('billing info reflects updated plan', async () => {
    const res = await request('GET', '/api/billing', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.billing.plan, 'starter');
  });
});

describe('GET /api/billing/invoices', () => {
  test('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/billing/invoices');
    assert.equal(res.status, 401);
  });

  test('returns invoices for authenticated user', async () => {
    const res = await request('GET', '/api/billing/invoices', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.invoices));
    // One invoice was recorded when subscribing to starter above
    assert.ok(res.body.invoices.length >= 1);
    assert.equal(res.body.invoices[0].plan, 'starter');
    assert.equal(res.body.invoices[0].status, 'paid');
  });
});

describe('POST /api/billing/checkout', () => {
  test('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/billing/checkout', { planId: 'pro' });
    assert.equal(res.status, 401);
  });

  test('returns 400 for invalid plan', async () => {
    const res = await request('POST', '/api/billing/checkout', { planId: 'invalid' }, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 400);
  });

  test('returns 400 for free plan checkout', async () => {
    const res = await request('POST', '/api/billing/checkout', { planId: 'free' }, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 400);
  });

  test('returns mock checkout URL when Stripe is not configured', async () => {
    const res = await request('POST', '/api/billing/checkout', { planId: 'pro' }, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.checkoutUrl);
    assert.ok(res.body.mock);
  });
});

describe('POST /api/billing/cancel', () => {
  test('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/billing/cancel', {});
    assert.equal(res.status, 401);
  });

  test('cancels subscription successfully', async () => {
    const res = await request('POST', '/api/billing/cancel', {}, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.billing.cancelAtPeriodEnd);
  });

  test('returns 400 when already on free plan', async () => {
    // Downgrade to free first
    await request('POST', '/api/billing/subscribe', { planId: 'free' }, {
      Authorization: `Bearer ${authToken}`,
    });
    const res = await request('POST', '/api/billing/cancel', {}, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });
});

// ─── Storage API ─────────────────────────────────────────────────────────────

describe('GET /api/storage', () => {
  test('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/storage');
    assert.equal(res.status, 401);
  });

  test('returns empty storage list for new user', async () => {
    const res = await request('GET', '/api/storage', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.storage));
  });
});

describe('GET /api/storage/:projectId', () => {
  let storageProjectId;

  before(async () => {
    const res = await request('POST', '/api/projects/create', {
      name: 'storage-test-project',
      stack: 'node',
    }, { Authorization: `Bearer ${authToken}` });
    storageProjectId = res.body.project.id;
  });

  test('returns 401 without auth token', async () => {
    const res = await request('GET', `/api/storage/${storageProjectId}`);
    assert.equal(res.status, 401);
  });

  test('returns 404 for nonexistent project', async () => {
    const res = await request('GET', '/api/storage/proj_nonexistent', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 404);
  });

  test('returns default storage record for project with no compression history', async () => {
    const res = await request('GET', `/api/storage/${storageProjectId}`, null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.storage);
    assert.equal(res.body.storage.projectId, storageProjectId);
    assert.equal(res.body.storage.status, 'idle');
    assert.ok(res.body.storage.thresholdHuman);
  });
});

describe('POST /api/storage/:projectId/compress', () => {
  let compressProjectId;

  before(async () => {
    const res = await request('POST', '/api/projects/create', {
      name: 'compress-test-project',
      stack: 'node',
    }, { Authorization: `Bearer ${authToken}` });
    compressProjectId = res.body.project.id;
  });

  test('returns 401 without auth token', async () => {
    const res = await request('POST', `/api/storage/${compressProjectId}/compress`, {});
    assert.equal(res.status, 401);
  });

  test('returns 404 for nonexistent project', async () => {
    const res = await request('POST', '/api/storage/proj_nonexistent/compress', {}, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 404);
  });

  test('queues a compression job for the project', async () => {
    const res = await request('POST', `/api/storage/${compressProjectId}/compress`, {
      originalSizeBytes: 5368709120,
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 202);
    assert.ok(res.body.jobId);
    assert.ok(res.body.storage);
    assert.equal(res.body.storage.status, 'compressing');
    assert.equal(res.body.storage.originalSizeBytes, 5368709120);
  });

  test('returns 409 when compression is already in progress', async () => {
    const res = await request('POST', `/api/storage/${compressProjectId}/compress`, {}, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 409);
    assert.ok(res.body.error);
  });
});

// ─── Towers API ───────────────────────────────────────────────────────────────

describe('GET /api/towers', () => {
  test('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/towers');
    assert.equal(res.status, 401);
  });

  test('returns list when no towers are registered', async () => {
    const res = await request('GET', '/api/towers', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.towers));
  });
});

describe('POST /api/towers/register', () => {
  test('returns 401 without build secret', async () => {
    const res = await request('POST', '/api/towers/register', {
      url: 'http://localhost:5000',
    });
    assert.equal(res.status, 401);
  });

  test('returns 400 when url is missing', async () => {
    const res = await request('POST', '/api/towers/register', {}, {
      'x-build-secret': 'dev-build-secret',
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('returns 400 for an invalid url', async () => {
    const res = await request('POST', '/api/towers/register', {
      url: 'not-a-valid-url',
    }, { 'x-build-secret': 'dev-build-secret' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('registers a tower successfully', async () => {
    const res = await request('POST', '/api/towers/register', {
      url: 'http://localhost:5001',
      region: 'us-east',
    }, { 'x-build-secret': 'dev-build-secret' });
    assert.equal(res.status, 201);
    assert.ok(res.body.tower);
    assert.ok(res.body.tower.id);
    assert.equal(res.body.tower.url, 'http://localhost:5001');
    assert.equal(res.body.tower.region, 'us-east');
  });
});

describe('POST /api/towers/:id/heartbeat', () => {
  let towerId;

  before(async () => {
    const res = await request('POST', '/api/towers/register', {
      url: 'http://localhost:5002',
    }, { 'x-build-secret': 'dev-build-secret' });
    towerId = res.body.tower.id;
  });

  test('returns 401 without build secret', async () => {
    const res = await request('POST', `/api/towers/${towerId}/heartbeat`, {});
    assert.equal(res.status, 401);
  });

  test('returns 404 for nonexistent tower', async () => {
    const res = await request('POST', '/api/towers/tower_nonexistent/heartbeat', {}, {
      'x-build-secret': 'dev-build-secret',
    });
    assert.equal(res.status, 404);
  });

  test('records heartbeat with active job count', async () => {
    const res = await request('POST', `/api/towers/${towerId}/heartbeat`, {
      activeJobs: 3,
    }, { 'x-build-secret': 'dev-build-secret' });
    assert.equal(res.status, 200);
    assert.ok(res.body.tower);
    assert.equal(res.body.tower.activeJobs, 3);
    assert.ok(res.body.tower.lastHeartbeatAt);
  });
});

describe('DELETE /api/towers/:id', () => {
  let towerId;

  before(async () => {
    const res = await request('POST', '/api/towers/register', {
      url: 'http://localhost:5003',
    }, { 'x-build-secret': 'dev-build-secret' });
    towerId = res.body.tower.id;
  });

  test('returns 401 without build secret', async () => {
    const res = await request('DELETE', `/api/towers/${towerId}`);
    assert.equal(res.status, 401);
  });

  test('returns 404 for nonexistent tower', async () => {
    const res = await request('DELETE', '/api/towers/tower_nonexistent', null, {
      'x-build-secret': 'dev-build-secret',
    });
    assert.equal(res.status, 404);
  });

  test('deregisters a tower successfully', async () => {
    const res = await request('DELETE', `/api/towers/${towerId}`, null, {
      'x-build-secret': 'dev-build-secret',
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.tower);
    assert.equal(res.body.tower.id, towerId);
  });
});
