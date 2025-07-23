const express = require('express');
const router = express.Router();
const GameSession = require('../models/GameSession');
const { authenticateToken } = require('../middleware/auth');
const { createGameSession, updateGameSession } = require('../middleware/antiCheat');

// Create a new game session
router.post('/create', authenticateToken, createGameSession);

// Update game session with events
router.post('/update', authenticateToken, updateGameSession);

// Get user's recent game sessions
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const sessions = await GameSession.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-inputEvents -physicsSnapshots'); // Don't send large data
    
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get session details (for debugging)
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await GameSession.findOne({ 
      sessionId,
      userId: req.user._id 
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all suspicious sessions
router.get('/admin/suspicious', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const sessions = await GameSession.find({
      'flags.suspiciousActivity': true
    })
    .populate('userId', 'username email')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));
    
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get session statistics
router.get('/admin/stats', async (req, res) => {
  try {
    const totalSessions = await GameSession.countDocuments();
    const suspiciousSessions = await GameSession.countDocuments({
      'flags.suspiciousActivity': true
    });
    const completedSessions = await GameSession.countDocuments({
      endTime: { $exists: true, $ne: null }
    });
    
    const avgGameDuration = await GameSession.aggregate([
      {
        $match: {
          gameDuration: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$gameDuration' }
        }
      }
    ]);
    
    res.json({
      totalSessions,
      suspiciousSessions,
      completedSessions,
      avgGameDuration: avgGameDuration.length > 0 ? avgGameDuration[0].avgDuration : 0,
      suspiciousPercentage: totalSessions > 0 ? (suspiciousSessions / totalSessions * 100).toFixed(2) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 