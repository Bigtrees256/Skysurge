const express = require('express');
const router = express.Router();
const PlayerAttempts = require('../models/PlayerAttempts');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get user's attempts (player view)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    let attempts = await PlayerAttempts.findOne({ username: req.user.username });
    
    if (!attempts) {
      // Create new attempts record for new users
      attempts = new PlayerAttempts({ username: req.user.username });
      await attempts.save();
    }
    
    // Return player view (only remaining attempts)
    const playerView = {
      remainingAttempts: attempts.remainingAttempts,
      totalAttempts: attempts.totalAttempts,
      attemptsUsed: attempts.attemptsUsed,
      lastAttemptUsed: attempts.lastAttemptUsed
    };
    
    res.json(playerView);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get attempts for specific user (admin view)
router.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const attempts = await PlayerAttempts.findOne({ username });
    
    if (!attempts) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Full detailed view for admin
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add attempts (from purchases, referrals, ads)
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { type, amount = 1, metadata = {} } = req.body;
    
    // Validate attempt type
    if (!['purchase', 'referral', 'ad', 'bonus'].includes(type)) {
      return res.status(400).json({ error: 'Invalid attempt type' });
    }
    
    // Validate amount
    if (amount <= 0 || amount > 100) {
      return res.status(400).json({ error: 'Invalid amount (1-100)' });
    }
    
    let attempts = await PlayerAttempts.findOne({ username: req.user.username });
    if (!attempts) {
      attempts = new PlayerAttempts({ username: req.user.username });
    }
    
    // Add attempts based on type
    switch (type) {
      case 'purchase':
        attempts.purchaseAttempts += amount;
        break;
      case 'referral':
        attempts.referralAttempts += amount;
        break;
      case 'ad':
        attempts.adsWatched += amount;
        break;
      case 'bonus':
        attempts.bonusAttempts = (attempts.bonusAttempts || 0) + amount;
        break;
    }
    
    // Add metadata for tracking
    if (!attempts.attemptHistory) {
      attempts.attemptHistory = [];
    }
    
    attempts.attemptHistory.push({
      type,
      amount,
      timestamp: new Date(),
      metadata
    });
    
    await attempts.save();
    
    // Return updated player view
    const playerView = {
      remainingAttempts: attempts.remainingAttempts,
      totalAttempts: attempts.totalAttempts,
      attemptsUsed: attempts.attemptsUsed,
      lastAttemptUsed: attempts.lastAttemptUsed
    };
    
    res.json({
      message: `${amount} ${type} attempt(s) added successfully`,
      attempts: playerView
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Use an attempt (when player starts a game)
router.post('/use', authenticateToken, async (req, res) => {
  try {
    let attempts = await PlayerAttempts.findOne({ username: req.user.username });
    
    if (!attempts) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    if (attempts.remainingAttempts <= 0) {
      return res.status(400).json({ 
        error: 'No attempts remaining',
        attempts: {
          remainingAttempts: 0,
          totalAttempts: attempts.totalAttempts,
          attemptsUsed: attempts.attemptsUsed
        }
      });
    }
    
    attempts.attemptsUsed += 1;
    attempts.lastAttemptUsed = new Date();
    await attempts.save();
    
    // Return updated player view
    const playerView = {
      remainingAttempts: attempts.remainingAttempts,
      totalAttempts: attempts.totalAttempts,
      attemptsUsed: attempts.attemptsUsed,
      lastAttemptUsed: attempts.lastAttemptUsed
    };
    
    res.json({
      message: 'Attempt used successfully',
      attempts: playerView
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all players attempts (admin view)
router.get('/admin/all', async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (page - 1) * limit;
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const allAttempts = await PlayerAttempts.find()
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip);
    
    const totalPlayers = await PlayerAttempts.countDocuments();
    
    res.json({
      attempts: allAttempts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalPlayers,
        pages: Math.ceil(totalPlayers / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get attempts statistics (admin view)
router.get('/admin/stats', async (req, res) => {
  try {
    const totalPlayers = await PlayerAttempts.countDocuments();
    const activePlayers = await PlayerAttempts.countDocuments({
      lastAttemptUsed: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    
    const totalAttemptsUsed = await PlayerAttempts.aggregate([
      { $group: { _id: null, total: { $sum: '$attemptsUsed' } } }
    ]);
    
    const totalAttemptsEarned = await PlayerAttempts.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAttempts' } } }
    ]);
    
    res.json({
      totalPlayers,
      activePlayers,
      totalAttemptsUsed: totalAttemptsUsed[0]?.total || 0,
      totalAttemptsEarned: totalAttemptsEarned[0]?.total || 0,
      averageAttemptsPerPlayer: totalPlayers > 0 ? (totalAttemptsEarned[0]?.total || 0) / totalPlayers : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 