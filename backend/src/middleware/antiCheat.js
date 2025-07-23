const crypto = require('crypto');
const GameSession = require('../models/GameSession');
const Score = require('../models/Score');

// Anti-cheat middleware
const antiCheatValidation = async (req, res, next) => {
  try {
    const { sessionId, finalScore, gameDuration, inputEvents, physicsSnapshots, clientHash } = req.body;

    console.log('🔒 ANTI-CHEAT: Starting validation process');
    console.log('🔒 ANTI-CHEAT: Request data:', {
      sessionId: sessionId ? 'PROVIDED' : 'MISSING',
      finalScore,
      gameDuration,
      hasInputEvents: !!inputEvents,
      hasPhysicsSnapshots: !!physicsSnapshots,
      clientHash: clientHash ? 'PROVIDED' : 'MISSING'
    });

    if (!sessionId) {
      console.log('❌ ANTI-CHEAT: No session ID provided');
      return res.status(400).json({
        error: 'Session ID required for anti-cheat validation',
        code: 'NO_SESSION_ID'
      });
    }
    
    // Find the game session
    const session = await GameSession.findOne({ sessionId });
    if (!session) {
      return res.status(400).json({ 
        error: 'Invalid session ID',
        code: 'INVALID_SESSION'
      });
    }
    
    // Check if session belongs to the authenticated user
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        error: 'Session does not belong to user',
        code: 'SESSION_MISMATCH'
      });
    }
    
    // Check if session is already completed
    if (session.endTime) {
      return res.status(400).json({ 
        error: 'Session already completed',
        code: 'SESSION_COMPLETED'
      });
    }
    
    // Update session with game data
    session.endTime = new Date();
    session.finalScore = finalScore;
    session.gameDuration = gameDuration;
    // Handle both individual events and batch events
    const flattenedInputEvents = [];
    if (inputEvents && Array.isArray(inputEvents)) {
      inputEvents.forEach(event => {
        if (event.type === 'batch' && Array.isArray(event.data)) {
          // Flatten batch events
          event.data.forEach(batchEvent => {
            flattenedInputEvents.push({
              timestamp: batchEvent.timestamp,
              type: batchEvent.type,
              data: batchEvent.data
            });
          });
        } else {
          // Regular individual event
          flattenedInputEvents.push(event);
        }
      });
    }

    // Only update input events if we have new ones, don't overwrite existing events with empty array
    if (flattenedInputEvents.length > 0) {
      session.inputEvents = flattenedInputEvents;
    }
    session.physicsSnapshots = physicsSnapshots || [];
    
    // Validate client hash integrity
    const expectedHash = generateClientHash();
    session.serverHash = expectedHash;

    console.log('🔒 ANTI-CHEAT: Hash comparison:', {
      clientHash,
      expectedHash,
      match: clientHash === expectedHash
    });

    if (clientHash !== expectedHash) {
      console.log('⚠️ ANTI-CHEAT: Hash mismatch detected - logging but not blocking');
      // Don't immediately flag as suspicious - could be browser caching or timing
      session.metadata.set('hashMismatch', 'true');
      session.metadata.set('clientHash', clientHash);
      session.metadata.set('expectedHash', expectedHash);
    }
    
    // Check for multiple active sessions (very lenient for testing)
    const activeSessions = await GameSession.countDocuments({
      userId: req.user._id,
      endTime: null,
      _id: { $ne: session._id }
    });

    // Only flag as suspicious if there are excessive concurrent sessions (>10)
    if (activeSessions > 10) {
      session.flags.multipleSessions = true;
      session.flags.suspiciousActivity = true;
    } else if (activeSessions > 0) {
      // Just mark the flag but don't mark as suspicious for normal gameplay/testing
      session.flags.multipleSessions = true;
    }
    
    // Perform integrity validation
    const integrityChecks = session.validateIntegrity();
    console.log('🔒 ANTI-CHEAT: Integrity checks:', integrityChecks);

    // Flag session as suspicious only if multiple integrity checks fail
    const failedChecks = Object.values(integrityChecks).filter(check => check === false).length;
    if (failedChecks >= 2) {
      console.log('🚨 ANTI-CHEAT: Multiple integrity validations failed - flagging as suspicious');
      session.flags.suspiciousActivity = true;
    } else if (failedChecks === 1) {
      console.log('⚠️ ANTI-CHEAT: One integrity check failed - logging but not blocking');
    }
    
    // Check for impossible scores
    const maxPossibleScore = getMaxPossibleScore(gameDuration);
    console.log('🔒 ANTI-CHEAT: Score validation:', {
      finalScore,
      gameDuration,
      maxPossibleScore,
      isImpossible: finalScore > maxPossibleScore
    });

    if (finalScore > maxPossibleScore) {
      console.log('🚨 ANTI-CHEAT: Impossible score detected!');
      session.flags.impossibleScore = true;
      session.flags.suspiciousActivity = true;
    }

    // Check for suspicious timing patterns
    if (gameDuration < 1000) { // Less than 1 second
      console.log('🚨 ANTI-CHEAT: Time manipulation detected!');
      session.flags.timeManipulation = true;
      session.flags.suspiciousActivity = true;
    }
    
    // Save session with validation results
    await session.save();
    
    // If suspicious activity detected, log it
    if (session.flags.suspiciousActivity) {
      console.warn('🚨 Suspicious activity detected:', {
        userId: req.user._id,
        username: req.user.username,
        sessionId,
        finalScore,
        gameDuration,
        flags: session.flags,
        integrityChecks
      });
    }
    
    // Attach session to request for score submission
    req.gameSession = session;
    next();
    
  } catch (err) {
    console.error('Anti-cheat validation error:', err);
    res.status(500).json({ 
      error: 'Anti-cheat validation failed',
      code: 'ANTI_CHEAT_ERROR'
    });
  }
};

