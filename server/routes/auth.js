const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const router = express.Router();

// In-memory user store for demo
const users = [];

// Seed a dev user so devs can log in instantly without registering
if (process.env.NODE_ENV !== 'production') {
  bcrypt.hash('dev123', 10).then(hash => {
    users.push({
      id: 'dev-user',
      username: 'devuser',
      email: 'dev@dev.com',
      password: hash,
      firstName: 'Dev',
      lastName: 'User',
      phone: '',
      panCard: 'DEVPAN001',
      preferences: {
        defaultMarket: 'indian',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        notifications: { email: true, sms: false, push: true },
        riskProfile: 'moderate'
      },
      subscription: { plan: 'free', features: [] },
      isActive: true,
      createdAt: new Date()
    });
  });
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, phone, panCard } = req.body;

    // Check if user already exists
    const existingUser = users.find(user => 
      user.email === email || user.username === username || user.panCard === panCard
    );

    if (existingUser) {
      return res.status(400).json({
        message: 'User with this email, username, or PAN card already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      panCard,
      preferences: {
        defaultMarket: 'indian',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        riskProfile: 'moderate'
      },
      subscription: {
        plan: 'free',
        features: []
      },
      isActive: true,
      createdAt: new Date()
    };

    users.push(user);

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'demo_secret',
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = users.find(user => user.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    user.lastLogin = new Date();

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'demo_secret',
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.get('/profile', auth, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.userId);
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return res.json({ user: userWithoutPassword });
    }
    // Serverless cold start: in-memory store is empty — return a minimal profile
    // so the frontend doesn't lose its session. User can update details later.
    res.json({
      user: {
        id: req.userId,
        username: 'user',
        email: '',
        firstName: 'User',
        lastName: '',
        phone: '',
        panCard: '',
        preferences: { defaultMarket: 'indian', currency: 'INR', timezone: 'Asia/Kolkata', riskProfile: 'moderate' },
        subscription: { plan: 'free', features: [] },
        isActive: true
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, phone, preferences } = req.body;
    
    const userIndex = users.findIndex(user => user.id === req.userId);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[userIndex];
    
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    users[userIndex] = user;

    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Profile updated successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const userIndex = users.findIndex(user => user.id === req.userId);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[userIndex];
    
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    users[userIndex] = user;

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Server error changing password' });
  }
});

router.post('/add-account', auth, async (req, res) => {
  try {
    const { type, broker, apiKey, apiSecret } = req.body;

    const userIndex = users.findIndex(user => user.id === req.userId);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[userIndex];
    
    if (!user.accounts) user.accounts = [];
    
    const existingAccount = user.accounts.find(
      account => account.type === type && account.broker === broker
    );

    if (existingAccount) {
      return res.status(400).json({ 
        message: 'Account with this broker and market type already exists' 
      });
    }

    user.accounts.push({
      type,
      broker,
      apiKey,
      apiSecret,
      isActive: false,
      createdAt: new Date()
    });

    users[userIndex] = user;

    const accounts = user.accounts.map(account => ({
      type: account.type,
      broker: account.broker,
      isActive: account.isActive,
      createdAt: account.createdAt
    }));

    res.json({ message: 'Account added successfully', accounts });
  } catch (error) {
    console.error('Add account error:', error);
    res.status(500).json({ message: 'Server error adding account' });
  }
});

router.get('/accounts', auth, async (req, res) => {
  try {
    const user = users.find(user => user.id === req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const accounts = (user.accounts || []).map(account => ({
      type: account.type,
      broker: account.broker,
      isActive: account.isActive,
      createdAt: account.createdAt
    }));

    res.json({ accounts });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ message: 'Server error fetching accounts' });
  }
});

module.exports = router;
