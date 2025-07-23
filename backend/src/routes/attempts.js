const express = require('express');
const router = express.Router();
const PlayerAttempts = require('../models/PlayerAttempts');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Get user's attempts (player view)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    let attempts = await PlayerAttempts.findOneAndUpdate(
      { userId: req.user.uid }, // Find by userId (more reliable than username)
      {
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
    
    console.log(`[GET MY ATTEMPTS] username: ${req.user.username}, totalAttempts: ${attempts.totalAttempts}, attemptsUsed: ${attempts.attemptsUsed}, remainingAttempts: ${attempts.remainingAttempts}`);
    
    // Return player view (only remaining attempts)
    const playerView = {
      remainingAttempts: attempts.remainingAttempts,
      totalAttempts: attempts.totalAttempts,
      attemptsUsed: attempts.attemptsUsed,
      lastAttemptUsed: attempts.lastAttemptUsed
    };
    
    console.log(`[GET MY ATTEMPTS] Returning player view:`, playerView);
    
    res.json(playerView);
  } catch (err) {
    console.error('[GET MY ATTEMPTS] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get attempts for specific user (admin view)
router.get('/user/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;

    // Find user by username (case-insensitive)
    const user = await User.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });

    if (!user) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Find attempts using the correct userId (firebaseUid)
    let attempts = await PlayerAttempts.findOne({ userId: user.firebaseUid });

    if (!attempts) {
      // If no attempts record exists, create a default one for display
      attempts = {
        username: user.username,
        userId: user.firebaseUid,
        purchaseAttempts: 0,
        referralAttempts: 0,
        adsWatched: 0,
        bonusAttempts: 0,
        totalAttempts: 0,
        attemptsUsed: 0,
        remainingAttempts: 0,
        lastAttemptUsed: null,
        attemptHistory: []
      };
    }

    // Ensure username is current (in case it was updated)
    const responseData = {
      ...attempts.toObject ? attempts.toObject() : attempts,
      username: user.username // Use current username from User collection
    };

    // Full detailed view for admin
    res.json(responseData);
  } catch (err) {
    console.error('Get user attempts error:', err);
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
    
    let attempts = await PlayerAttempts.findOneAndUpdate(
      { userId: req.user.uid }, // Find by userId (more reliable than username)
      {
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
    let attempts = await PlayerAttempts.findOne({ userId: req.user.uid });
    
    if (!attempts) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    console.log(`[USE ATTEMPT] Before using - username: ${req.user.username}, totalAttempts: ${attempts.totalAttempts}, attemptsUsed: ${attempts.attemptsUsed}, remainingAttempts: ${attempts.remainingAttempts}`);
    
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
    
    console.log(`[USE ATTEMPT] After using - username: ${req.user.username}, totalAttempts: ${attempts.totalAttempts}, attemptsUsed: ${attempts.attemptsUsed}, remainingAttempts: ${attempts.remainingAttempts}`);
    
    // Return updated player view
    const playerView = {
      remainingAttempts: attempts.remainingAttempts,
      totalAttempts: attempts.totalAttempts,
      attemptsUsed: attempts.attemptsUsed,
      lastAttemptUsed: attempts.lastAttemptUsed
    };
    
    console.log(`[USE ATTEMPT] Returning player view:`, playerView);
    
    res.json({
      message: 'Attempt used successfully',
      attempts: playerView
    });
  } catch (err) {
    console.error('[USE ATTEMPT] Error:', err);
    res.status(400).json({ error: err.message });
  }
});

