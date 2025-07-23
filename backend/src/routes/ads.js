const express = require('express');
const router = express.Router();
const PlayerAttempts = require('../models/PlayerAttempts');
const { authenticateToken } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');
const adConfig = require('../config/adConfig');

// Track ad view and grant attempts
router.post('/watch', authenticateToken, apiLimiter, async (req, res) => {
    try {
        const { adType = 'rewarded', adProvider = 'admob' } = req.body;
        
        let attempts = await PlayerAttempts.findOne({ username: req.user.username, userId: req.user._id });
        if (!attempts) {
            attempts = new PlayerAttempts({ username: req.user.username, userId: req.user._id });
        }
        
        // No daily limits - track for analytics only
        const today = new Date();
        const lastAdView = attempts.lastAdViewDate || new Date(0);
        const isNewDay = today.getDate() !== lastAdView.getDate() || 
                        today.getMonth() !== lastAdView.getMonth() || 
                        today.getFullYear() !== lastAdView.getFullYear();
        
        if (isNewDay) {
            attempts.dailyAdViews = 0;
        }
        
        // Grant attempts based on ad type
        let attemptsGranted = adConfig.adRewards[adType] || adConfig.adRewards.rewarded;
        
        // Update attempts
        attempts.adsWatched += attemptsGranted;
        attempts.dailyAdViews += 1;
        attempts.lastAdViewDate = today;
        
        // Add to history
        attempts.attemptHistory.push({
            type: 'ad',
            amount: attemptsGranted,
            timestamp: new Date(),
            metadata: {
                adType: adType,
                adProvider: adProvider,
                dailyAdViews: attempts.dailyAdViews
            }
        });
        
        await attempts.save();
        
        // Return updated player view
        const playerView = {
            remainingAttempts: attempts.remainingAttempts,
            totalAttempts: attempts.totalAttempts,
            attemptsUsed: attempts.attemptsUsed,
            lastAttemptUsed: attempts.lastAttemptUsed,
            adStats: {
                dailyAdViews: attempts.dailyAdViews,
                maxDailyAds: 'Unlimited',
                remainingAds: 'Unlimited'
            }
        };
        
        res.json({
            success: true,
            message: `Watched ${adType} ad successfully! Earned ${attemptsGranted} attempt(s).`,
            attempts: playerView
        });
        
    } catch (error) {
        console.error('Ad watch error:', error);
        res.status(500).json({ error: 'Failed to process ad view' });
    }
});

// Get user's ad statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        let attempts = await PlayerAttempts.findOne({ username: req.user.username, userId: req.user._id });
        
        if (!attempts) {
            return res.json({
                dailyAdViews: 0,
                maxDailyAds: 'Unlimited',
                remainingAds: 'Unlimited',
                totalAdsWatched: 0,
                canWatchAd: true
            });
        }
        
        // Check if it's a new day
        const today = new Date();
        const lastAdView = attempts.lastAdViewDate || new Date(0);
        const isNewDay = today.getDate() !== lastAdView.getDate() || 
                        today.getMonth() !== lastAdView.getMonth() || 
                        today.getFullYear() !== lastAdView.getFullYear();
        
        if (isNewDay) {
            attempts.dailyAdViews = 0;
            attempts.lastAdViewDate = today;
            await attempts.save();
        }
        
        res.json({
            dailyAdViews: attempts.dailyAdViews,
            maxDailyAds: 'Unlimited',
            remainingAds: 'Unlimited',
            totalAdsWatched: attempts.adsWatched,
            canWatchAd: true,
            lastAdView: attempts.lastAdViewDate
        });
        
    } catch (error) {
        console.error('Ad stats error:', error);
        res.status(500).json({ error: 'Failed to get ad statistics' });
    }
});

// Admin: Get ad analytics
router.get('/admin/analytics', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                'attemptHistory.timestamp': {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        }
        
        // Get ad-related attempts
        const adAttempts = await PlayerAttempts.aggregate([
            { $match: dateFilter },
            { $unwind: '$attemptHistory' },
            { $match: { 'attemptHistory.type': 'ad' } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$attemptHistory.timestamp' } },
                        adType: '$attemptHistory.metadata.adType',
                        adProvider: '$attemptHistory.metadata.adProvider'
                    },
                    count: { $sum: 1 },
                    totalAttempts: { $sum: '$attemptHistory.amount' },
                    uniqueUsers: { $addToSet: '$username' }
                }
            },
            {
                $group: {
                    _id: '$_id.date',
                    adTypes: {
                        $push: {
                            type: '$_id.adType',
                            provider: '$_id.adProvider',
                            count: '$count',
                            attempts: '$totalAttempts',
                            uniqueUsers: { $size: '$uniqueUsers' }
                        }
                    },
                    totalViews: { $sum: '$count' },
                    totalAttempts: { $sum: '$totalAttempts' },
                    uniqueUsers: { $sum: '$uniqueUsers' }
                }
            },
            { $sort: { _id: -1 } }
        ]);
        
        // Get overall statistics
        const overallStats = await PlayerAttempts.aggregate([
            {
                $group: {
                    _id: null,
                    totalAdsWatched: { $sum: '$adsWatched' },
                    totalUsers: { $sum: 1 },
                    avgAdsPerUser: { $avg: '$adsWatched' }
                }
            }
        ]);
        
        res.json({
            dailyStats: adAttempts,
            overallStats: overallStats[0] || {
                totalAdsWatched: 0,
                totalUsers: 0,
                avgAdsPerUser: 0
            }
        });
        
    } catch (error) {
        console.error('Ad analytics error:', error);
        res.status(500).json({ error: 'Failed to get ad analytics' });
    }
});

// Admin: Update ad settings
router.post('/admin/settings', async (req, res) => {
    try {
        const { maxDailyAds, adRewards } = req.body;
        
        // In a real implementation, you would store these in a config table
        // For now, we'll just return success
        res.json({
            success: true,
            message: 'Ad settings updated successfully',
            settings: {
                maxDailyAds: maxDailyAds || 10,
                adRewards: adRewards || { rewarded: 1, interstitial: 0.5 }
            }
        });
        
    } catch (error) {
        console.error('Ad settings error:', error);
        res.status(500).json({ error: 'Failed to update ad settings' });
    }
});

// Reset user's daily ad count (admin only)
router.post('/admin/reset-daily/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        const attempts = await PlayerAttempts.findOne({ username, userId: req.user._id });
        if (!attempts) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        attempts.dailyAdViews = 0;
        attempts.lastAdViewDate = new Date();
        await attempts.save();
        
        res.json({
            success: true,
            message: `Daily ad count reset for ${username}`,
            dailyAdViews: 0
        });
        
    } catch (error) {
        console.error('Reset daily ads error:', error);
        res.status(500).json({ error: 'Failed to reset daily ad count' });
    }
});

module.exports = router; 