# Graph Report - .  (2026-05-23)

## Corpus Check
- 66 files · ~52,941 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 762 nodes · 856 edges · 51 communities (42 shown, 9 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.82)
- Token cost: 149,216 input · 63,951 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Server Package & Deps|Server Package & Deps]]
- [[_COMMUNITY_Mongoose Data Models|Mongoose Data Models]]
- [[_COMMUNITY_Trading Page|Trading Page]]
- [[_COMMUNITY_Market Data Route|Market Data Route]]
- [[_COMMUNITY_Client Package & Deps|Client Package & Deps]]
- [[_COMMUNITY_Platform Architecture|Platform Architecture]]
- [[_COMMUNITY_Expenses API Route|Expenses API Route]]
- [[_COMMUNITY_Frontend App Shell|Frontend App Shell]]
- [[_COMMUNITY_CAS PDF Parsing|CAS PDF Parsing]]
- [[_COMMUNITY_Trading Orders API|Trading Orders API]]
- [[_COMMUNITY_Auth Route & Supabase|Auth Route & Supabase]]
- [[_COMMUNITY_Credit Cards API|Credit Cards API]]
- [[_COMMUNITY_Core Domain Concepts|Core Domain Concepts]]
- [[_COMMUNITY_Stocks API Route|Stocks API Route]]
- [[_COMMUNITY_Portfolio Optimization|Portfolio Optimization]]
- [[_COMMUNITY_Expenses Page|Expenses Page]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_EOD Dashboard Page|EOD Dashboard Page]]
- [[_COMMUNITY_IPO API Route|IPO API Route]]
- [[_COMMUNITY_Credit Cards Page|Credit Cards Page]]
- [[_COMMUNITY_Server Entry Point|Server Entry Point]]
- [[_COMMUNITY_Upstox Service|Upstox Service]]
- [[_COMMUNITY_Chatbot Service|Chatbot Service]]
- [[_COMMUNITY_App Bootstrap & Settings|App Bootstrap & Settings]]
- [[_COMMUNITY_Auth Pages (LoginRegister)|Auth Pages (Login/Register)]]
- [[_COMMUNITY_ESLintBrowserslist Config|ESLint/Browserslist Config]]
- [[_COMMUNITY_Vercel Build Env|Vercel Build Env]]
- [[_COMMUNITY_Layout & MarketTicker|Layout & MarketTicker]]
- [[_COMMUNITY_Auth Context|Auth Context]]
- [[_COMMUNITY_PWA Manifest|PWA Manifest]]
- [[_COMMUNITY_CAS Upload Page|CAS Upload Page]]
- [[_COMMUNITY_Upstox Connect UI|Upstox Connect UI]]
- [[_COMMUNITY_NPM Scripts|NPM Scripts]]
- [[_COMMUNITY_Chatbot UI|Chatbot UI]]
- [[_COMMUNITY_Socket Context|Socket Context]]
- [[_COMMUNITY_Dashboard Page|Dashboard Page]]
- [[_COMMUNITY_Mutual Funds Page|Mutual Funds Page]]
- [[_COMMUNITY_User Model|User Model]]
- [[_COMMUNITY_API Entry (Vercel)|API Entry (Vercel)]]
- [[_COMMUNITY_React DnD Types|React DnD Types]]
- [[_COMMUNITY_IPO Page|IPO Page]]
- [[_COMMUNITY_Vercel Config|Vercel Config]]
- [[_COMMUNITY_IPO Schema|IPO Schema]]
- [[_COMMUNITY_Stock Schema|Stock Schema]]
- [[_COMMUNITY_ProfileSettings Pages|Profile/Settings Pages]]
- [[_COMMUNITY_Client TSConfig Doc|Client TSConfig Doc]]
- [[_COMMUNITY_PWA Manifest Doc|PWA Manifest Doc]]
- [[_COMMUNITY_Axios HTTP Doc|Axios HTTP Doc]]
- [[_COMMUNITY_Stock Model Doc|Stock Model Doc]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `useAuth()` - 15 edges
3. `Root App Component` - 10 edges
4. `ChatbotService` - 9 edges
5. `StockService` - 9 edges
6. `AuthContext / AuthProvider` - 9 edges
7. `api()` - 7 edges
8. `Express Server Entry` - 7 edges
9. `scripts` - 6 edges
10. `users table` - 6 edges

## Surprising Connections (you probably didn't know these)
- `FinanceHub Platform` --references--> `Chatbot Routes`  [EXTRACTED]
  README.md → server/routes/chatbot.js
- `FinanceHub Platform` --references--> `EOD Summary Routes`  [EXTRACTED]
  README.md → server/routes/eod.js
- `FinanceHub Platform` --references--> `Portfolio Routes`  [EXTRACTED]
  README.md → server/routes/portfolio.js
- `FinanceHub Platform` --references--> `Trading Routes`  [EXTRACTED]
  README.md → server/routes/trading.js
- `Client index.html shell` --references--> `FinanceHub Platform`  [INFERRED]
  client/public/index.html → README.md

## Hyperedges (group relationships)
- **Authentication Flow** — Login_page, AuthContext_provider, ProtectedRoute_component, api_route_auth, supabase_users_table [INFERRED 0.85]
- **CAS PDF Import to Portfolio** — CASUpload_page, api_route_cas, api_route_portfolio, supabase_portfolios_table [INFERRED 0.85]
- **App Shell (theme + providers + routing)** — App_component, AuthContext_provider, SocketContext_provider, Layout_component, ProtectedRoute_component [INFERRED 0.95]
- **Authenticated REST Flow** — middleware:auth, route:creditcards, route:expenses, route:ipo, lib:supabase [INFERRED 0.85]
- **Personal Finance Tracking Pages** — page:CreditCards, page:Expenses, page:Portfolio, page:MutualFunds [INFERRED 0.75]
- **Models Backed by Supabase** — model:CreditCard, model:Expense, model:IPO, lib:supabase [INFERRED 0.85]
- **Supabase-backed persistence layer** — route_auth, route_creditcards, route_expenses, route_portfolio, ext_supabase [EXTRACTED 1.00]
- **Upstox trading integration flow** — route_upstox, route_trading, svc_upstox, ext_upstox_api [EXTRACTED 1.00]
- **EOD dashboard aggregation** — route_eod, model_Portfolio, ext_yahoo, concept_demo_fallback [INFERRED 0.85]

## Communities (51 total, 9 thin omitted)

### Community 0 - "Server Package & Deps"
Cohesion: 0.05
Nodes (42): author, dependencies, axios, bcryptjs, chart.js, cors, csv-parser, dotenv (+34 more)

### Community 1 - "Mongoose Data Models"
Cohesion: 0.06
Nodes (25): creditCardSchema, mongoose, transactionSchema, expenseSchema, mongoose, mongoose, portfolioSchema, auth (+17 more)

### Community 2 - "Trading Page"
Cohesion: 0.06
Nodes (32): assets, auth, calcPerformance(), countries, d, data, days, { enrichHoldings } (+24 more)

### Community 3 - "Market Data Route"
Cohesion: 0.06
Nodes (28): jwt, auth, express, list, market, quotes, router, auth (+20 more)

### Community 4 - "Client Package & Deps"
Cohesion: 0.06
Nodes (34): dependencies, axios, date-fns, @emotion/react, @emotion/styled, framer-motion, @mui/icons-material, @mui/material (+26 more)

### Community 5 - "Platform Architecture"
Cohesion: 0.07
Nodes (34): CAS PDF Parsing, Demo Fallback Pattern, EOD Aggregated Summary, FinanceHub Platform, JWT Authentication, Client index.html shell, mfapi.in, NSE India API (+26 more)

### Community 6 - "Expenses API Route"
Cohesion: 0.06
Nodes (31): auth, CATEGORIES, categoryBreakdown, categoryMap, catMap, d, dailyMap, dailyTrend (+23 more)

### Community 7 - "Frontend App Shell"
Cohesion: 0.08
Nodes (33): Root App Component, React Query Client, MUI Theme (dark), AuthContext / AuthProvider, CAS Upload Page, Chatbot Drawer, App Layout / Nav, Login Page (+25 more)

### Community 8 - "CAS PDF Parsing"
Cohesion: 0.08
Nodes (29): auth, CAS_MIN_VALUE, dateRange, dedupeHoldings(), em, equities, escapePath(), { exec } (+21 more)

### Community 9 - "Trading Orders API"
Cohesion: 0.08
Nodes (25): auth, axios, charges, errors, express, { getQuote }, orders, payload (+17 more)

### Community 10 - "Auth Route & Supabase"
Cohesion: 0.07
Nodes (22): { createClient }, supabase, auth, bcrypt, express, jwt, router, supabase (+14 more)

### Community 11 - "Credit Cards API"
Cohesion: 0.07
Nodes (24): auth, balance, cardsData, end, express, fieldMap, limit, newLimit (+16 more)

### Community 12 - "Core Domain Concepts"
Cohesion: 0.12
Nodes (25): Personal Finance Tracking, JWT Authentication, Supabase Client, Auth Middleware, CreditCard Model, Expense Model, IPO Model, CreditCards Page (+17 more)

### Community 13 - "Stocks API Route"
Cohesion: 0.12
Nodes (14): auth, DEMO_SECTORS, express, router, stockService, sym, watchlists, axios (+6 more)

### Community 14 - "Portfolio Optimization"
Cohesion: 0.10
Nodes (18): actionConfig, formatCurrency(), healthColor(), HealthRing(), HealthRingProps, MarketOpportunity, Optimization(), OptimizationData (+10 more)

### Community 15 - "Expenses Page"
Cohesion: 0.10
Nodes (15): BudgetItem, CATEGORIES, Category, CATEGORY_COLORS, CATEGORY_ICONS, CategoryBreakdown, DailySpend, Expense (+7 more)

### Community 16 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+10 more)

### Community 17 - "EOD Dashboard Page"
Cohesion: 0.12
Nodes (15): CATEGORY_COLORS, CreditCardSummary, EODAlert, EODDashboard(), EODSummary, ExpenseSummary, formatCurrency(), formatDate() (+7 more)

### Community 18 - "IPO API Route"
Cohesion: 0.11
Nodes (15): allIpos, auth, comparison, cutoff, demo, DEMO_IPOS, express, fetchNse() (+7 more)

### Community 19 - "Credit Cards Page"
Cohesion: 0.14
Nodes (14): CARD_TYPES, CardFormData, CreditCardData, CreditCards(), CreditCardVisual(), CreditCardVisualProps, daysUntil(), formatCurrency() (+6 more)

### Community 20 - "Server Entry Point"
Cohesion: 0.12
Nodes (14): app, buildPath, cors, dotenv, express, fs, helmet, http (+6 more)

### Community 21 - "Upstox Service"
Cohesion: 0.19
Nodes (11): api(), axios, exchangeToken(), getAuthUrl(), getFunds(), getHoldings(), getOrderHistory(), getPositions() (+3 more)

### Community 22 - "Chatbot Service"
Cohesion: 0.16
Nodes (5): auth, ChatbotService, express, OpenAI, router

### Community 23 - "App Bootstrap & Settings"
Cohesion: 0.17
Nodes (5): AuthProvider(), queryClient, theme, root, Stock

### Community 24 - "Auth Pages (Login/Register)"
Cohesion: 0.23
Nodes (8): Login(), LoginFormData, ProtectedRoute(), ProtectedRouteProps, Register(), RegisterFormData, useAuth(), Profile()

### Community 25 - "ESLint/Browserslist Config"
Cohesion: 0.20
Nodes (9): browserslist, development, production, eslintConfig, extends, name, private, proxy (+1 more)

### Community 26 - "Vercel Build Env"
Cohesion: 0.20
Nodes (9): build, env, buildCommand, CI, NPM_CONFIG_PRODUCTION, installCommand, outputDirectory, rewrites (+1 more)

### Community 27 - "Layout & MarketTicker"
Cohesion: 0.22
Nodes (6): groupAccent, groupLabels, Layout(), LayoutProps, menuItems, IndexData

### Community 28 - "Auth Context"
Cohesion: 0.22
Nodes (7): AuthAction, AuthContext, AuthContextType, AuthState, initialState, RegisterData, User

### Community 29 - "PWA Manifest"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 30 - "CAS Upload Page"
Cohesion: 0.33
Nodes (6): CASResult, CASUpload(), EquityHolding, formatCurrency(), MFHolding, PortfolioOption

### Community 31 - "Upstox Connect UI"
Cohesion: 0.33
Nodes (3): Portfolio, Holding, Props

### Community 32 - "NPM Scripts"
Cohesion: 0.40
Nodes (5): scripts, build, eject, start, test

### Community 33 - "Chatbot UI"
Cohesion: 0.40
Nodes (4): Chatbot(), ChatbotProps, Message, QuickAction

### Community 34 - "Socket Context"
Cohesion: 0.40
Nodes (3): SocketContext, SocketContextType, SocketProvider()

### Community 35 - "Dashboard Page"
Cohesion: 0.40
Nodes (3): IPOData, MarketData, PortfolioSummary

### Community 37 - "User Model"
Cohesion: 0.40
Nodes (4): bcrypt, mongoose, user, userSchema

### Community 38 - "API Entry (Vercel)"
Cohesion: 0.50
Nodes (3): app, cors, express

### Community 39 - "React DnD Types"
Cohesion: 0.50
Nodes (4): devDependencies, @types/react-beautiful-dnd, @types/react-window, @types/react-window-infinite-loader

### Community 41 - "Vercel Config"
Cohesion: 0.50
Nodes (3): buildCommand, framework, outputDirectory

## Knowledge Gaps
- **473 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+468 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `name`, `version`, `description` to the rest of the system?**
  _474 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Server Package & Deps` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `Mongoose Data Models` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `Trading Page` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `Market Data Route` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `Client Package & Deps` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `Platform Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.07308377896613191 - nodes in this community are weakly interconnected._