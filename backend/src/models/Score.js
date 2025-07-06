const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 50
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: { 
    type: Number, 
    required: true,
    min: 0,
    max: 999999
  },
  gameVersion: {
    type: String,
    default: '1.0.0'
  },
  platform: {
    type: String,
    enum: ['web', 'mobile', 'desktop'],
    default: 'web'
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, { 
  timestamps: true,
  indexes: [
    { score: -1 },
    { username: 1 },
    { userId: 1 },
    { createdAt: -1 }
  ]
});

// Ensure unique combination of user and score (prevent duplicate submissions)
ScoreSchema.index({ userId: 1, score: 1, createdAt: 1 }, { unique: true });

// Virtual for formatted score
ScoreSchema.virtual('formattedScore').get(function() {
  return this.score.toLocaleString();
});

// Static method to get leaderboard
ScoreSchema.statics.getLeaderboard = function(limit = 10, page = 1) {
  const skip = (page - 1) * limit;
  return this.find()
    .sort({ score: -1, createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get user's best score
ScoreSchema.statics.getUserBest = function(username) {
  return this.findOne({ username }).sort({ score: -1 });
};

// Static method to get user's rank
ScoreSchema.statics.getUserRank = function(score) {
  return this.countDocuments({ score: { $gt: score } });
};

module.exports = mongoose.model('Score', ScoreSchema); 