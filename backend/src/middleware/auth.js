const admin = require('firebase-admin');

// Simple Firebase token verification middleware
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
    }

    // Check if Firebase Admin is initialized
    if (!admin.apps.length) {
      console.error('❌ Firebase Admin not initialized - cannot verify token');
      return res.status(500).json({
        error: 'Authentication service unavailable',
        code: 'AUTH_SERVICE_ERROR'
      });
    }

    // Verify Firebase token
    console.log('🔍 Auth: Verifying Firebase token...');
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('✅ Auth: Firebase token verified for user:', decodedToken.email);

    // Check if user exists in MongoDB (username setup required)
    const User = require('../models/User');
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    console.log('🔍 Auth: MongoDB user lookup result:', user ? 'Found' : 'Not found');

    if (!user) {
      return res.status(403).json({
        error: 'Username setup required before accessing this resource',
        code: 'USERNAME_REQUIRED',
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          isAdmin: decodedToken.email === 'huangjustin256@gmail.com',
          needsUsername: true
        }
      });
    }

    // Store user info in request (from MongoDB)
    req.user = {
      _id: user.firebaseUid, // Use Firebase UID as MongoDB _id for compatibility
      uid: user.firebaseUid,
      email: user.email,
      username: user.username,
      displayName: user.username,
      isAdmin: user.isAdmin
    };
    
    next();
  } catch (err) {
    console.error('Firebase token verification error:', err);
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    if (err.code === 'auth/invalid-id-token') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const username = decodedToken.name || decodedToken.email?.split('@')[0] || 'user';
      req.user = {
        _id: decodedToken.uid, // Use Firebase UID as MongoDB _id for compatibility
        uid: decodedToken.uid,
        email: decodedToken.email,
        username: username, // Add username field that the rest of the app expects
        displayName: username,
        isAdmin: decodedToken.email === 'huangjustin256@gmail.com'
      };
    }
    next();
  } catch (err) {
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
}; 