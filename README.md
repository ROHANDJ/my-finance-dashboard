# FinanceHub — All-in-One Financial Management Platform

A full-stack web application to manage your entire financial life in one place: US & Indian stock markets, portfolio analytics, expense tracking, credit card management, profit optimization, and end-of-day summaries.

---

## Live Demo

> Deploy to Vercel (see [Deployment](#deployment)) and add your live URL here.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Roadmap](#roadmap)

---

## Features

### Investments & Markets
| Feature | Description |
|---|---|
| **US Market** | Live quotes, charts, movers (Finnhub API) |
| **Indian Market** | NSE/BSE stocks via Yahoo Finance |
| **Portfolio Tracker** | Multiple portfolios, P&L, realized/unrealized gains |
| **Portfolio Optimizer** | AI-driven rebalancing, tax-loss harvesting, market opportunities |
| **Mutual Funds** | Search, compare, SIP calculator, historical NAV |
| **IPO Calendar** | Upcoming, open, listed IPOs for India & US |
| **Live Trading** | Order placement via Kite Connect (Indian market) |
| **AI Chatbot** | GPT-powered financial advisor in-app |
| **Watchlist** | Save and monitor favourite stocks |

### Personal Finance
| Feature | Description |
|---|---|
| **Expense Tracker** | Add expenses by category, daily/monthly analytics, budget alerts |
| **Credit Card Manager** | Manage multiple cards, track transactions, due-date reminders |
| **EOD Dashboard** | End-of-day snapshot: portfolio, expenses, markets, insights |
| **Daily Spending Trends** | Bar charts, category breakdowns, 30-day trends |
| **Budget Planning** | Set per-category budgets, track vs actual |

### Platform
- JWT-based authentication with protected routes
- Real-time stock updates via Socket.io
- Responsive design (mobile + desktop)
- MUI theming with customizable palette
- Toast notifications for all actions
- Rate limiting + Helmet security headers

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| UI Library | Material-UI (MUI) v5 |
| Routing | React Router v6 |
| Data Fetching | React Query (TanStack Query v3) |
| Charts | Recharts |
| Real-time | Socket.io-client |
| State | Zustand (global), React Hook Form (forms) |
| HTTP | Axios |
| Notifications | react-hot-toast |
| Helmet | react-helmet-async |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | MongoDB + Mongoose (demo: in-memory) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Real-time | Socket.io |
| Security | Helmet, express-rate-limit, CORS |
| Scheduling | node-cron |
| Email | Nodemailer (SMTP) |
| SMS | Twilio |
| File Upload | Multer + csv-parser |

### External APIs
| API | Purpose | Free Tier |
|---|---|---|
| [Finnhub](https://finnhub.io) | US stock quotes, search, movers | 60 req/min |
| [Yahoo Finance](https://github.com/gadicc/node-yahoo-finance2) | Indian stocks, historical data | Unlimited |
| [Alpha Vantage](https://www.alphavantage.co) | Backup US market data | 5 req/min |
| [Kite Connect](https://kite.trade) | Indian live trading | Paid |
| [OpenAI](https://openai.com) | AI chatbot & insights | Pay per token |
| [AMFI](https://www.amfiindia.com) | Mutual fund NAV data | Free |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React SPA)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │Dashboard │ │Portfolio │ │Expenses  │ │CreditCards │  │
│  │EOD Summ. │ │Optimizer │ │  Stocks  │ │ Mutual Fds │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘  │
│  React Query + Axios (HTTP)  Socket.io-client (WS)        │
└──────────────────────────────│──────────────────────────┘
                               │ HTTP / WebSocket
┌──────────────────────────────▼──────────────────────────┐
│                    Express.js Server                       │
│  /api/auth  /api/stocks  /api/portfolio  /api/trading     │
│  /api/expenses  /api/creditcards  /api/eod               │
│  /api/optimization  /api/mutualfunds  /api/ipo            │
│  /api/chatbot                                             │
│  ──────────────────────────────────────────────          │
│  JWT Auth Middleware  ─►  req.userId on every route       │
│  ──────────────────────────────────────────────          │
│  MongoDB (Mongoose)      External APIs                     │
│  User, Portfolio,        Finnhub / Yahoo Finance          │
│  Expense, CreditCard,    OpenAI / AMFI / Kite             │
│  Stock, IPO schemas      Alpha Vantage                    │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Auth**: User logs in → JWT stored in `localStorage` → sent as `Authorization: Bearer <token>` on every API call
2. **Stock Prices**: Server fetches from Finnhub (US) / Yahoo Finance (India) → broadcasts via Socket.io every 30s
3. **Portfolio P&L**: `holdings × currentPrice − holdings × avgPrice` = unrealized P&L; sell transactions tracked separately for realized P&L
4. **EOD Dashboard**: `/api/eod/summary` aggregates portfolio + expenses + credit card dues + live market indices at request time, generates dynamic insights
5. **Expenses**: Stored per-user; `/summary` computes totals, category breakdown, 30-day daily trend
6. **Credit Cards**: Balance auto-recalculates on every `POST`/`DELETE` transaction

---

## Project Structure

```
financehub/
├── client/                          # React frontend (TypeScript)
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── Auth/ProtectedRoute.tsx
│       │   ├── Chatbot/Chatbot.tsx
│       │   └── Layout/Layout.tsx    # Sidebar + AppBar with grouped nav
│       ├── contexts/
│       │   ├── AuthContext.tsx       # JWT auth state + user profile
│       │   └── SocketContext.tsx     # Socket.io real-time connection
│       ├── pages/
│       │   ├── Auth/                 # Login, Register
│       │   ├── Dashboard/            # Main overview (markets + portfolio)
│       │   ├── EODDashboard/         # End-of-day summary ← NEW
│       │   ├── Portfolio/            # Holdings, P&L, allocation charts
│       │   ├── Optimization/         # AI profit optimizer ← NEW
│       │   ├── Stocks/               # US + Indian stock explorer
│       │   ├── MutualFunds/          # Fund search + SIP calculator
│       │   ├── IPO/                  # IPO calendar + subscription analysis
│       │   ├── Trading/              # Live order placement (Kite)
│       │   ├── Expenses/             # Daily expense tracker ← NEW
│       │   ├── CreditCards/          # Card manager + transactions ← NEW
│       │   ├── Profile/
│       │   └── Settings/
│       ├── App.tsx                   # Routes + MUI theme + providers
│       └── index.tsx
│
├── server/                          # Node.js + Express backend
│   ├── middleware/
│   │   └── auth.js                  # JWT verify → sets req.userId
│   ├── models/                      # Mongoose schemas (for MongoDB)
│   │   ├── User.js
│   │   ├── Portfolio.js
│   │   ├── Stock.js
│   │   ├── IPO.js
│   │   ├── Expense.js               # ← NEW
│   │   └── CreditCard.js            # ← NEW
│   ├── routes/
│   │   ├── auth.js                  # Register/login/profile
│   │   ├── stocks.js                # Quotes, search, watchlist, movers
│   │   ├── portfolio.js             # CRUD + P&L + risk metrics
│   │   ├── trading.js               # Kite Connect integration
│   │   ├── mutualfunds.js           # AMFI + SIP calculator
│   │   ├── ipo.js                   # IPO calendar + analysis
│   │   ├── chatbot.js               # OpenAI GPT chat
│   │   ├── expenses.js              # Expense CRUD + analytics ← NEW
│   │   ├── creditcards.js           # Card CRUD + transactions ← NEW
│   │   ├── eod.js                   # EOD aggregation endpoint ← NEW
│   │   └── optimization.js          # Portfolio optimizer ← NEW
│   ├── services/
│   │   └── stockService.js          # Finnhub + Yahoo Finance clients
│   └── index.js                     # Express app + Socket.io server
│
├── .env.example
├── .gitignore
├── package.json                     # Root: dev/build/start scripts
└── README.md
```

---

## API Reference

### Authentication `/api/auth`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Create account |
| POST | `/login` | No | Returns JWT token |
| GET | `/profile` | Yes | Get user profile |
| PUT | `/profile` | Yes | Update profile |
| POST | `/change-password` | Yes | Change password |
| POST | `/add-account` | Yes | Link trading account |

### Stocks `/api/stocks`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/quote/:symbol` | Live quote for US or Indian stock |
| GET | `/historical/:symbol?period=1Y&market=IN` | OHLCV history |
| GET | `/search?q=RELIANCE&market=IN` | Search across markets |
| GET | `/movers?market=US` | Top gainers/losers |
| GET | `/indices` | NIFTY, SENSEX, S&P 500, Nasdaq |
| GET/POST/DELETE | `/watchlist` | Manage watchlist |

### Portfolio `/api/portfolio`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List portfolios |
| POST | `/` | Create portfolio |
| GET | `/:id` | Get with live prices |
| POST | `/:id/holdings` | Add holding (buy) |
| PUT | `/:id/holdings/:symbol` | Update holding |
| DELETE | `/:id/holdings/:symbol` | Remove holding |
| POST | `/:id/sell` | Record sell transaction |
| GET | `/:id/performance?period=1Y` | Historical performance |
| GET | `/:id/allocation` | Sector/country/asset split |
| GET | `/:id/risk-metrics` | Beta, volatility, Sharpe |

### Expenses `/api/expenses`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List (filters: startDate, endDate, category, search) |
| POST | `/` | `{ amount, category, description, date, paymentMethod, tags }` |
| PUT | `/:id` | Update expense |
| DELETE | `/:id` | Delete expense |
| GET | `/summary` | Today/week/month totals + categoryBreakdown + dailyTrend |
| GET | `/eod` | Today's expense snapshot for EOD dashboard |
| GET | `/categories` | All 8 categories with icons, colors, emoji |

### Credit Cards `/api/creditcards`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | All cards |
| POST | `/` | Add card `{ bankName, cardName, last4Digits, cardType, creditLimit, ... }` |
| PUT | `/:id` | Update card |
| DELETE | `/:id` | Delete card |
| GET | `/:id/transactions` | Transactions (filter: type, category, startDate) |
| POST | `/:id/transactions` | Add transaction (auto-updates balance) |
| DELETE | `/:id/transactions/:txnId` | Remove transaction |
| GET | `/summary` | Total limit/used/available + utilizationPct + upcomingDues |

### EOD Dashboard `/api/eod`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/summary` | Full EOD object: portfolio + expenses + credit cards + market indices + dynamic insights + alerts |

### Optimization `/api/optimization`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/suggestions` | healthScore, riskScore, suggestions[], rebalancing[], taxOptimization[], marketOpportunities[] |

### Other
| Endpoint | Description |
|---|---|
| `GET /api/mutualfunds/search?q=hdfc` | Search mutual funds |
| `GET /api/mutualfunds/sip-calculator` | SIP future value |
| `GET /api/ipo/calendar/upcoming` | Upcoming IPOs |
| `POST /api/trading/order` | Place order (Kite Connect) |
| `POST /api/chatbot/chat` | AI chat message |

---

## Database Schema

### Expense
```js
{
  userId: ObjectId,
  amount: Number,
  category: 'food' | 'transport' | 'shopping' | 'entertainment' | 'utilities' | 'health' | 'education' | 'other',
  description: String,
  date: Date,
  paymentMethod: 'cash' | 'card' | 'upi' | 'netbanking',
  tags: [String],
  isRecurring: Boolean,
  recurringType: 'daily' | 'weekly' | 'monthly',
  createdAt: Date
}
```

### CreditCard
```js
{
  userId: ObjectId,
  bankName: String,
  cardName: String,
  last4Digits: String,
  cardType: 'visa' | 'mastercard' | 'rupay' | 'amex',
  creditLimit: Number,
  availableCredit: Number,
  currentBalance: Number,
  billingCycleDate: Number,   // day of month (1-31)
  dueDate: Number,             // day of month (1-31)
  minimumPayment: Number,
  totalSpent: Number,
  color: String,               // hex color for UI
  isActive: Boolean,
  transactions: [{
    amount: Number,
    description: String,
    category: String,
    date: Date,
    type: 'debit' | 'credit',
    merchantName: String
  }]
}
```

### Portfolio (existing)
```js
{
  userId: ObjectId,
  name: String,
  accountType: 'us' | 'indian',
  holdings: [{ symbol, name, type, quantity, averagePrice, currentPrice,
               currency, sector, country, exchange, purchaseDate }],
  transactions: [{ type, symbol, quantity, price, currency, date, fees, taxes }],
  performance: { totalInvested, currentValue, totalReturns, totalReturnsPercentage,
                 dayChange, dayChangePercentage, totalDividends },
  risk: { beta, volatility, sharpeRatio, maxDrawdown }
}
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=5000
NODE_ENV=development

# Database (Supabase — required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Authentication (REQUIRED)
JWT_SECRET=your_super_secret_key_change_this_in_production
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Stock Market APIs
FINNHUB_API_KEY=your_finnhub_key          # https://finnhub.io (free tier)
ALPHA_VANTAGE_API_KEY=your_av_key         # https://www.alphavantage.co (free)

# Indian Trading (optional)
KITE_API_KEY=your_kite_api_key
KITE_API_SECRET=your_kite_api_secret

# AI Features (optional — chatbot will be disabled without this)
OPENAI_API_KEY=your_openai_api_key

# Email Notifications (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password        # Use App Password, not real password

# SMS Alerts (optional)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

> **Demo Mode**: The app runs fully without any API keys. All data is pre-seeded in-memory for demonstration purposes.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- MongoDB (optional — app works without it in demo mode)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/financehub.git
cd financehub

# Install root + server dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Set up environment variables
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET
```

### Running Locally

```bash
# Start both server (port 5000) and client (port 3000) concurrently
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

**Default demo credentials**: Register any account — no email verification required in demo mode.

### Running Separately

```bash
npm run server   # Backend on :5000
npm run client   # Frontend on :3000
```

---

## Deployment

### Vercel + Railway (Recommended Free Setup)

**Step 1: Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/financehub.git
git push -u origin main
```

**Step 2: Deploy Backend to Railway**
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo, set root to `/` (not `/client`)
3. Add env variables from `.env`
4. Railway auto-detects `npm start` script
5. Copy the generated Railway URL

**Step 3: Deploy Frontend to Vercel**
1. Go to [vercel.com](https://vercel.com) → New Project → Import GitHub repo
2. Set **Root Directory** to `client`
3. Add env variable: `REACT_APP_API_URL=https://your-railway-url.railway.app`
4. Deploy

**Step 4: Update CORS**

In `server/index.js`, update the Socket.io CORS origin to your Vercel URL:
```js
const io = socketIo(server, {
  cors: { origin: "https://your-app.vercel.app", methods: ["GET", "POST"] }
});
```

### Enable Supabase (Production)

1. Create a project at [Supabase](https://supabase.com)
2. Run the SQL in `supabase_migration.sql` via the Supabase SQL editor
3. Copy the project URL and service-role key from Settings → API
4. Add to Railway env: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

---

## Roadmap

### v1.1
- [ ] Add Fyers broker integration (alternative to Upstox)
- [ ] Email alerts for credit card due dates
- [ ] Export expenses to CSV
- [ ] Import bank/card statements via CSV

### v1.2
- [ ] Dark mode toggle
- [ ] Multi-currency support (INR/USD/EUR)
- [ ] Recurring expense auto-entry
- [ ] Net worth tracker

### v1.3
- [ ] Technical indicators (RSI, MACD, Bollinger Bands)
- [ ] Options chain viewer
- [ ] STCG/LTCG tax report PDF export
- [ ] UPI payment integration for card payments

### v2.0
- [ ] React Native mobile app
- [ ] Open Banking API (auto bank sync)
- [ ] Advanced GPT-4 portfolio advisor
- [ ] Social features (share portfolio performance)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT License

---

## Acknowledgements

- [Finnhub.io](https://finnhub.io) — US market data
- [Yahoo Finance](https://github.com/gadicc/node-yahoo-finance2) — Indian market data
- [Material-UI](https://mui.com) — React UI components
- [Recharts](https://recharts.org) — Chart library
- [Kite Connect](https://kite.trade) — Indian trading API
