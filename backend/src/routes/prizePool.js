const express = require('express');
const router = express.Router();
const PrizePool = require('../models/PrizePool');
const { authenticateToken } = require('../middleware/auth');
const { prizePoolCache, clearPrizePoolCache } = require('../middleware/cache');
const rateLimit = require('express-rate-limit');

// Create custom rate limiters for prize pool endpoints
const prizePoolLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per windowMs
    message: {
        error: 'Too many prize pool requests, please try again later.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false
});

const adminLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        error: 'Too many admin requests, please try again later.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Get current prize pool information
router.get('/info', prizePoolCache(15), async (req, res) => {
  const start = Date.now();
  try {
    // Set cache control headers to prevent browser caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    const prizePool = await PrizePool.getMainPrizePool();
    const end = Date.now();
    console.log('Prize pool /info response time:', end - start, 'ms');
    res.json({
      success: true,
      data: {
        totalAmount: prizePool.totalAmount,
        contributionPercentage: prizePool.contributionPercentage,
        lastUpdated: prizePool.lastUpdated,
        isActive: prizePool.isActive
      }
    });
  } catch (error) {
    console.error('Error fetching prize pool info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prize pool information'
    });
  }
});

// Add contribution to prize pool (called from payment success)
router.post('/contribute', authenticateToken, prizePoolLimiter, async (req, res) => {
  try {
    const { amount, paymentIntentId } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contribution amount'
      });
    }

    const prizePool = await PrizePool.getMainPrizePool();
    const contributionAmount = (amount * prizePool.contributionPercentage) / 100;
    
    await prizePool.addContribution(contributionAmount);
    
    // Clear cache for prize pool info
    clearPrizePoolCache();
    
    res.json({
      success: true,
      data: {
        contributionAmount,
        newTotalAmount: prizePool.totalAmount,
        message: `Successfully added $${contributionAmount.toFixed(2)} to prize pool`
      }
    });
  } catch (error) {
    console.error('Error adding contribution to prize pool:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add contribution to prize pool'
    });
  }
});

// Admin: Update prize pool settings
router.put('/settings', authenticateToken, adminLimiter, async (req, res) => {
  try {
    const { contributionPercentage } = req.body;
    
    // Check if user is admin (you may need to implement admin check)
    // For now, we'll allow any authenticated user to update settings
    
    if (contributionPercentage !== undefined) {
      if (contributionPercentage < 0 || contributionPercentage > 100) {
        return res.status(400).json({
          success: false,
          message: 'Contribution percentage must be between 0 and 100'
        });
      }
    }

    const prizePool = await PrizePool.getMainPrizePool();
    
    if (contributionPercentage !== undefined) {
      prizePool.contributionPercentage = contributionPercentage;
    }
    
    await prizePool.save();
    
    // Clear cache
    clearPrizePoolCache();
    
    res.json({
      success: true,
      data: {
        contributionPercentage: prizePool.contributionPercentage,
        message: 'Prize pool settings updated successfully'
      }
    });
  } catch (error) {
    console.error('Error updating prize pool settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update prize pool settings'
    });
  }
});

// Admin: Distribute prize pool to top 3 players (automatic distribution)
router.post('/distribute', authenticateToken, adminLimiter, async (req, res) => {
  try {
    const prizePool = await PrizePool.getMainPrizePool();
    
    if (prizePool.totalAmount < 10) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient funds in prize pool (minimum $10 required)'
      });
    }

    // Distribute to top 3 players automatically
    const distribution = await prizePool.distributeToTopPlayers();
    
    // Clear cache
    clearPrizePoolCache();
    
    res.json({
      success: true,
      totalDistributed: distribution.totalDistributed,
      winners: distribution.winners,
      distributionBreakdown: distribution.distributionBreakdown,
      message: `Successfully distributed $${distribution.totalDistributed.toFixed(2)} to top 3 players`
    });
  } catch (error) {
    console.error('Error distributing prize pool:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to distribute prize pool'
    });
  }
});

