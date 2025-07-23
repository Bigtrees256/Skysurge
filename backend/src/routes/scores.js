const express = require('express');
const router = express.Router();
const Score = require('../models/Score');
const User = require('../models/User');
const GameSession = require('../models/GameSession');
const { authenticateToken } = require('../middleware/auth');
const { leaderboardLimiter } = require('../middleware/rateLimit');
const { leaderboardCache, clearLeaderboardCache } = require('../middleware/cache');
const { 
  antiCheatValidation, 
  scoreSubmissionRateLimit, 
  detectScoreAnomalies 
} = require('../middleware/antiCheat');
const mongoose = require('mongoose');

// Submit a new score with anti-cheat validation
router.post('/',
  authenticateToken,
  scoreSubmissionRateLimit(60 * 1000, 5), // 5 submissions per minute
  antiCheatValidation,
  detectScoreAnomalies,
  async (req, res) => {
    try {
      console.log('🎯 SCORE SUBMISSION: Starting process');
      console.log('🎯 SCORE SUBMISSION: Request body:', req.body);
      console.log('🎯 SCORE SUBMISSION: User info:', req.user);

      const { score } = req.body;
      const gameSession = req.gameSession;

      console.log('🎯 SCORE SUBMISSION: Extracted score:', score);
      console.log('🎯 SCORE SUBMISSION: Game session ID:', gameSession?._id);

      if (!score || typeof score !== 'number' || score < 0) {
        console.log('❌ SCORE SUBMISSION: Invalid score provided');
        return res.status(400).json({ error: 'Valid score is required' });
      }
      
      // Check if session validation passed
      if (gameSession.flags.suspiciousActivity) {
        console.warn('🚨 Score submission blocked due to suspicious activity:', {
          userId: req.user.uid,
          username: req.user.username,
          score,
          sessionId: gameSession.sessionId,
          flags: gameSession.flags
        });

        return res.status(403).json({
          error: 'Score submission blocked due to suspicious activity',
          code: 'SUSPICIOUS_ACTIVITY'
        });
      }
      
      // Check if user already has a score
      console.log('🔍 SCORE SUBMISSION: Checking for existing score for user:', req.user.uid);
      const existingScore = await Score.findOne({ userId: req.user.uid });
      console.log('🔍 SCORE SUBMISSION: Existing score found?', !!existingScore);
      if (existingScore) {
        console.log('🔍 SCORE SUBMISSION: Existing score details:', {
          id: existingScore._id,
          score: existingScore.score,
          username: existingScore.username,
          created: existingScore.createdAt
        });
      }

      let savedScore;
      if (existingScore) {
        // Only update if this score is higher
        console.log('🔍 SCORE SUBMISSION: Comparing scores - New:', score, 'Existing:', existingScore.score);
        console.log('🔍 SCORE SUBMISSION: Is new score higher?', score > existingScore.score);

        if (score > existingScore.score) {
          // Get the current username from User collection to ensure consistency
          const User = require('../models/User');
          const currentUser = await User.findOne({ firebaseUid: req.user.uid });
          const currentUsername = currentUser ? currentUser.username : req.user.username;

          existingScore.score = score;
          existingScore.username = currentUsername; // Update username to current value
          existingScore.gameSessionId = gameSession._id;
          existingScore.metadata = {
            sessionId: gameSession.sessionId,
            gameDuration: gameSession.gameDuration,
            integrityChecks: gameSession.integrityChecks
          };
          savedScore = await existingScore.save();

          console.log('🏆 New high score! Updated existing record:', {
            userId: req.user.uid,
            username: req.user.username,
            oldScore: existingScore.score,
            newScore: score
          });
        } else {
          // Score is not higher, don't save but still return success
          savedScore = existingScore;

          console.log('📊 Score not higher than existing best:', {
            userId: req.user.uid,
            username: req.user.username,
            currentBest: existingScore.score,
            submittedScore: score
          });
        }
      } else {
        // Get the current username from User collection to ensure consistency
        const User = require('../models/User');
        const currentUser = await User.findOne({ firebaseUid: req.user.uid });
        const currentUsername = currentUser ? currentUser.username : req.user.username;

        // Create new score record
        const newScore = new Score({
          username: currentUsername, // Use current username from User collection
          score,
          userId: req.user.uid,
          gameSessionId: gameSession._id,
          metadata: {
            sessionId: gameSession.sessionId,
            gameDuration: gameSession.gameDuration,
            integrityChecks: gameSession.integrityChecks
          }
        });

        savedScore = await newScore.save();

        console.log('🎉 First score for user! Created new record:', {
          userId: req.user.uid,
          username: req.user.username,
          score: score
        });
      }
      
      // Update session with score reference
      gameSession.metadata.set('scoreId', savedScore._id.toString());
      await gameSession.save();

      // Clear leaderboard cache when new score is added
      clearLeaderboardCache();

      console.log('✅ Score submitted successfully with anti-cheat validation:', {
        userId: req.user.uid,
        username: req.user.username,
        score,
        sessionId: gameSession.sessionId,
        isNewHighScore: !existingScore || score > existingScore.score
      });

      res.status(201).json({
        message: 'Score saved successfully',
        score: savedScore,
        isNewHighScore: !existingScore || score > (existingScore ? existingScore.score : 0)
      });
    } catch (err) {
      console.error('Score submission error:', err);
      res.status(400).json({ error: err.message });
    }
  }
);

