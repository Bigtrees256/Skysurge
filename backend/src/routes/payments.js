const express = require('express');
const router = express.Router();

// Initialize Stripe only if API key is provided
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
    console.log('⚠️  Stripe not configured - payment features will be disabled');
}

const { authenticateToken } = require('../middleware/auth');
const PlayerAttempts = require('../models/PlayerAttempts');
const User = require('../models/User');

// Create payment intent for attempts purchase
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
    if (!stripe) {
        return res.status(503).json({ error: 'Payment system not available' });
    }
    
    try {
        const { amount, attempts } = req.body;
        
        // Validate input
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        if (!attempts || attempts <= 0) {
            return res.status(400).json({ error: 'Invalid attempts count' });
        }
        
        // Create payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'usd',
            metadata: {
                userId: req.user.uid,
                username: req.user.username,
                attempts: attempts.toString(),
                type: 'attempts_purchase'
            }
        });
        
        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
        
    } catch (err) {
        console.error('Payment intent creation failed:', err);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
});

// Confirm payment and add attempts
router.post('/confirm-payment', authenticateToken, async (req, res) => {
    if (!stripe) {
        return res.status(503).json({ error: 'Payment system not available' });
    }
    
    try {
        const { paymentIntentId } = req.body;
        
        if (!paymentIntentId) {
            return res.status(400).json({ error: 'Payment intent ID required' });
        }
        
        // Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        // Verify payment was successful
        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ error: 'Payment not completed' });
        }
        
        // Verify the payment belongs to the authenticated user
        if (paymentIntent.metadata.userId !== req.user.uid) {
            return res.status(403).json({ error: 'Payment does not belong to user' });
        }
        
        // Get attempts count from metadata
        const attemptsCount = parseInt(paymentIntent.metadata.attempts) || 3;
        
        // Add attempts to user's account
        let attempts = await PlayerAttempts.findOne({ username: req.user.username, userId: req.user.uid });
        if (!attempts) {
            attempts = new PlayerAttempts({
                username: req.user.username,
                userId: req.user.uid
            });
        }
        
        // Add purchase attempts
        attempts.purchaseAttempts += attemptsCount;
        
        // Add to history
        if (!attempts.attemptHistory) {
            attempts.attemptHistory = [];
        }
        
        attempts.attemptHistory.push({
            type: 'purchase',
            amount: attemptsCount,
            timestamp: new Date(),
            metadata: { paymentIntentId }
        });
        
        await attempts.save();
        
        // Add contribution to prize pool
        try {
            const PrizePool = require('../models/PrizePool');
            const prizePool = await PrizePool.getMainPrizePool();
            
            const paymentAmount = paymentIntent.amount / 100; // Convert from cents
            const contributionAmount = (paymentAmount * prizePool.contributionPercentage) / 100;
            
            await prizePool.addContribution(contributionAmount);
            
            console.log(`Added $${contributionAmount.toFixed(2)} to prize pool from payment ${paymentIntentId}`);
        } catch (prizePoolError) {
            console.error('Failed to add to prize pool:', prizePoolError);
            // Don't fail the payment if prize pool fails
        }
        
        // Return updated player view
        const playerView = {
            remainingAttempts: attempts.remainingAttempts,
            totalAttempts: attempts.totalAttempts,
            attemptsUsed: attempts.attemptsUsed,
            lastAttemptUsed: attempts.lastAttemptUsed
        };
        
        res.json({
            success: true,
            message: `Payment successful! Added ${attemptsCount} attempts.`,
            attempts: playerView,
            payment: {
                id: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency,
                status: paymentIntent.status
            }
        });
        
    } catch (err) {
        console.error('Payment confirmation failed:', err);
        res.status(500).json({ error: 'Failed to confirm payment' });
    }
});

// Get payment history for user
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const attempts = await PlayerAttempts.findOne({ username: req.user.username });
        
        if (!attempts || !attempts.attemptHistory) {
            return res.json({ payments: [] });
        }
        
        // Filter purchase history
        const purchaseHistory = attempts.attemptHistory
            .filter(entry => entry.type === 'purchase')
            .map(entry => ({
                timestamp: entry.timestamp,
                amount: entry.amount,
                attempts: entry.amount,
                metadata: entry.metadata
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({ payments: purchaseHistory });
        
    } catch (err) {
        console.error('Failed to get payment history:', err);
        res.status(500).json({ error: 'Failed to get payment history' });
    }
});

// Webhook to handle Stripe events (for production)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe) {
        return res.status(503).json({ error: 'Payment system not available' });
    }
    
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('Payment succeeded:', paymentIntent.id);
            // You can add additional logic here if needed
            break;
            
        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('Payment failed:', failedPayment.id);
            break;
            
        default:
            console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
});

// Get available purchase packages (no auth required)
router.get('/packages', (req, res) => {
    const packages = [
        {
            id: 'basic',
            name: 'Basic Pack',
            attempts: 3,
            price: 0.99,
            description: '3 attempts for $0.99'
        },
        {
            id: 'standard',
            name: 'Standard Pack',
            attempts: 10,
            price: 2.99,
            description: '10 attempts for $2.99'
        },
        {
            id: 'premium',
            name: 'Premium Pack',
            attempts: 25,
            price: 5.99,
            description: '25 attempts for $5.99'
        },
        {
            id: 'unlimited',
            name: 'Unlimited Pack',
            attempts: 100,
            price: 9.99,
            description: '100 attempts for $9.99'
        }
    ];
    
    res.json({ packages });
});

// Stripe Checkout for attempts purchase
router.post('/create-checkout-session', async (req, res) => {
  const { packageId } = req.body;
  let lineItems = [];

  // Define your packages
  const packages = {
    '3': { name: '3 Attempts', amount: 99, attempts: 3 },      // $0.99
    '10': { name: '10 Attempts', amount: 200, attempts: 10 },   // $2.00
    '30': { name: '30 Attempts', amount: 500, attempts: 30 }    // $5.00
  };

  const selected = packages[String(packageId)];
  if (!selected) {
    return res.status(400).json({ error: 'Invalid package selected' });
  }

  lineItems.push({
    price_data: {
      currency: 'usd',
      product_data: { name: selected.name },
      unit_amount: selected.amount,
    },
    quantity: 1,
  });

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'http://localhost:8080/?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:8080/',
      metadata: { attempts: selected.attempts }
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Grant attempts after Stripe Checkout success
router.post('/grant-attempts', authenticateToken, async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    const attempts = parseInt(session.metadata.attempts, 10) || 0;
    if (!attempts) return res.status(400).json({ error: 'No attempts in session' });

    // Grant attempts to user using findOneAndUpdate to avoid duplicates
    const PlayerAttempts = require('../models/PlayerAttempts');
    const player = await PlayerAttempts.findOneAndUpdate(
      { userId: req.user.uid }, // Find by userId (more reliable than username)
      {
        $inc: { purchaseAttempts: attempts },
        $setOnInsert: {
          username: req.user.username,
          userId: req.user.uid
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    res.json({ success: true, attempts: player.purchaseAttempts, message: `Added ${attempts} attempts!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 