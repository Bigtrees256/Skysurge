const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

// Get current user (JWT-based)
router.get('/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.json({ user });
  } catch (err) {
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