const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const supabase = require('../lib/supabase');
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
// POST /register
// ---------------------------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, phone, panCard } = req.body;

    let orClause = `email.eq.${email.toLowerCase()},username.eq.${username}`;
    if (panCard) orClause += `,pan_card.eq.${panCard.toUpperCase()}`;

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .or(orClause)
      .limit(1);

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
        pan_card: panCard ? panCard.toUpperCase() : ''
      })
      .select()
      .single();

    if (error) throw error;

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'demo_secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({ message: 'User registered successfully', token, user: userToJSON(user) });
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
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

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

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'demo_secret',
      { expiresIn: '7d' }
    );

    res.json({ message: 'Login successful', token, user: userToJSON(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
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