// Check daily free attempt status
router.get('/daily-status', authenticateToken, async (req, res) => {
  try {
    let attempts = await PlayerAttempts.findOneAndUpdate(
      { userId: req.user.uid },
      {
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
    
    const now = new Date();
    const lastClaim = attempts.lastFreeAttemptClaim;
    
    // Check if already claimed today
    const alreadyClaimed = lastClaim && 
      now.getDate() === lastClaim.getDate() && 
      now.getMonth() === lastClaim.getMonth() && 
      now.getFullYear() === lastClaim.getFullYear();
    
    res.json({
      canClaim: !alreadyClaimed,
      lastClaimDate: attempts.lastFreeAttemptClaim,
      dailyFreeAttemptsClaimed: attempts.dailyFreeAttemptsClaimed,
      message: alreadyClaimed ? 'Daily free attempt already claimed today' : 'Daily free attempt available'
    });
  } catch (err) {
    console.error('[DAILY STATUS] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Claim daily free attempt
router.post('/claim-daily', authenticateToken, async (req, res) => {
  try {
    let attempts = await PlayerAttempts.findOneAndUpdate(
      { userId: req.user.uid },
      {
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
    
    // Try to claim daily free attempt
    await attempts.claimDailyFreeAttempt();
    
    console.log(`[CLAIM DAILY] ${req.user.username} claimed daily free attempt. New total: ${attempts.totalAttempts}, remaining: ${attempts.remainingAttempts}`);
    
    // Return updated player view
    const playerView = {
      remainingAttempts: attempts.remainingAttempts,
      totalAttempts: attempts.totalAttempts,
      attemptsUsed: attempts.attemptsUsed,
      lastAttemptUsed: attempts.lastAttemptUsed,
      dailyFreeAttemptsClaimed: attempts.dailyFreeAttemptsClaimed,
      lastFreeAttemptClaim: attempts.lastFreeAttemptClaim
    };
    
    res.json({
      message: 'Daily free attempt claimed successfully!',
      attempts: playerView
    });
  } catch (err) {
    if (err.message === 'Daily free attempt already claimed today') {
      // Get current attempts data for error response
      let attempts = await PlayerAttempts.findOneAndUpdate(
        { userId: req.user.uid },
        {
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
      
      res.status(400).json({ 
        error: 'Daily free attempt already claimed today',
        attempts: {
          remainingAttempts: attempts.remainingAttempts,
          totalAttempts: attempts.totalAttempts,
          attemptsUsed: attempts.attemptsUsed,
          dailyFreeAttemptsClaimed: attempts.dailyFreeAttemptsClaimed,
          lastFreeAttemptClaim: attempts.lastFreeAttemptClaim
        }
      });
    } else {
      console.error('[CLAIM DAILY] Error:', err);
      res.status(500).json({ error: err.message });
    }
  }
});

// Get all players attempts (admin view)
router.get('/admin/all', authenticateToken, async (req, res) => {
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

// Check Instagram share limit
router.get('/instagram-limit', authenticateToken, async (req, res) => {
  try {
    let attempts = await PlayerAttempts.findOneAndUpdate(
      { userId: req.user.uid },
      {
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
    
    const dailyLimit = 3;
    const remainingShares = Math.max(0, dailyLimit - attempts.dailyInstagramShares);
    
    res.json({
      dailyInstagramShares: attempts.dailyInstagramShares,
      dailyLimit: dailyLimit,
      remainingShares: remainingShares,
      canShare: remainingShares > 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Track Instagram share
router.post('/instagram-share', authenticateToken, async (req, res) => {
  try {
    let attempts = await PlayerAttempts.findOneAndUpdate(
      { userId: req.user.uid },
      {
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
    
    const dailyLimit = 3;
    if (attempts.dailyInstagramShares >= dailyLimit) {
      return res.status(400).json({ 
        error: 'Daily Instagram share limit reached',
        dailyInstagramShares: attempts.dailyInstagramShares,
        dailyLimit: dailyLimit
      });
    }
    
    // Increment Instagram shares and add bonus attempts
    attempts.dailyInstagramShares += 1;
    attempts.bonusAttempts = (attempts.bonusAttempts || 0) + 1;
    
    // Add to history
    attempts.attemptHistory.push({
      type: 'bonus',
      amount: 1,
      timestamp: new Date(),
      metadata: { source: 'instagram_share' }
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
      message: 'Instagram share tracked successfully',
      attempts: playerView,
      dailyInstagramShares: attempts.dailyInstagramShares,
      dailyLimit: dailyLimit,
      remainingShares: Math.max(0, dailyLimit - attempts.dailyInstagramShares)
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get attempts statistics (admin view)
router.get('/admin/stats', authenticateToken, async (req, res) => {
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

// Admin: Reset daily Instagram share limit for a user
router.post('/admin/reset-instagram/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;

    // Find user by username (case-insensitive)
    const user = await User.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    if (!user) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Find attempts using correct userId (firebaseUid)
    const attempts = await PlayerAttempts.findOne({ userId: user.firebaseUid });
    if (!attempts) {
      return res.status(404).json({ error: 'Player attempts not found' });
    }

    attempts.dailyInstagramShares = 0;
    attempts.lastInstagramShareReset = new Date();
    await attempts.save();

    res.json({
      message: `Daily Instagram share limit reset for ${user.username}`,
      attempts
    });
  } catch (error) {
    console.error('Reset daily Instagram share error:', error);
    res.status(500).json({ error: 'Failed to reset daily Instagram share limit' });
  }
});

// Admin: Grant attempts to a specific user
router.post('/admin/grant/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const { type, amount = 1, metadata = {} } = req.body;

    // Validate attempt type
    if (!['purchase', 'referral', 'ad', 'bonus'].includes(type)) {
      return res.status(400).json({ error: 'Invalid attempt type' });
    }

    // Validate amount
    if (amount <= 0 || amount > 100) {
      return res.status(400).json({ error: 'Invalid amount (1-100)' });
    }

    // Find user first (case-insensitive)
    const user = await User.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let attempts = await PlayerAttempts.findOneAndUpdate(
      { userId: user.firebaseUid },
      {
        $setOnInsert: {
          username: user.username,
          userId: user.firebaseUid
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    // Update username to current value (in case it changed)
    attempts.username = user.username;

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
      metadata: {
        ...metadata,
        grantedBy: req.user.email,
        adminGrant: true
      }
    });

    await attempts.save();

    console.log(`[ADMIN GRANT] ${req.user.email} granted ${amount} ${type} attempts to ${username}`);

    // Return updated player view
    const playerView = {
      remainingAttempts: attempts.remainingAttempts,
      totalAttempts: attempts.totalAttempts,
      attemptsUsed: attempts.attemptsUsed,
      lastAttemptUsed: attempts.lastAttemptUsed
    };

    res.json({
      message: `Successfully granted ${amount} ${type} attempts to ${username}`,
      attempts: playerView
    });
  } catch (error) {
    console.error('Admin grant attempts error:', error);
    res.status(500).json({ error: 'Failed to grant attempts' });
  }
});

module.exports = router;