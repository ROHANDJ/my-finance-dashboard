const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');
const getJwtSecret = require('../lib/jwtSecret');
const { isMailConfigured, sendMail } = require('../lib/mailer');
const router = express.Router();

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

function userToJSON(u) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    phone: u.phone,
    panCard: u.pan_card,
    preferences: u.preferences,
    subscription: u.subscription,
    isActive: u.is_active,
    lastLogin: u.last_login,
    createdAt: u.created_at
  };
}

// ---------------------------------------------------------------------------
// Validation + helpers
// ---------------------------------------------------------------------------
const EMAIL_RE    = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
const PHONE_RE    = /^[0-9]{10}$/;
const PAN_RE      = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const MIN_PASSWORD = 6;

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 min

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again in a few minutes' },
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many reset requests, please try again later' },
});

const isValidEmail = (v) => typeof v === 'string' && EMAIL_RE.test(v);
const isValidPassword = (v) => typeof v === 'string' && v.length >= MIN_PASSWORD;

function signToken(userId) {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '7d' });
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Base URL used in reset-password links. Never derived from request headers,
// since a spoofed Host header would let an attacker redirect the reset link.
function getAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return 'http://localhost:3000';
}

function resetEmail(name, link) {
  const text =
    `Hi ${name},\n\n` +
    `We received a request to reset your FinanceHub password. Open the link below to choose a new one:\n\n` +
    `${link}\n\n` +
    `This link expires in 30 minutes and can only be used once. ` +
    `If you didn't request this, you can ignore this email — your password won't change.`;

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1e293b">
    <h2 style="margin:0 0 16px;color:#4f46e5">Reset your password</h2>
    <p>Hi ${name},</p>
    <p>We received a request to reset your FinanceHub password. Click the button below to choose a new one.</p>
    <p style="margin:28px 0">
      <a href="${link}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a>
    </p>
    <p style="font-size:13px;color:#64748b">This link expires in 30 minutes and can only be used once.
    If you didn't request this, ignore this email — your password won't change.</p>
    <p style="font-size:12px;color:#94a3b8;word-break:break-all">${link}</p>
  </div>`;

  return { text, html };
}

// ---------------------------------------------------------------------------
// POST /register
// ---------------------------------------------------------------------------
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, phone } = req.body;
    const panCard = typeof req.body.panCard === 'string' ? req.body.panCard.trim().toUpperCase() : '';

    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
      return res.status(400).json({ message: 'Username must be 3-30 letters, numbers or underscores' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters` });
    }
    if (phone && !PHONE_RE.test(phone)) {
      return res.status(400).json({ message: 'Phone number must be 10 digits' });
    }
    if (panCard && !PAN_RE.test(panCard)) {
      return res.status(400).json({ message: 'Invalid PAN card format' });
    }

    // Values are validated above, so they can't inject extra filter clauses.
    let orClause = `email.eq.${email.toLowerCase()},username.eq.${username}`;
    if (panCard) orClause += `,pan_card.eq.${panCard}`;

    const { data: existing, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .or(orClause)
      .limit(1);

    if (lookupError) throw lookupError;

    if (existing && existing.length > 0) {
      return res.status(400).json({ message: 'User with this email, username, or PAN card already exists' });
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        username,
        email: email.toLowerCase(),
        password_hash,
        first_name: firstName || '',
        last_name: lastName || '',
        phone: phone || '',
        pan_card: panCard
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'User registered successfully', token: signToken(user.id), user: userToJSON(user) });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ message: 'User with this email, username, or PAN card already exists' });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email) || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    // Without this, a database outage looked like "No account found".
    if (error) throw error;

    if (!user) {
      return res.status(401).json({ message: 'No account found with this email' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    res.json({ message: 'Login successful', token: signToken(user.id), user: userToJSON(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ---------------------------------------------------------------------------
// POST /forgot-password — emails a single-use reset link.
// Always answers the same way whether or not the email exists, so it can't
// be used to discover which emails have accounts.
// ---------------------------------------------------------------------------
router.post('/forgot-password', resetLimiter, async (req, res) => {
  const genericResponse = { message: 'If an account exists for that email, a reset link has been sent.' };

  try {
    const { email } = req.body;
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (!isMailConfigured()) {
      console.error('Forgot password: EMAIL_HOST / EMAIL_USER / EMAIL_PASS are not set');
      return res.status(503).json({ message: 'Password reset email is not available right now' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, username, is_active')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!user || !user.is_active) return res.json(genericResponse);

    const token = crypto.randomBytes(32).toString('hex');
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_token_hash: hashResetToken(token),
        reset_token_expires: new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString(),
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    const link = `${getAppUrl()}/reset-password?token=${token}`;
    const { text, html } = resetEmail(user.first_name || user.username, link);

    // Awaited on purpose: serverless functions freeze once the response is sent.
    await sendMail({ to: user.email, subject: 'Reset your FinanceHub password', text, html });

    res.json(genericResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Could not send reset email, please try again' });
  }
});

// ---------------------------------------------------------------------------
// POST /reset-password — sets a new password using the emailed token.
// ---------------------------------------------------------------------------
router.post('/reset-password', resetLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters` });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, reset_token_expires')
      .eq('reset_token_hash', hashResetToken(token))
      .maybeSingle();

    if (error) throw error;

    if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired' });
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash,
        reset_token_hash: null,
        reset_token_expires: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    res.json({ message: 'Password has been reset. You can now sign in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password' });
  }
});

// ---------------------------------------------------------------------------
// POST /dev-login — auto-provision + log in a fixed dev account.
// Disabled in production so this can never be exploited as a backdoor.
// ---------------------------------------------------------------------------
router.post('/dev-login', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    const email = 'dev@dev.com';
    const password = 'dev123';

    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!user) {
      const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const { data: created, error } = await supabase
        .from('users')
        .insert({
          username: 'dev',
          email,
          password_hash,
          first_name: 'Dev',
          last_name: 'User',
        })
        .select()
        .single();
      if (error) throw error;
      user = created;
    }

    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    res.json({ message: 'Dev login successful', token: signToken(user.id), user: userToJSON(user) });
  } catch (error) {
    console.error('Dev login error:', error);
    res.status(500).json({ message: 'Server error during dev login' });
  }
});

// ---------------------------------------------------------------------------
// GET /profile
// ---------------------------------------------------------------------------
router.get('/profile', auth, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.userId)
      .maybeSingle();

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user: userToJSON(user) });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// ---------------------------------------------------------------------------
// PUT /profile
// ---------------------------------------------------------------------------
router.put('/profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, phone, preferences } = req.body;
    const updates = { updated_at: new Date().toISOString() };

    if (firstName  !== undefined) updates.first_name = firstName;
    if (lastName   !== undefined) updates.last_name  = lastName;
    if (phone      !== undefined) updates.phone      = phone;
    if (preferences !== undefined) {
      const { data: existing } = await supabase
        .from('users').select('preferences').eq('id', req.userId).maybeSingle();
      updates.preferences = { ...(existing?.preferences || {}), ...preferences };
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.userId)
      .select()
      .single();

    if (error || !user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'Profile updated successfully', user: userToJSON(user) });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// ---------------------------------------------------------------------------
// POST /change-password
// ---------------------------------------------------------------------------
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (typeof currentPassword !== 'string' || !isValidPassword(newPassword)) {
      return res.status(400).json({ message: `New password must be at least ${MIN_PASSWORD} characters` });
    }

    const { data: user } = await supabase
      .from('users').select('password_hash').eq('id', req.userId).maybeSingle();

    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

    const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await supabase
      .from('users')
      .update({ password_hash, updated_at: new Date().toISOString() })
      .eq('id', req.userId);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Server error changing password' });
  }
});

// ---------------------------------------------------------------------------
// POST /add-account
// ---------------------------------------------------------------------------
router.post('/add-account', auth, async (req, res) => {
  try {
    const { type, broker, apiKey, apiSecret } = req.body;

    const { data: existing } = await supabase
      .from('brokerage_accounts')
      .select('id')
      .eq('user_id', req.userId)
      .eq('type', type)
      .eq('broker', broker)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ message: 'Account with this broker and market type already exists' });
    }

    await supabase.from('brokerage_accounts').insert({
      user_id: req.userId,
      type,
      broker,
      api_key: apiKey || null,
      api_secret: apiSecret || null,
      is_active: false
    });

    const { data: accounts } = await supabase
      .from('brokerage_accounts')
      .select('type, broker, is_active, created_at')
      .eq('user_id', req.userId);

    res.json({ message: 'Account added successfully', accounts: accounts || [] });
  } catch (error) {
    console.error('Add account error:', error);
    res.status(500).json({ message: 'Server error adding account' });
  }
});

// ---------------------------------------------------------------------------
// GET /accounts
// ---------------------------------------------------------------------------
router.get('/accounts', auth, async (req, res) => {
  try {
    const { data: accounts } = await supabase
      .from('brokerage_accounts')
      .select('type, broker, is_active, created_at')
      .eq('user_id', req.userId);

    res.json({ accounts: accounts || [] });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ message: 'Server error fetching accounts' });
  }
});

module.exports = router;
