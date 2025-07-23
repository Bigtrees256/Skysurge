const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const User = require('../models/User');

// Check username availability
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Validate username format
    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({
        available: false,
        error: 'Username must be between 3 and 20 characters'
      });
    }

    // Check for invalid characters (only allow alphanumeric, underscore, hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({
        available: false,
        error: 'Username can only contain letters, numbers, underscores, and hyphens'
      });
    }

    // Check if username exists in database (case-insensitive)
    const existingUser = await User.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    if (existingUser) {
      return res.json({ available: false, error: 'Username is already taken' });
    }

    res.json({ available: true });
  } catch (err) {
    console.error('Username check error:', err);
    res.status(500).json({ available: false, error: 'Server error checking username' });
  }
});

// Create user in MongoDB after Firebase registration
router.post('/register', async (req, res) => {
  try {
    const { username, firebaseUid, email } = req.body;

    // Validate required fields
    if (!username || !firebaseUid || !email) {
      return res.status(400).json({
        error: 'Username, Firebase UID, and email are required'
      });
    }

    // Validate username format
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        error: 'Username must be between 3 and 20 characters'
      });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({
        error: 'Username can only contain letters, numbers, underscores, and hyphens'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { firebaseUid },
        { email },
        { username: { $regex: new RegExp(`^${username}$`, 'i') } }
      ]
    });

    if (existingUser) {
      if (existingUser.firebaseUid === firebaseUid) {
        // User already exists, return existing user
        return res.json({
          success: true,
          user: existingUser,
          message: 'User already exists'
        });
      } else if (existingUser.username.toLowerCase() === username.toLowerCase()) {
        return res.status(400).json({ error: 'Username is already taken' });
      } else if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email is already registered' });
      }
    }

    // Create new user
    const newUser = new User({
      username,
      email,
      firebaseUid,
      isAdmin: email === 'huangjustin256@gmail.com'
    });

    await newUser.save();

    console.log('✅ New user created:', { username, email, firebaseUid });

    res.status(201).json({
      success: true,
      user: newUser,
      message: 'User created successfully'
    });

  } catch (err) {
    console.error('User registration error:', err);

    // Handle MongoDB duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} is already taken`
      });
    }

    res.status(500).json({ error: 'Server error creating user' });
  }
});

// Update username for existing user
router.put('/update-username', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { username } = req.body;

    // Validate username
    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({
        error: 'Username must be between 3 and 20 characters'
      });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({
        error: 'Username can only contain letters, numbers, underscores, and hyphens'
      });
    }

    // Check if username is already taken by another user
    const existingUser = await User.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') },
      firebaseUid: { $ne: decodedToken.uid } // Exclude current user
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Find or create user
    let user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      // Create new user if doesn't exist
      user = new User({
        username,
        email: decodedToken.email,
        firebaseUid: decodedToken.uid,
        isAdmin: decodedToken.email === 'huangjustin256@gmail.com'
      });
    } else {
      // Update existing user
      user.username = username;
    }

    await user.save();

    // Update Firebase displayName
    try {
      await admin.auth().updateUser(decodedToken.uid, {
        displayName: username
      });
      console.log('✅ Updated Firebase displayName for user:', username);
    } catch (firebaseError) {
      console.warn('⚠️ Failed to update Firebase displayName:', firebaseError.message);
      // Don't fail the request if Firebase update fails
    }

    res.json({
      success: true,
      user: {
        uid: user.firebaseUid,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      },
      message: 'Username updated successfully'
    });

  } catch (err) {
    console.error('Update username error:', err);

    if (err.code === 11000) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    res.status(500).json({ error: 'Server error updating username' });
  }
});

// Get current user info for username setup (doesn't require username)
router.get('/user-info', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Try to get user from MongoDB first
    let user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      // User not found in MongoDB - return Firebase info for setup
      return res.json({
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          displayName: decodedToken.name,
          isAdmin: decodedToken.email === 'huangjustin256@gmail.com',
          needsUsername: true,
          hasUsername: false
        }
      });
    }

    // Return MongoDB user data
    res.json({
      user: {
        uid: user.firebaseUid,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        needsUsername: false,
        hasUsername: true
      }
    });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Invalid token', details: err.message });
  }
});

// Get current user (Firebase token-based) - REQUIRES USERNAME
router.get('/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      console.log('❌ /user endpoint: No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    console.log('🔍 /user endpoint: Verifying token...');
    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('✅ /user endpoint: Token verified for user:', decodedToken.email);

    console.log('🔍 /user endpoint: Looking up user in MongoDB...');
    // Try to get user from MongoDB first
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    console.log('🔍 /user endpoint: MongoDB lookup result:', user ? `User found: ${user.username}` : 'User not found');

    if (!user) {
      // User not found in MongoDB - MUST set username before proceeding
      console.log('⚠️ /user endpoint: User not found in MongoDB, requiring username setup');
      return res.status(403).json({
        error: 'Username setup required',
        code: 'USERNAME_REQUIRED',
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          isAdmin: decodedToken.email === 'huangjustin256@gmail.com',
          needsUsername: true
        }
      });
    }

    // Return MongoDB user data
    console.log('✅ /user endpoint: Returning user data for:', user.username);
    res.json({
      user: {
        uid: user.firebaseUid,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        needsUsername: false
      }
    });
  } catch (err) {
    console.error('❌ /user endpoint error:', err);
    if (err.code === 'auth/id-token-expired') {
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    } else if (err.code === 'auth/argument-error') {
      res.status(401).json({ error: 'Invalid token format', code: 'INVALID_TOKEN' });
    } else {
      res.status(401).json({ error: 'Invalid token', details: err.message });
    }
  }
});

// Grant admin privileges to current user (temporary endpoint for testing)
router.post('/grant-admin', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Find user in MongoDB
    let user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // Grant admin privileges
    user.isAdmin = true;
    await user.save();

    res.json({
      success: true,
      message: 'Admin privileges granted',
      user: {
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Grant admin error:', error);
    res.status(500).json({ error: 'Failed to grant admin privileges' });
  }
});

module.exports = router;