// Admin: Get prize pool statistics
router.get('/stats', async (req, res) => {
  try {
    const prizePool = await PrizePool.getMainPrizePool();
    
    // Get total distributed (this would need a separate collection in a real app)
    const totalDistributed = 0; // Placeholder
    
    // Get total pools (this would be from a history collection)
    const totalPools = 1; // Placeholder
    
    res.json({
      success: true,
      stats: {
        totalPools,
        totalDistributed
      },
      currentPool: {
        totalAmount: prizePool.totalAmount,
        totalContributions: 0, // Placeholder
        status: prizePool.isActive ? 'Active' : 'Inactive',
        nextDistribution: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        settings: {
          minimumPoolAmount: 10 // $10 minimum for distribution
        }
      }
    });
  } catch (error) {
    console.error('Error fetching prize pool stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prize pool statistics'
    });
  }
});

// Admin: Get current prize pool details
router.get('/current', async (req, res) => {
  try {
    const prizePool = await PrizePool.getMainPrizePool();
    
    res.json({
      success: true,
      pool: {
        totalAmount: prizePool.totalAmount,
        totalContributions: 0, // Placeholder
        status: prizePool.isActive ? 'Active' : 'Inactive',
        nextDistribution: prizePool.nextDistribution || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        contestStartDate: prizePool.contestStartDate,
        contestEndDate: prizePool.contestEndDate,
        contestDuration: prizePool.contestDuration,
        contestPaused: prizePool.contestPaused,
        settings: {
          minimumPoolAmount: 10 // $10 minimum for distribution
        }
      }
    });
  } catch (error) {
    console.error('Error fetching current prize pool:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current prize pool'
    });
  }
});

// Admin: Get prize pool history
router.get('/history', async (req, res) => {
  try {
    // For now, return empty history since we don't have a history collection
    // In a real app, this would query a separate history collection
    res.json({
      success: true,
      history: []
    });
  } catch (error) {
    console.error('Error fetching prize pool history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prize pool history'
    });
  }
});

// Admin: Manual distribution with winners
router.post('/distribute', authenticateToken, adminLimiter, async (req, res) => {
  try {
    const prizePool = await PrizePool.getMainPrizePool();
    
    if (prizePool.totalAmount < 10) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient funds in prize pool (minimum $10 required)'
      });
    }

    // For now, distribute the entire pool
    const distributedAmount = prizePool.totalAmount;
    await prizePool.distributePrize(distributedAmount);
    
    // Clear cache
    clearPrizePoolCache();
    
    res.json({
      success: true,
      totalDistributed: distributedAmount,
      winners: [
        { username: 'Winner1', amount: distributedAmount * 0.5 },
        { username: 'Winner2', amount: distributedAmount * 0.3 },
        { username: 'Winner3', amount: distributedAmount * 0.2 }
      ],
      message: `Successfully distributed $${distributedAmount.toFixed(2)} from prize pool`
    });
  } catch (error) {
    console.error('Error distributing prize pool:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to distribute prize pool'
    });
  }
});

// Timer Control Endpoints

// Update contest timer
router.post('/update-timer', authenticateToken, adminLimiter, async (req, res) => {
  try {
    const { startDate, endDate, duration } = req.body;
    
    if (!startDate || !endDate || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Start date, end date, and duration are required'
      });
    }
    
    const prizePool = await PrizePool.getMainPrizePool();
    
    // Store timer settings in the prize pool model
    prizePool.contestStartDate = new Date(startDate);
    prizePool.contestEndDate = new Date(endDate);
    prizePool.contestDuration = duration;
    prizePool.nextDistribution = new Date(endDate);
    prizePool.isActive = true;
    
    await prizePool.save();
    
    // Clear cache
    clearPrizePoolCache();
    
    console.log(`⏰ Contest timer updated: ${duration} days from ${startDate} to ${endDate}`);
    
    res.json({
      success: true,
      message: `Contest timer updated successfully for ${duration} days`,
      data: {
        startDate: prizePool.contestStartDate,
        endDate: prizePool.contestEndDate,
        duration: prizePool.contestDuration,
        nextDistribution: prizePool.nextDistribution
      }
    });
  } catch (error) {
    console.error('Error updating contest timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contest timer'
    });
  }
});

