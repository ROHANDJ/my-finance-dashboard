const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');
const getJwtSecret = require('../lib/jwtSecret');
const { isMailConfigured, sendMail } = require('../lib/mailer');
const { LOGO_PNG_BASE64 } = require('../lib/emailAssets');
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

const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Logo travels inside the email as an inline attachment (cid), so it shows
// in every client without depending on the website being reachable.
const LOGO_CID = 'fh-logo';
const emailLogoAttachment = () => ({
  filename: 'financehub-logo.png',
  content: Buffer.from(LOGO_PNG_BASE64, 'base64'),
  contentType: 'image/png',
  cid: LOGO_CID,
  contentDisposition: 'inline',
});

/**
 * Password-reset email. Table layout + inline styles because email clients
 * (Gmail, Outlook) ignore most CSS; every gradient has a solid bgcolor fallback.
 */
function resetEmail(name, link) {
  const safeName = escapeHtml(name);
  const safeLink = escapeHtml(link);
  const logoUrl = `cid:${LOGO_CID}`;
  const requestedAt = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const year = new Date().getFullYear();
  const font = "Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const text =
    `Hi ${name},\n\n` +
    `We received a request to reset your FinanceHub password (${requestedAt} IST).\n` +
    `Open this link to choose a new password:\n\n${link}\n\n` +
    `The link expires in 30 minutes and can only be used once.\n\n` +
    `Didn't ask for this? You can safely ignore this email — your password stays the same.\n\n` +
    `— FinanceHub`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Reset your FinanceHub password</title>
<style>
  @media (prefers-color-scheme: dark) {
    .bg { background:#060818 !important; }
    .card { background:#0f172a !important; border-color:#1e293b !important; }
    .h1, .strong { color:#f1f5f9 !important; }
    .p { color:#cbd5e1 !important; }
    .muted { color:#94a3b8 !important; }
    .note { background:#111a2e !important; border-color:#1e293b !important; }
    .badge { background:#1e1b4b !important; }
    .divider { border-color:#1e293b !important; }
  }
  @media (max-width: 520px) {
    .pad { padding-left:24px !important; padding-right:24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#eef2f7;-webkit-text-size-adjust:100%;" class="bg">
  <!-- Inbox preview text -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">Use this link within 30 minutes to choose a new FinanceHub password.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" style="background:#eef2f7;">
    <tr><td align="center" style="padding:36px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card"
             style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">

        <!-- Header banner -->
        <tr><td bgcolor="#5b5ef0" align="center"
                style="background:#5b5ef0;background-image:linear-gradient(135deg,#6366f1 0%,#4f46e5 45%,#06b6d4 100%);padding:30px 24px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:middle;">
              <img src="${logoUrl}" width="44" height="44" alt="FinanceHub"
                   style="display:block;width:44px;height:44px;border:0;border-radius:11px;">
            </td>
            <td style="vertical-align:middle;padding-left:12px;font:800 24px ${font};color:#ffffff;letter-spacing:-0.3px;">FinanceHub</td>
          </tr></table>
          <div style="font:500 13px ${font};color:#e0e7ff;margin-top:8px;">Your money, under control.</div>
        </td></tr>

        <!-- Body -->
        <tr><td class="pad" style="padding:36px 44px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;"><tr>
            <td class="badge" align="center" style="width:48px;height:48px;border-radius:24px;background:#eef2ff;font-size:22px;line-height:48px;">&#128274;</td>
          </tr></table>
          <h1 class="h1" style="margin:0 0 12px;font:700 24px/1.3 ${font};color:#0f172a;">Reset your password</h1>
          <p class="p" style="margin:0 0 10px;font:400 15px/1.65 ${font};color:#334155;">Hi ${safeName},</p>
          <p class="p" style="margin:0 0 28px;font:400 15px/1.65 ${font};color:#334155;">
            We received a request to reset the password for your FinanceHub account.
            Click the button below to choose a new one.
          </p>

          <!-- Button (table-based so it renders in Outlook) -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;"><tr>
            <td align="center" bgcolor="#6366f1" style="border-radius:12px;background:#6366f1;background-image:linear-gradient(135deg,#6366f1,#8b5cf6);">
              <a href="${safeLink}" target="_blank"
                 style="display:inline-block;padding:15px 34px;font:700 15px ${font};color:#ffffff;text-decoration:none;border-radius:12px;">Reset password &rarr;</a>
            </td>
          </tr></table>

          <!-- Security panel -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="note"
                 style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
            <tr><td style="padding:16px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="28" valign="top" style="font-size:15px;line-height:22px;">&#9200;</td>
                  <td class="muted" style="font:400 13px/22px ${font};color:#475569;">
                    <strong class="strong" style="color:#0f172a;">Expires in 30 minutes</strong> and works only once.
                  </td>
                </tr>
                <tr>
                  <td width="28" valign="top" style="font-size:15px;line-height:22px;padding-top:6px;">&#128197;</td>
                  <td class="muted" style="font:400 13px/22px ${font};color:#475569;padding-top:6px;">Requested on ${escapeHtml(requestedAt)} IST.</td>
                </tr>
                <tr>
                  <td width="28" valign="top" style="font-size:15px;line-height:22px;padding-top:6px;">&#9989;</td>
                  <td class="muted" style="font:400 13px/22px ${font};color:#475569;padding-top:6px;">FinanceHub will never ask for your password by email or phone.</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p class="muted" style="margin:24px 0 6px;font:400 13px/1.6 ${font};color:#64748b;">
            Button not working? Copy and paste this link into your browser:
          </p>
          <p style="margin:0 0 30px;font:400 12px/1.6 Menlo,Consolas,monospace;word-break:break-all;">
            <a href="${safeLink}" style="color:#6366f1;text-decoration:underline;">${safeLink}</a>
          </p>
        </td></tr>

        <!-- Card footer -->
        <tr><td class="pad divider" style="padding:20px 44px 26px;border-top:1px solid #e2e8f0;">
          <p class="muted" style="margin:0;font:400 13px/1.6 ${font};color:#64748b;">
            <strong class="strong" style="color:#0f172a;">Didn't request this?</strong>
            You can safely ignore this email. Your password won't change, and nobody can use this link without access to your inbox.
          </p>
        </td></tr>
      </table>

      <!-- Outer footer -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td align="center" class="muted" style="padding:22px 12px 0;font:400 12px/1.7 ${font};color:#64748b;">
          <img src="${logoUrl}" width="20" height="20" alt="" style="display:inline-block;width:20px;height:20px;border:0;border-radius:5px;vertical-align:middle;margin-right:6px;">
          <span class="muted" style="vertical-align:middle;font-weight:700;color:#475569;">FinanceHub</span><br>
          You're receiving this because a password reset was requested for your account.<br>
          &copy; ${year} FinanceHub &middot; Automated message, please don't reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { text, html, attachments: [emailLogoAttachment()] };
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

    // In production email is required. Locally, the link is printed to the
    // server console instead so the flow can be tested without SMTP.
    const mailReady = isMailConfigured();
    const isProd = process.env.NODE_ENV === 'production';
    if (!mailReady && isProd) {
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

    if (!mailReady) {
      console.log(`
[dev] Email not configured — password reset link for ${user.email}:
${link}
`);
      return res.json(genericResponse);
    }

    const { text, html, attachments } = resetEmail(user.first_name || user.username, link);

    // Awaited on purpose: serverless functions freeze once the response is sent.
    await sendMail({ to: user.email, subject: 'Reset your FinanceHub password', text, html, attachments });

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
// POST /dev-login — one-click sign-in to the developer's own account
// (DEV_LOGIN_EMAIL, default rohandj200@gmail.com) without a password.
// Disabled in production so this can never be exploited as a backdoor.
// ---------------------------------------------------------------------------
router.post('/dev-login', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    const email = (process.env.DEV_LOGIN_EMAIL || 'rohandj200@gmail.com').toLowerCase();

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    // Never auto-create a real person's account with a known password.
    if (!user) {
      return res.status(404).json({ message: `No account for ${email} — register it first or set DEV_LOGIN_EMAIL` });
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
