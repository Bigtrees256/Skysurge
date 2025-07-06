const mongoose = require('mongoose');

const PlayerAttemptsSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    maxlength: 50
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  purchaseAttempts: { 
    type: Number, 
    default: 0,
    min: 0
  },
  referralAttempts: { 
    type: Number, 
    default: 0,
    min: 0
  },
  adsWatched: { 
    type: Number, 
    default: 0,
    min: 0
  },
  bonusAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAttempts: { 
    type: Number, 
    default: 0,
    min: 0
  },
  attemptsUsed: { 
    type: Number, 
    default: 0,
    min: 0
  },
  lastAttemptUsed: { 
    type: Date 
  },
  attemptHistory: [{
    type: {
      type: String,
      enum: ['purchase', 'referral', 'ad', 'bonus', 'used'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: Map,
      of: String,
      default: {}
    }
  }],
  dailyAttemptsUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  lastDailyReset: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  indexes: [
    { username: 1 },
    { userId: 1 },
    { lastAttemptUsed: -1 },
    { totalAttempts: -1 }
  ]
});

// Calculate total attempts before saving
PlayerAttemptsSchema.pre('save', function(next) {
  this.totalAttempts = this.purchaseAttempts + this.referralAttempts + this.adsWatched + this.bonusAttempts;
  
  // Reset daily attempts if it's a new day
  const now = new Date();
  const lastReset = this.lastDailyReset || new Date(0);
  
  if (now.getDate() !== lastReset.getDate() || 
      now.getMonth() !== lastReset.getMonth() || 
      now.getFullYear() !== lastReset.getFullYear()) {
    this.dailyAttemptsUsed = 0;
    this.lastDailyReset = now;
  }
  
  next();
});

// Virtual for remaining attempts
PlayerAttemptsSchema.virtual('remainingAttempts').get(function() {
  return Math.max(0, this.totalAttempts - this.attemptsUsed);
});

// Virtual for daily remaining attempts (if you want daily limits)
PlayerAttemptsSchema.virtual('dailyRemainingAttempts').get(function() {
  const dailyLimit = 10; // You can make this configurable
  return Math.max(0, dailyLimit - this.dailyAttemptsUsed);
});

// Method to add attempts
PlayerAttemptsSchema.methods.addAttempts = function(type, amount, metadata = {}) {
  switch (type) {
    case 'purchase':
      this.purchaseAttempts += amount;
      break;
    case 'referral':
      this.referralAttempts += amount;
      break;
    case 'ad':
      this.adsWatched += amount;
      break;
    case 'bonus':
      this.bonusAttempts += amount;
      break;
    default:
      throw new Error('Invalid attempt type');
  }
  
  // Add to history
  this.attemptHistory.push({
    type,
    amount,
    timestamp: new Date(),
    metadata
  });
  
  return this.save();
};

// Method to use an attempt
PlayerAttemptsSchema.methods.useAttempt = function(metadata = {}) {
  if (this.remainingAttempts <= 0) {
    throw new Error('No attempts remaining');
  }
  
  this.attemptsUsed += 1;
  this.dailyAttemptsUsed += 1;
  this.lastAttemptUsed = new Date();
  
  // Add to history
  this.attemptHistory.push({
    type: 'used',
    amount: 1,
    timestamp: new Date(),
    metadata
  });
  
  return this.save();
};

// Static method to get user attempts
PlayerAttemptsSchema.statics.getUserAttempts = function(username) {
  return this.findOne({ username });
};

// Static method to get attempts statistics
PlayerAttemptsSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalPlayers: { $sum: 1 },
        totalAttemptsEarned: { $sum: '$totalAttempts' },
        totalAttemptsUsed: { $sum: '$attemptsUsed' },
        avgAttemptsPerPlayer: { $avg: '$totalAttempts' }
      }
    }
  ]);
};

module.exports = mongoose.model('PlayerAttempts', PlayerAttemptsSchema); 