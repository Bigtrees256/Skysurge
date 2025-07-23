const express = require('express');
const router = express.Router();

// Get Stripe publishable key (safe to expose to frontend)
router.get('/stripe-key', (req, res) => {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return res.status(500).json({
      error: 'Stripe configuration not available'
    });
  }

  res.json({
    publishableKey: publishableKey
  });
});

// Health check for configuration
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    hasStripeKey: !!process.env.STRIPE_PUBLISHABLE_KEY,
    hasMongoUri: !!process.env.MONGODB_URI,
    hasFirebaseConfig: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL)
  });
});

module.exports = router;