// Generate expected client hash
const generateClientHash = () => {
  // This should match the hash generated on the client side
  // For now, we'll use a simple hash of game constants
  const gameConstants = {
    gravity: 0.04,
    jumpForce: -3.0,
    maxVelocityY: 3.5,
    baseSpeed: 1,
    obstacleSpawnInterval: 2000,
    gapSize: { min: 150, max: 180 }
  };
  
  return crypto.createHash('sha256')
    .update(JSON.stringify(gameConstants))
    .digest('hex');
};

// Calculate maximum possible score based on game duration
const getMaxPossibleScore = (gameDuration) => {
  // Game mechanics:
  // - First 5 seconds: no obstacles
  // - Initial spawn interval: 2000ms (0.5 obstacles/sec)
  // - Difficulty increases every few obstacles, reducing spawn interval by 150ms
  // - Minimum spawn interval: 800ms (1.25 obstacles/sec)

  const gameTimeMs = gameDuration;
  const activeGameTime = Math.max(0, gameTimeMs - 5000); // Subtract 5 second delay

  if (activeGameTime <= 0) {
    return 0; // No obstacles in first 5 seconds
  }

  // Conservative estimate: assume average spawn rate between initial (0.5/sec) and max (1.25/sec)
  const avgObstaclesPerSecond = 0.9; // Average between 0.5 and 1.25
  const maxScore = Math.floor((activeGameTime / 1000) * avgObstaclesPerSecond);

  // Add generous buffer for edge cases and network delays
  return Math.floor(maxScore * 1.5);
};