// End contest immediately
router.post('/end-contest', authenticateToken, adminLimiter, async (req, res) => {
  try {
    const prizePool = await PrizePool.getMainPrizePool();
    
    prizePool.contestEndDate = new Date();
    prizePool.nextDistribution = new Date();
    prizePool.isActive = false;
    
    await prizePool.save();
    
    // Clear cache
    clearPrizePoolCache();
    
    console.log('⏹️ Contest ended immediately by admin');
    
    res.json({
      success: true,
      message: 'Contest ended successfully',
      data: {
        endDate: prizePool.contestEndDate,
        nextDistribution: prizePool.nextDistribution
      }
    });
  } catch (error) {
    console.error('Error ending contest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end contest'
    });
  }
});

// Admin: Reset prize pool to zero
router.post('/reset', authenticateToken, adminLimiter, async (req, res) => {
  try {
    const prizePool = await PrizePool.getMainPrizePool();
    const previousAmount = prizePool.totalAmount;

    prizePool.totalAmount = 0;
    prizePool.lastUpdated = new Date();

    await prizePool.save();

    // Clear cache
    clearPrizePoolCache();

    console.log(`💰 Prize pool reset by admin from $${previousAmount.toFixed(2)} to $0`);

    res.json({
      success: true,
      message: `Prize pool reset from $${previousAmount.toFixed(2)} to $0`,
      data: {
        previousAmount,
        newAmount: 0,
        resetDate: prizePool.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error resetting prize pool:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset prize pool'
    });
  }
});

// Pause contest
router.post('/pause-contest', authenticateToken, adminLimiter, async (req, res) => {
  try {
    const prizePool = await PrizePool.getMainPrizePool();
    
    prizePool.isActive = false;
    prizePool.contestPaused = true;
    prizePool.pauseStartTime = new Date();
    
    await prizePool.save();
    
    // Clear cache
    clearPrizePoolCache();
    
    console.log('⏸️ Contest paused by admin');
    
    res.json({
      success: true,
      message: 'Contest paused successfully',
      data: {
        isActive: prizePool.isActive,
        pauseStartTime: prizePool.pauseStartTime
      }
    });
  } catch (error) {
    console.error('Error pausing contest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause contest'
    });
  }
});

// Resume contest
router.post('/resume-contest', authenticateToken, adminLimiter, async (req, res) => {
  try {
    const prizePool = await PrizePool.getMainPrizePool();
    
    if (prizePool.contestPaused && prizePool.pauseStartTime) {
      // Calculate the pause duration and adjust the end date
      const pauseDuration = new Date() - prizePool.pauseStartTime;
      prizePool.contestEndDate = new Date(prizePool.contestEndDate.getTime() + pauseDuration);
      prizePool.nextDistribution = new Date(prizePool.contestEndDate);
    }
    
    prizePool.isActive = true;
    prizePool.contestPaused = false;
    prizePool.pauseStartTime = null;
    
    await prizePool.save();
    
    // Clear cache
    clearPrizePoolCache();
    
    console.log('▶️ Contest resumed by admin');
    
    res.json({
      success: true,
      message: 'Contest resumed successfully',
      data: {
        isActive: prizePool.isActive,
        endDate: prizePool.contestEndDate,
        nextDistribution: prizePool.nextDistribution
      }
    });
  } catch (error) {
    console.error('Error resuming contest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume contest'
    });
  }
});

module.exports = router; 