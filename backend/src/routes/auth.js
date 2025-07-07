const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const admin = require('firebase-admin');

// Google OAuth routes
router.get('/google', (req, res, next) => {
  // This will be handled by passport middleware
  next();
});

router.get('/google/callback', 
  (req, res, next) => {
    // This will be handled by passport middleware
    next();
  },
  async (req, res) => {
    try {
      // Generate JWT token for the user
      const token = jwt.sign({ 
        userId: req.user._id, 
        username: req.user.username 
      }, process.env.JWT_SECRET, { expiresIn: '1h' });
      
      // Redirect to frontend with token
      res.redirect(`http://localhost:8080?googleLogin=success&token=${token}`);
    } catch (err) {
      res.redirect('http://localhost:8080?googleLogin=error');
    }
  }
);

// Test endpoint to verify Firebase Admin is working
router.get('/test-firebase', async (req, res) => {
  try {
    console.log('🧪 Testing Firebase Admin...');
    
    // Check if admin is initialized
    if (!admin.apps.length) {
      return res.status(500).json({ error: 'Firebase Admin not initialized' });
    }
    
    console.log('✅ Firebase Admin is initialized');
    console.log('🔧 Available apps:', admin.apps.length);
    
    res.json({ 
      message: 'Firebase Admin is working',
      apps: admin.apps.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Firebase test error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Test endpoint to check token format
router.get('/test-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('🧪 Testing token format...');
    console.log('🔍 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('🔍 Token length:', token?.length || 0);
    console.log('🔍 Token starts with:', token?.substring(0, 20) + '...');
    
    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }
    
    res.json({ 
      message: 'Token received',
      tokenLength: token.length,
      tokenStart: token.substring(0, 20) + '...',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Token test error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get current user (Firebase token-based)
router.get('/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('🔍 Auth request received');
    console.log('🔍 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('🔍 Token length:', token?.length || 0);
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }
    
    console.log('🔍 Verifying Firebase token...');
    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('✅ Firebase token verified successfully');
    console.log('🔍 User UID:', decodedToken.uid);
    console.log('🔍 User email:', decodedToken.email);
    
    // Find or create user based on Firebase UID
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    console.log('🔍 User found in database:', !!user);
    
    if (!user) {
      console.log('🔧 Creating new user from Firebase data...');
      // Create new user from Firebase data
      user = new User({
        username: decodedToken.name || decodedToken.email?.split('@')[0] || 'user',
        email: decodedToken.email,
        firebaseUid: decodedToken.uid,
        googleId: decodedToken.provider_id === 'google.com' ? decodedToken.sub : undefined
      });
      await user.save();
      console.log('✅ New user created:', user.username);
    }
    
    console.log('✅ Returning user data for:', user.username);
    res.json({ 
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firebaseUid: user.firebaseUid
      }
    });
  } catch (err) {
    console.error('❌ Firebase token verification error:', err);
    console.error('❌ Error code:', err.code);
    console.error('❌ Error message:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// User registration
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    // Validate input
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }
    
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email: email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.username === username ? 'Username already exists' : 'Email already exists' 
      });
    }
    
    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
    const user = new User({ username, password: hashedPassword, email });
    await user.save();
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }
    
    if (!user.password) {
      return res.status(400).json({ error: 'This account was created with Google OAuth. Please use Google login.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }
    
    const token = jwt.sign({ 
      userId: user._id, 
      username: user.username 
    }, process.env.JWT_SECRET, { expiresIn: '24h' });
    
    res.json({ 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 