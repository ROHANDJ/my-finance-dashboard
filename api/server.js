'use strict';
const express = require('express');
const cors    = require('cors');

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── static requires so ncc/webpack can bundle all dependencies ── */

try { app.use('/api/auth',         require('../server/routes/auth'));         } catch (e) { console.error('auth failed:', e.message);         app.use('/api/auth',         (q,s) => s.status(503).json({ error: e.message })); }
try { app.use('/api/stocks',       require('../server/routes/stocks'));       } catch (e) { console.error('stocks failed:', e.message);       app.use('/api/stocks',       (q,s) => s.status(503).json({ error: e.message })); }
try { app.use('/api/portfolio',    require('../server/routes/portfolio'));    } catch (e) { console.error('portfolio failed:', e.message);    app.use('/api/portfolio',    (q,s) => s.status(503).json({ error: e.message })); }
try { app.use('/api/mutualfunds',  require('../server/routes/mutualfunds'));  } catch (e) { console.error('mutualfunds failed:', e.message);  app.use('/api/mutualfunds',  (q,s) => s.status(503).json({ error: e.message })); }
try { app.use('/api/ipo',          require('../server/routes/ipo'));          } catch (e) { console.error('ipo failed:', e.message);          app.use('/api/ipo',          (q,s) => s.status(503).json({ error: e.message })); }
try { app.use('/api/chatbot',      require('../server/routes/chatbot'));      } catch (e) { console.error('chatbot failed:', e.message);      app.use('/api/chatbot',      (q,s) => s.status(503).json({ error: e.message })); }
try { app.use('/api/trading',      require('../server/routes/trading'));      } catch (e) { console.error('trading failed:', e.message);      app.use('/api/trading',      (q,s) => s.status(503).json({ error: e.message })); }
try { app.use('/api/expenses',     require('../server/routes/expenses'));     } catch (e) { console.error('expenses failed:', e.message);     app.use('/api/expenses',     (q,s) => s.status(503).json({ error: e.message })); }
try { app.use('/api/creditcards',  require('../server/routes/creditcards'));  } catch (e) { console.error('creditcards failed:', e.message);  app.use('/api/creditcards',  (q,s) => s.status(503).json({ error: e.message })); }
try { app.use('/api/eod',          require('../server/routes/eod'));          } catch (e) { console.error('eod failed:', e.message);          app.use('/api/eod',          (q,s) => s.status(503).json({ error: e.message })); }
try { app.use('/api/optimization', require('../server/routes/optimization')); } catch (e) { console.error('optimization failed:', e.message); app.use('/api/optimization', (q,s) => s.status(503).json({ error: e.message })); }
try { app.use('/api/cas',          require('../server/routes/cas'));          } catch (e) { console.error('cas failed:', e.message, e.stack); app.use('/api/cas', (q,s) => s.status(503).json({ error: e.message, stack: e.stack })); }

app.get('/api/debug', (_q, s) => s.json({ status: 'ok', ts: new Date().toISOString() }));
app.get('/api',       (_q, s) => s.json({ message: 'FinanceHub API running' }));

app.use((err, _q, s, _n) => { console.error(err.stack); s.status(500).json({ message: err.message }); });

module.exports = app;
