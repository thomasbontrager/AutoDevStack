const express = require('express');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const deployRoutes = require('./routes/deploy');
const billingRoutes = require('./routes/billing');
const storageRoutes = require('./routes/storage');
const towersRoutes = require('./routes/towers');
const domainsRoutes = require('./routes/domains');

const app = express();
const PORT = process.env.PORT || 4000;

// Stripe webhooks require the raw body — mount BEFORE express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/deploy', deployRoutes);
app.use('/api/billing', billingRoutes);
dapp.use('/api/storage', storageRoutes);
app.use('/api/towers', towersRoutes);
app.use('/api/domains', domainsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`AutoDevStack API running on http://localhost:${PORT}`);
    console.log('Default credentials: admin / admin123');
  });
}

module.exports = app;