// Get leaderboard (top scores) - now includes integrity filtering, rate limiting, and caching
router.get('/leaderboard', leaderboardLimiter, leaderboardCache(30000), async (req, res) => {
  console.log('🔍 Leaderboard endpoint hit!');
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    console.log('🔍 Querying scores from database...');
    
    // Get leaderboard with user lookup and highest score per user
    const scores = await Score.aggregate([
      // First, lookup session validation
      {
        $lookup: {
          from: 'gamesessions',
          localField: 'gameSessionId',
          foreignField: '_id',
          as: 'session'
        }
      },
      {
        $unwind: {
          path: '$session',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: {
          $or: [
            // Include scores with valid sessions
            {
              'session.flags.suspiciousActivity': { $ne: true }
            },
            // Include scores without sessions (legacy scores)
            {
              session: { $exists: false }
            }
          ]
        }
      },

      // Group by userId to get highest score per user
      {
        $sort: { score: -1, createdAt: 1 } // Sort by score desc, then by date asc for ties
      },
      {
        $group: {
          _id: '$userId',
          highestScore: { $first: '$score' },
          scoreRecord: { $first: '$$ROOT' }
        }
      },

      // Lookup user information from User collection
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'firebaseUid',
          as: 'userInfo'
        }
      },

      // Add computed fields
      {
        $addFields: {
          // Use username from User collection if available, otherwise fallback to Score username
          displayUsername: {
            $cond: {
              if: { $gt: [{ $size: '$userInfo' }, 0] },
              then: { $arrayElemAt: ['$userInfo.username', 0] },
              else: '$scoreRecord.username'
            }
          },
          userId: '$_id',
          score: '$highestScore',
          createdAt: '$scoreRecord.createdAt',
          gameVersion: '$scoreRecord.gameVersion',
          platform: '$scoreRecord.platform'
        }
      },

      // Sort by score descending
      { $sort: { score: -1, createdAt: 1 } },

      // Apply pagination
      { $skip: skip },
      { $limit: parseInt(limit) },

      // Project final fields
      {
        $project: {
          _id: '$scoreRecord._id',
          userId: 1,
          username: '$displayUsername',
          score: 1,
          createdAt: 1,
          gameVersion: 1,
          platform: 1
        }
      }
    ]);

    console.log('🔍 Found scores:', scores.length);
    console.log('🔍 Score details:', scores.map(s => ({
      username: s.username,
      score: s.score,
      userId: s.userId
    })));

    // Get total count of unique users for pagination
    const totalUsers = await Score.aggregate([
      {
        $lookup: {
          from: 'gamesessions',
          localField: 'gameSessionId',
          foreignField: '_id',
          as: 'session'
        }
      },
      {
        $unwind: {
          path: '$session',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: {
          $or: [
            {
              'session.flags.suspiciousActivity': { $ne: true }
            },
            {
              session: { $exists: false }
            }
          ]
        }
      },
      {
        $group: {
          _id: '$userId' // Group by unique userId
        }
      },
      {
        $count: 'total'
      }
    ]);

    const total = totalUsers.length > 0 ? totalUsers[0].total : 0;
    console.log('🔍 Total valid scores in database:', total);
    
    res.json({
      scores,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
    console.log('🔍 Leaderboard response sent successfully');
  } catch (err) {
    console.error('❌ Leaderboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get user's personal best score
router.get('/personal-best', authenticateToken, async (req, res) => {
  try {
    // Find best score by userId (more reliable than username)
    const bestScore = await Score.findOne({ userId: req.user.uid })
      .sort({ score: -1 });

    res.json({
      personalBest: bestScore ? bestScore.score : 0,
      score: bestScore
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's recent scores
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const recentScores = await Score.find({ username: req.user.username })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({ scores: recentScores });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's rank
router.get('/rank', authenticateToken, async (req, res) => {
  try {
    const userBestScore = await Score.findOne({ username: req.user.username })
      .sort({ score: -1 });
    
    if (!userBestScore) {
      return res.json({ rank: null, totalPlayers: 0 });
    }
    
    const rank = await Score.countDocuments({ 
      score: { $gt: userBestScore.score } 
    });
    
    const totalPlayers = await Score.distinct('username').countDocuments();
    
    res.json({ 
      rank: rank + 1, 
      totalPlayers,
      score: userBestScore.score 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all scores for a specific user
router.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { limit = 50 } = req.query;
    
    const scores = await Score.find({ username })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({ scores });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get suspicious sessions
router.get('/admin/suspicious', async (req, res) => {
  try {
    const suspiciousSessions = await GameSession.find({
      'flags.suspiciousActivity': true
    })
    .populate('userId', 'username email')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({ sessions: suspiciousSessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DEBUG: Get all scores in database (for troubleshooting)
router.get('/debug/all', async (req, res) => {
  try {
    const allScores = await Score.find({}).sort({ score: -1, createdAt: -1 });
    console.log('🔍 DEBUG: All scores in database:', allScores.length);
    allScores.forEach((score, index) => {
      console.log(`${index + 1}. User: ${score.username}, Score: ${score.score}, UserID: ${score.userId}, Created: ${score.createdAt}`);
    });

    res.json({
      total: allScores.length,
      scores: allScores.map(score => ({
        username: score.username,
        score: score.score,
        userId: score.userId,
        createdAt: score.createdAt,
        _id: score._id
      }))
    });
  } catch (err) {
    console.error('DEBUG endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DEBUG: Get user info from token (for troubleshooting)
router.get('/debug/user', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 DEBUG: User info from token:', req.user);
    res.json({ user: req.user });
  } catch (err) {
    console.error('DEBUG user endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;