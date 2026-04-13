// Vercel serverless entry point — standalone Express app (no socket.io)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests, please try again later.'
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

function safeRoute(path, routeFile) {
  try {
    app.use(path, require(routeFile));
  } catch (err) {
    console.error(`Failed to load route ${path}:`, err.message);
    app.use(path, (_req, res) =>
      res.status(503).json({ message: `${path} is temporarily unavailable` })
    );
  }
}

safeRoute('/api/auth',        '../server/routes/auth');
safeRoute('/api/stocks',      '../server/routes/stocks');
safeRoute('/api/portfolio',   '../server/routes/portfolio');
safeRoute('/api/mutualfunds', '../server/routes/mutualfunds');
safeRoute('/api/ipo',         '../server/routes/ipo');
safeRoute('/api/chatbot',     '../server/routes/chatbot');
safeRoute('/api/trading',     '../server/routes/trading');
safeRoute('/api/expenses',    '../server/routes/expenses');
safeRoute('/api/creditcards', '../server/routes/creditcards');
safeRoute('/api/eod',         '../server/routes/eod');
safeRoute('/api/optimization','../server/routes/optimization');

app.get('/api', (_req, res) => {
  res.json({ message: 'FinanceHub API is running', mode: 'demo' });
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;