// Rate limiting for score submissions
const scoreSubmissionRateLimit = (windowMs = 60 * 1000, max = 5) => {
  const submissions = new Map();
  
  return (req, res, next) => {
    const key = req.user._id.toString();
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    if (submissions.has(key)) {
      submissions.set(key, submissions.get(key).filter(time => time > windowStart));
    } else {
      submissions.set(key, []);
    }
    
    const userSubmissions = submissions.get(key);
    
    if (userSubmissions.length >= max) {
      return res.status(429).json({ 
        error: 'Too many score submissions',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    userSubmissions.push(now);
    next();
  };
};

// Anomaly detection for score patterns
const detectScoreAnomalies = async (req, res, next) => {
  try {
    const { finalScore } = req.body;
    const userId = req.user._id;
    
    // Get user's recent scores
    const recentScores = await Score.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10);
    
    if (recentScores.length > 0) {
      const avgScore = recentScores.reduce((sum, score) => sum + score.score, 0) / recentScores.length;
      const maxRecentScore = Math.max(...recentScores.map(s => s.score));
      
      // Check for suspicious score improvements (increased threshold)
      if (finalScore > maxRecentScore * 5) { // Increased from 3x to 5x
        req.gameSession.flags.suspiciousActivity = true;
        req.gameSession.metadata.set('scoreAnomaly', 'true');
        req.gameSession.metadata.set('previousMax', maxRecentScore.toString());
        req.gameSession.metadata.set('improvement', (finalScore / maxRecentScore).toFixed(2));
      }
      
      // Check for impossible consistency (same score multiple times)
      const sameScores = recentScores.filter(s => s.score === finalScore).length;
      if (sameScores >= 3) {
        req.gameSession.flags.suspiciousActivity = true;
        req.gameSession.metadata.set('repeatedScore', 'true');
      }
    }
    
    next();
  } catch (err) {
    console.error('Score anomaly detection error:', err);
    next(); // Continue even if anomaly detection fails
  }
};

// Session creation middleware
const createGameSession = async (req, res, next) => {
  try {
    const { clientHash } = req.body;
    
    if (!clientHash) {
      return res.status(400).json({ 
        error: 'Client hash required',
        code: 'NO_CLIENT_HASH'
      });
    }
    
    // Create new game session
    const session = await GameSession.createSession(
      req.user._id,
      req.user.username,
      clientHash
    );
    
    await session.save();
    
    res.json({
      sessionId: session.sessionId,
      message: 'Game session created'
    });
    
  } catch (err) {
    console.error('Session creation error:', err);
    res.status(500).json({ 
      error: 'Failed to create game session',
      code: 'SESSION_CREATION_ERROR'
    });
  }
};

// Update session with game events
const updateGameSession = async (req, res, next) => {
  try {
    console.log('🔄 SESSION UPDATE: Starting update process');
    console.log('🔄 SESSION UPDATE: Request body:', req.body);
    console.log('🔄 SESSION UPDATE: User:', req.user?.username);

    const { sessionId, eventType, eventData, timestamp } = req.body;

    console.log('🔄 SESSION UPDATE: Looking for session:', sessionId);
    const session = await GameSession.findOne({ sessionId });
    if (!session) {
      console.log('❌ SESSION UPDATE: Session not found:', sessionId);
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    console.log('✅ SESSION UPDATE: Session found:', session._id);

    // Handle batch events or individual events
    if (eventType === 'batch' && Array.isArray(eventData)) {
      console.log('🔄 SESSION UPDATE: Processing batch events:', eventData.length);
      // For batch events, add each individual event
      eventData.forEach(event => {
        // Ensure we have valid data structure
        const eventToAdd = {
          timestamp: Number(event.timestamp) || 0,
          type: String(event.type) || 'unknown',
          data: event.data || {}
        };
        console.log('🔄 SESSION UPDATE: Adding batch event:', eventToAdd);

        // Add to the array using proper Mongoose methods
        session.inputEvents.push(eventToAdd);
      });
    } else {
      console.log('🔄 SESSION UPDATE: Processing single event:', { timestamp, eventType, eventData });
      // Add single event to session
      const eventToAdd = {
        timestamp: Number(timestamp) || 0,
        type: String(eventType) || 'unknown',
        data: eventData || {}
      };
      console.log('🔄 SESSION UPDATE: Adding single event:', eventToAdd);

      // Add to the array using proper Mongoose methods
      session.inputEvents.push(eventToAdd);
    }

    // Mark the array as modified to ensure Mongoose saves it
    session.markModified('inputEvents');

    console.log('💾 SESSION UPDATE: Saving session with', session.inputEvents.length, 'events');
    await session.save();

    console.log('✅ SESSION UPDATE: Session updated successfully');
    res.json({ message: 'Session updated' });

  } catch (err) {
    console.error('❌ SESSION UPDATE: Error occurred:', err);
    res.status(500).json({ error: 'Failed to update session' });
  }
};

module.exports = {
  antiCheatValidation,
  scoreSubmissionRateLimit,
  detectScoreAnomalies,
  createGameSession,
  updateGameSession,
  generateClientHash
}; 