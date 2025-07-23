const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Referral = require('../models/Referral');
const User = require('../models/User');
const PlayerAttempts = require('../models/PlayerAttempts');
const PrizePool = require('../models/PrizePool');

// Process a referral during user registration
// Note: Rate limiting is handled by user registration rate limiting
router.post('/process', authenticateToken, async (req, res) => {
  try {
    const { referrerUsername } = req.body;
    const newUser = req.user; // The newly registered user

    console.log('🔗 Processing referral:', { referrerUsername, newUserId: newUser.uid, newUsername: newUser.username });

    // Validate referrer username
    if (!referrerUsername || typeof referrerUsername !== 'string') {
      return res.status(400).json({ error: 'Invalid referrer username' });
    }

    // Additional validation for referrer username format
    if (referrerUsername.length < 3 || referrerUsername.length > 20) {
      return res.status(400).json({ error: 'Invalid referrer username format' });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(referrerUsername)) {
      return res.status(400).json({ error: 'Invalid referrer username format' });
    }

    // Find the referrer user
    const referrerUser = await User.findOne({
      username: { $regex: new RegExp(`^${referrerUsername}$`, 'i') }
    });

    if (!referrerUser) {
      console.log('❌ Referrer not found:', referrerUsername);
      return res.status(404).json({ error: 'Referrer not found' });
    }

    // Prevent self-referral
    if (referrerUser.firebaseUid === newUser.uid) {
      console.log('❌ Self-referral attempt:', newUser.username);
      return res.status(400).json({ error: 'Cannot refer yourself' });
    }

    // Get current contest/event information
    const prizePool = await PrizePool.getMainPrizePool();
    if (!prizePool.contestStartDate || !prizePool.contestEndDate) {
      console.log('❌ No active contest found');
      return res.status(400).json({ error: 'No active contest period for referrals' });
    }

    const eventId = Referral.generateEventId(prizePool.contestStartDate, prizePool.contestEndDate);

    // Check if referrer has reached their referral limit for this event
    const hasReachedLimit = await Referral.hasReachedReferralLimit(referrerUser.firebaseUid, eventId, 5);
    if (hasReachedLimit) {
      console.log('❌ Referral limit reached:', { referrer: referrerUsername, eventId });
      return res.status(400).json({
        error: 'Referral limit reached for this event period',
        details: 'You can only make 5 successful referrals per event. Limit resets when a new event starts.'
      });
    }

    // Check if referral already exists
    const existingReferral = await Referral.referralExists(referrerUser.firebaseUid, newUser.uid);
    if (existingReferral) {
      console.log('❌ Referral already exists:', { referrer: referrerUsername, referee: newUser.username });
      return res.status(400).json({ error: 'Referral already processed' });
    }

    // Create the referral record
    const referral = new Referral({
      referrerUserId: referrerUser.firebaseUid,
      referrerUsername: referrerUser.username,
      refereeUserId: newUser.uid,
      refereeUsername: newUser.username,
      status: 'completed',
      attemptsGranted: false,
      eventStartDate: prizePool.contestStartDate,
      eventEndDate: prizePool.contestEndDate,
      eventId: eventId,
      metadata: {
        processedAt: new Date().toISOString(),
        userAgent: req.headers['user-agent'] || 'unknown',
        eventId: eventId
      }
    });

    await referral.save();
    console.log('✅ Referral record created:', referral._id);

    // Grant attempts to both users
    const attemptsToGrant = 5; // 5 attempts per referral

    // Grant attempts to referrer
    let referrerAttempts = await PlayerAttempts.findOneAndUpdate(
      { userId: referrerUser.firebaseUid },
      {
        $setOnInsert: {
          username: referrerUser.username,
          userId: referrerUser.firebaseUid
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    referrerAttempts.referralAttempts += attemptsToGrant;
    referrerAttempts.attemptHistory.push({
      type: 'referral',
      amount: attemptsToGrant,
      timestamp: new Date(),
      metadata: {
        referralId: referral._id.toString(),
        refereeUsername: newUser.username,
        source: 'referrer_reward'
      }
    });
    await referrerAttempts.save();

    // Grant attempts to new user (referee)
    let refereeAttempts = await PlayerAttempts.findOneAndUpdate(
      { userId: newUser.uid },
      {
        $setOnInsert: {
          username: newUser.username,
          userId: newUser.uid
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    refereeAttempts.referralAttempts += attemptsToGrant;
    refereeAttempts.attemptHistory.push({
      type: 'referral',
      amount: attemptsToGrant,
      timestamp: new Date(),
      metadata: {
        referralId: referral._id.toString(),
        referrerUsername: referrerUser.username,
        source: 'referee_reward'
      }
    });
    await refereeAttempts.save();

    // Update referral record with granted attempts
    referral.attemptsGranted = true;
    referral.referrerAttemptsGranted = attemptsToGrant;
    referral.refereeAttemptsGranted = attemptsToGrant;
    await referral.save();

    console.log('✅ Referral processed successfully:', {
      referralId: referral._id,
      referrer: referrerUser.username,
      referee: newUser.username,
      attemptsGranted: attemptsToGrant
    });

    res.json({
      success: true,
      message: 'Referral processed successfully',
      referral: {
        id: referral._id,
        referrer: referrerUser.username,
        referee: newUser.username,
        attemptsGranted: attemptsToGrant
      }
    });

  } catch (error) {
    console.error('❌ Error processing referral:', error);
    res.status(500).json({ error: 'Failed to process referral' });
  }
});

// Get referral stats for a user
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get current event information
    const prizePool = await PrizePool.getMainPrizePool();
    const currentEventId = prizePool.contestStartDate && prizePool.contestEndDate
      ? Referral.generateEventId(prizePool.contestStartDate, prizePool.contestEndDate)
      : null;

    // Get referrals made by this user (all time)
    const allReferralsMade = await Referral.find({
      referrerUserId: userId,
      status: 'completed',
      attemptsGranted: true
    }).select('refereeUsername createdAt refereeAttemptsGranted eventId');

    // Get referrals made in current event
    const currentEventReferrals = currentEventId ? await Referral.find({
      referrerUserId: userId,
      eventId: currentEventId,
      status: 'completed',
      attemptsGranted: true
    }).select('refereeUsername createdAt refereeAttemptsGranted') : [];

    // Get if this user was referred by someone
    const referralReceived = await Referral.findOne({
      refereeUserId: userId,
      status: 'completed'
    }).select('referrerUsername createdAt referrerAttemptsGranted eventId');

    // Calculate total attempts earned from referrals (5 attempts per referral)
    const totalAttemptsEarned = allReferralsMade.length * 5;
    const currentEventAttemptsEarned = currentEventReferrals.length * 5;

    res.json({
      success: true,
      stats: {
        allTime: {
          referralsMade: allReferralsMade.length,
          totalAttemptsEarned,
          recentReferrals: allReferralsMade.slice(-5) // Last 5 referrals
        },
        currentEvent: {
          eventId: currentEventId,
          eventStart: prizePool.contestStartDate,
          eventEnd: prizePool.contestEndDate,
          referralsMade: currentEventReferrals.length,
          referralsRemaining: Math.max(0, 5 - currentEventReferrals.length),
          attemptsEarned: currentEventAttemptsEarned,
          recentReferrals: currentEventReferrals.slice(-3) // Last 3 referrals this event
        },
        referralReceived: referralReceived ? {
          referrer: referralReceived.referrerUsername,
          date: referralReceived.createdAt,
          eventId: referralReceived.eventId
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Error getting referral stats:', error);
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

// Check if user can make more referrals in current event
router.get('/check-limit', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get current event information
    const prizePool = await PrizePool.getMainPrizePool();
    if (!prizePool.contestStartDate || !prizePool.contestEndDate) {
      return res.json({
        success: true,
        canRefer: false,
        reason: 'No active contest period',
        currentEvent: null
      });
    }

    const eventId = Referral.generateEventId(prizePool.contestStartDate, prizePool.contestEndDate);
    const referralCount = await Referral.getReferralCountForEvent(userId, eventId);
    const limit = 5;
    const canRefer = referralCount < limit;

    res.json({
      success: true,
      canRefer,
      currentEvent: {
        eventId,
        eventStart: prizePool.contestStartDate,
        eventEnd: prizePool.contestEndDate,
        referralsMade: referralCount,
        referralsRemaining: Math.max(0, limit - referralCount),
        limit
      },
      reason: canRefer ? null : 'Referral limit reached for this event period'
    });

  } catch (error) {
    console.error('❌ Error checking referral limit:', error);
    res.status(500).json({ error: 'Failed to check referral limit' });
  }
});

module.exports = router;
