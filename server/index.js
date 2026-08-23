const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});

app.set('trust proxy', 1);
app.use(helmet());
app.use(limiter);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Verify Supabase credentials are set
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
} else {
  console.log('Supabase configured:', process.env.SUPABASE_URL);
}

function safeRoute(path, routeFile) {
  try {
    app.use(path, require(routeFile));
    console.log(`Route loaded: ${path}`);
  } catch (err) {
    console.error(`Failed to load route ${path}:`, err.message);
    app.use(path, (req, res) => res.status(503).json({ message: `${path} is temporarily unavailable` }));
  }
}

safeRoute('/api/auth',        './routes/auth');
safeRoute('/api/stocks',      './routes/stocks');
safeRoute('/api/portfolio',   './routes/portfolio');
safeRoute('/api/mutualfunds', './routes/mutualfunds');
safeRoute('/api/ipo',         './routes/ipo');
safeRoute('/api/chatbot',     './routes/chatbot');
safeRoute('/api/trading',     './routes/trading');
safeRoute('/api/expenses',    './routes/expenses');
safeRoute('/api/creditcards', './routes/creditcards');
safeRoute('/api/eod',         './routes/eod');
safeRoute('/api/optimization','./routes/optimization');
safeRoute('/api/cas',         './routes/cas');
safeRoute('/api/market',      './routes/market');
safeRoute('/api/dhan',        './routes/dhan');

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('subscribe-stocks', (symbols) => {
    symbols.forEach(symbol => {
      socket.join(symbol);
    });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve React frontend in production (Railway)
const path = require('path');
const fs = require('fs');
const buildPath = path.join(__dirname, '../client/build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'Stock Portfolio Analyzer API is running' });
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Only listen when running directly (not in Vercel serverless)
if (process.env.VERCEL !== '1') {
  server.listen(PORT)
    .on('listening', () => {
      console.log(`Server running on port ${PORT}`);
    })
    .on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Kill the process using it or set the PORT environment variable to a different port.`);
      } else {
        console.error('Server error:', err);
      }
      // Exit so process managers (nodemon) can restart cleanly
      process.exit(1);
    });
}

module.exports = app;
