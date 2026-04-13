// Vercel serverless entry point
'use strict';
const express = require('express');
const cors = require('cors');

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug: report what loaded successfully
const loadedRoutes = [];
const failedRoutes = [];

function safeRoute(mountPath, filePath) {
  try {
    const router = require(filePath);
    app.use(mountPath, router);
    loadedRoutes.push(mountPath);
  } catch (err) {
    failedRoutes.push({ path: mountPath, error: err.message });
    console.error(`[safeRoute] FAILED ${mountPath}: ${err.message}`);
    app.use(mountPath, (_req, res) =>
      res.status(503).json({ message: `${mountPath} unavailable`, error: err.message })
    );
  }
}

safeRoute('/api/auth',         '../server/routes/auth');
safeRoute('/api/stocks',       '../server/routes/stocks');
safeRoute('/api/portfolio',    '../server/routes/portfolio');
safeRoute('/api/mutualfunds',  '../server/routes/mutualfunds');
safeRoute('/api/ipo',          '../server/routes/ipo');
safeRoute('/api/chatbot',      '../server/routes/chatbot');
safeRoute('/api/trading',      '../server/routes/trading');
safeRoute('/api/expenses',     '../server/routes/expenses');
safeRoute('/api/creditcards',  '../server/routes/creditcards');
safeRoute('/api/eod',          '../server/routes/eod');
safeRoute('/api/optimization', '../server/routes/optimization');

app.get('/api/debug', (_req, res) => {
  res.json({ loaded: loadedRoutes, failed: failedRoutes });
});

app.get('/api', (_req, res) => {
  res.json({ message: 'FinanceHub API running', loaded: loadedRoutes.length, failed: failedRoutes.length });
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal error', error: err.message });
});

module.exports = app;
