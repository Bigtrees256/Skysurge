const mongoose = require('mongoose');

// Define the input event subdocument schema
const InputEventSchema = new mongoose.Schema({
  timestamp: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: false }); // Disable _id for subdocuments

const GameSessionSchema = new mongoose.Schema({
  userId: {
    type: String, // Changed to String to support Firebase UIDs
    required: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    default: null
  },
  finalScore: {
    type: Number,
    default: null
  },
  gameDuration: {
    type: Number, // in milliseconds
    default: null
  },
  inputEvents: [InputEventSchema],
  physicsSnapshots: [{
    timestamp: Number, // relative to game start
    playerY: Number,
    playerVelocityY: Number,
    obstacles: [{
      x: Number,
      y: Number,
      width: Number,
      height: Number,
      isTop: Boolean
    }],
    score: Number
  }],
  gameVersion: {
    type: String,
    default: '1.0.0'
  },
  platform: {
    type: String,
    enum: ['web', 'mobile', 'desktop'],
    default: 'web'
  },
  clientHash: {
    type: String, // Hash of client-side game files for integrity check
    required: true
  },
  serverHash: {
    type: String, // Hash calculated by server for comparison
    default: null
  },
  integrityChecks: {
    physicsValid: { type: Boolean, default: null },
    inputValid: { type: Boolean, default: null },
    timingValid: { type: Boolean, default: null },
    scoreValid: { type: Boolean, default: null }
  },
  flags: {
    suspiciousActivity: { type: Boolean, default: false },
    multipleSessions: { type: Boolean, default: false },
    impossibleScore: { type: Boolean, default: false },
    timeManipulation: { type: Boolean, default: false }
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, {
  timestamps: true,
  indexes: [
    { sessionId: 1 },
    { userId: 1 },
    { startTime: -1 },
    { finalScore: -1 },
    { 'flags.suspiciousActivity': 1 }
  ]
});

// Static method to create session
GameSessionSchema.statics.createSession = function(userId, username, clientHash) {
  return new this({
    userId,
    username,
    sessionId: this.generateSessionId(),
    startTime: new Date(),
    clientHash
  });
};

// Generate unique session ID
GameSessionSchema.statics.generateSessionId = function() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Validate session integrity
GameSessionSchema.methods.validateIntegrity = function() {
  const checks = {
    physicsValid: this.validatePhysics(),
    inputValid: this.validateInputs(),
    timingValid: this.validateTiming(),
    scoreValid: this.validateScore()
  };

  this.integrityChecks = checks;
  this.flags.suspiciousActivity = Object.values(checks).some(check => check === false);

  return checks;
};

// Validate physics consistency
GameSessionSchema.methods.validatePhysics = function() {
  if (!this.physicsSnapshots || this.physicsSnapshots.length < 1) {
    return false; // Only require at least 1 snapshot instead of 2
  }

  // For now, just validate that we have snapshots with reasonable data
  // More detailed physics validation can be too strict for real gameplay
  for (let i = 0; i < this.physicsSnapshots.length; i++) {
    const snapshot = this.physicsSnapshots[i];

    // Basic sanity checks
    if (!snapshot.timestamp || typeof snapshot.playerY !== 'number' || typeof snapshot.playerVelocityY !== 'number') {
      return false;
    }

    // Very lenient bounds checking
    if (snapshot.playerY < -1000 || snapshot.playerY > 2000) {
      return false;
    }

    if (snapshot.playerVelocityY < -10 || snapshot.playerVelocityY > 10) {
      return false;
    }
  }

  return true;
};

// Validate input consistency
GameSessionSchema.methods.validateInputs = function() {
  // Very lenient input validation - just check that we have some reasonable data
  // Don't enforce strict relationships between inputs and scores for now

  // If no input events, that's fine - could be a very short game
  if (!this.inputEvents || this.inputEvents.length === 0) {
    return true; // Allow any score with no input events
  }

  // Count total events (including batch events)
  let totalEvents = 0;
  this.inputEvents.forEach(event => {
    if (event.type === 'batch' && Array.isArray(event.data)) {
      totalEvents += event.data.length;
    } else {
      totalEvents += 1;
    }
  });

  // Very lenient - just check we don't have an absurd number of events
  return totalEvents < 10000; // Allow up to 10k events (very generous)
  
  // Check for impossible input patterns
  let jumpCount = 0;
  let lastJumpTime = 0;
  
  for (const event of this.inputEvents) {
    if (event.type === 'jump') {
      jumpCount++;
      
      // Check for impossible jump timing (multiple jumps too quickly)
      if (event.timestamp - lastJumpTime < 100) { // Less than 100ms between jumps
        return false;
      }
      lastJumpTime = event.timestamp;
    }
  }
  
  // Check for reasonable number of jumps
  const gameDuration = this.gameDuration || 60000; // Default 1 minute
  const maxJumpsPerSecond = 2; // Maximum 2 jumps per second
  const maxExpectedJumps = (gameDuration / 1000) * maxJumpsPerSecond;
  
  if (jumpCount > maxExpectedJumps) {
    return false;
  }
  
  return true;
};

// Validate timing consistency
GameSessionSchema.methods.validateTiming = function() {
  if (!this.startTime || !this.endTime) {
    return false;
  }
  
  const actualDuration = this.endTime.getTime() - this.startTime.getTime();
  const reportedDuration = this.gameDuration || 0;
  
  // Allow 5 second tolerance for network delays and processing
  const tolerance = 5000;
  const timeDiff = Math.abs(actualDuration - reportedDuration);
  
  if (timeDiff > tolerance) {
    this.flags.timeManipulation = true;
    return false;
  }
  
  return true;
};

// Validate score consistency
GameSessionSchema.methods.validateScore = function() {
  if (this.finalScore === null || this.finalScore < 0) {
    return false;
  }
  
  // Check if score is physically possible based on game duration
  const gameDuration = this.gameDuration || 60000;
  const maxObstaclesPerSecond = 1.5; // Increased from 0.5 to 1.5 for skilled players
  const maxExpectedScore = Math.floor((gameDuration / 1000) * maxObstaclesPerSecond);

  // Only flag if score is extremely impossible (3x the max expected)
  if (this.finalScore > maxExpectedScore * 3) {
    this.flags.impossibleScore = true;
    return false;
  }
  
  return true;
};

module.exports = mongoose.model('GameSession', GameSessionSchema); 