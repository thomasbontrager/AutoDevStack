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
  domains: [],
  compressionRecords: [],
  towers: [],
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

// ─── Compression API ──────────────────────────────────────────────────────────

describe('POST /api/compression/analyze', () => {
  let projectId;

  before(async () => {
    const res = await request('POST', '/api/projects/create', {
      name: 'compression-test-project',
      stack: 'node',
    }, { Authorization: `Bearer ${authToken}` });
    projectId = res.body.project.id;
  });

  test('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/compression/analyze', { projectId });
    assert.equal(res.status, 401);
  });

  test('returns 400 when projectId is missing', async () => {
    const res = await request('POST', '/api/compression/analyze', {}, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('returns 404 for nonexistent project', async () => {
    const res = await request('POST', '/api/compression/analyze', {
      projectId: 'proj_nonexistent',
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 404);
  });

  test('returns analysis for a valid project', async () => {
    const res = await request('POST', '/api/compression/analyze', {
      projectId,
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.projectId, projectId);
    assert.ok(res.body.analysis);
    assert.ok(typeof res.body.analysis.sizeBytes === 'number');
    assert.ok(typeof res.body.analysis.needsCompression === 'boolean');
    assert.ok(typeof res.body.analysis.thresholdBytes === 'number');
    assert.ok(typeof res.body.analysis.targetBytes === 'number');
  });
});

describe('POST /api/compression/compress', () => {
  let projectId;

  before(async () => {
    const res = await request('POST', '/api/projects/create', {
      name: 'compress-trigger-project',
      stack: 'next',
    }, { Authorization: `Bearer ${authToken}` });
    projectId = res.body.project.id;
  });

  test('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/compression/compress', { projectId });
    assert.equal(res.status, 401);
  });

  test('returns 400 when projectId is missing', async () => {
    const res = await request('POST', '/api/compression/compress', {}, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('returns 404 for nonexistent project', async () => {
    const res = await request('POST', '/api/compression/compress', {
      projectId: 'proj_nonexistent',
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 404);
  });

  test('returns 400 when project is below threshold and force is not set', async () => {
    const res = await request('POST', '/api/compression/compress', {
      projectId,
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('accepts compression with force=true', async () => {
    const res = await request('POST', '/api/compression/compress', {
      projectId,
      force: true,
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 202);
    assert.ok(res.body.compressionId);
    assert.equal(res.body.status, 'queued');
  });
});

describe('GET /api/compression/:projectId', () => {
  let projectId;

  before(async () => {
    const res = await request('POST', '/api/projects/create', {
      name: 'compression-records-project',
      stack: 'node',
    }, { Authorization: `Bearer ${authToken}` });
    projectId = res.body.project.id;
    // Trigger a compression job so there is at least one record
    await request('POST', '/api/compression/compress', {
      projectId,
      force: true,
    }, { Authorization: `Bearer ${authToken}` });
  });

  test('returns 401 without auth token', async () => {
    const res = await request('GET', `/api/compression/${projectId}`);
    assert.equal(res.status, 401);
  });

  test('returns 404 for nonexistent project', async () => {
    const res = await request('GET', '/api/compression/proj_nonexistent', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 404);
  });

  test('returns compression records for a valid project', async () => {
    const res = await request('GET', `/api/compression/${projectId}`, null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.projectId, projectId);
    assert.ok(Array.isArray(res.body.records));
    assert.ok(res.body.records.length >= 1);
    assert.ok(res.body.records[0].id);
    assert.ok(res.body.records[0].status);
  });
});

// ─── Infrastructure API ───────────────────────────────────────────────────────

describe('GET /api/infrastructure/plans', () => {
  test('returns list of tower plans without authentication', async () => {
    const res = await request('GET', '/api/infrastructure/plans');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.plans));
    const planIds = res.body.plans.map(p => p.id);
    assert.ok(planIds.includes('micro'));
    assert.ok(planIds.includes('standard'));
    assert.ok(planIds.includes('pro'));
    assert.ok(planIds.includes('enterprise'));
    assert.ok(typeof res.body.provisionTimeDays === 'number');
  });
});

describe('GET /api/infrastructure/towers', () => {
  test('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/infrastructure/towers');
    assert.equal(res.status, 401);
  });

  test('returns list of towers for authenticated user', async () => {
    const res = await request('GET', '/api/infrastructure/towers', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.towers));
  });
});

describe('POST /api/infrastructure/towers', () => {
  test('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/infrastructure/towers', { plan: 'micro' });
    assert.equal(res.status, 401);
  });

  test('returns 400 when plan is missing', async () => {
    const res = await request('POST', '/api/infrastructure/towers', {}, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('returns 400 for invalid plan', async () => {
    const res = await request('POST', '/api/infrastructure/towers', {
      plan: 'super-ultra-mega',
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('returns 400 for invalid region', async () => {
    const res = await request('POST', '/api/infrastructure/towers', {
      plan: 'micro',
      region: 'mars-1',
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('provisions a micro tower successfully', async () => {
    const res = await request('POST', '/api/infrastructure/towers', {
      plan: 'micro',
      region: 'us-east-1',
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 201);
    assert.ok(res.body.tower.id);
    assert.equal(res.body.tower.plan, 'micro');
    assert.equal(res.body.tower.region, 'us-east-1');
    assert.equal(res.body.tower.status, 'provisioning');
    assert.ok(res.body.tower.compressionEnabled);
    assert.ok(res.body.tower.autoScaleEnabled);
    assert.ok(typeof res.body.estimatedReadyDays === 'number');
  });

  test('provisions an enterprise tower successfully', async () => {
    const res = await request('POST', '/api/infrastructure/towers', {
      plan: 'enterprise',
    }, { Authorization: `Bearer ${authToken}` });
    assert.equal(res.status, 201);
    assert.equal(res.body.tower.plan, 'enterprise');
    assert.equal(res.body.tower.cpu, 32);
    assert.equal(res.body.tower.ramGB, 128);
  });
});

describe('GET /api/infrastructure/towers/:id', () => {
  let towerId;

  before(async () => {
    const res = await request('POST', '/api/infrastructure/towers', {
      plan: 'standard',
    }, { Authorization: `Bearer ${authToken}` });
    towerId = res.body.tower.id;
  });

  test('returns 401 without auth token', async () => {
    const res = await request('GET', `/api/infrastructure/towers/${towerId}`);
    assert.equal(res.status, 401);
  });

  test('returns 404 for nonexistent tower', async () => {
    const res = await request('GET', '/api/infrastructure/towers/tower_nonexistent', null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 404);
  });

  test('returns tower by id', async () => {
    const res = await request('GET', `/api/infrastructure/towers/${towerId}`, null, {
      Authorization: `Bearer ${authToken}`,
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.tower);
    assert.equal(res.body.tower.id, towerId);
    assert.equal(res.body.tower.plan, 'standard');
  });
});
