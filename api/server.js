const express = require('express');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const deployRoutes = require('./routes/deploy');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/deploy', deployRoutes);

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
