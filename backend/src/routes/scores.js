const express = require('express');
const router = express.Router();
const Score = require('../models/Score');
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

// Submit a new score
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { score } = req.body;
    
    if (!score || typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'Valid score is required' });
    }
    
    const newScore = new Score({ 
      username: req.user.username, 
      score,
      userId: req.user._id 
    });
    
    await newScore.save();
    
    res.status(201).json({
      message: 'Score saved successfully',
      score: newScore
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get leaderboard (top scores)
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    const scores = await Score.find()
      .sort({ score: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const totalScores = await Score.countDocuments();
    
    res.json({
      scores,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalScores,
        pages: Math.ceil(totalScores / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's personal best score
router.get('/personal-best', authenticateToken, async (req, res) => {
  try {
    const bestScore = await Score.findOne({ username: req.user.username })
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

module.exports = router; 