const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 50
  },
  userId: {
    type: String, // Changed to String to support Firebase UIDs
    required: true
  },
  gameSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameSession',
    required: false // Optional for legacy scores
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

// Static method to get leaderboard with user lookup
ScoreSchema.statics.getLeaderboard = function(limit = 10, page = 1) {
  const skip = (page - 1) * limit;
  return this.aggregate([
    // Group by userId to get highest score per user
    {
      $sort: { score: -1, createdAt: 1 }
    },
    {
      $group: {
        _id: '$userId',
        highestScore: { $first: '$score' },
        scoreRecord: { $first: '$$ROOT' }
      }
    },
    // Lookup user information
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
        displayUsername: {
          $cond: {
            if: { $gt: [{ $size: '$userInfo' }, 0] },
            then: { $arrayElemAt: ['$userInfo.username', 0] },
            else: '$scoreRecord.username'
          }
        },
        score: '$highestScore'
      }
    },
    { $sort: { score: -1, 'scoreRecord.createdAt': 1 } },
    { $skip: skip },
    { $limit: limit }
  ]);
};

// Static method to get user's best score by userId
ScoreSchema.statics.getUserBest = function(userId) {
  return this.findOne({ userId }).sort({ score: -1 });
};

// Static method to get user's rank
ScoreSchema.statics.getUserRank = function(score) {
  return this.aggregate([
    {
      $group: {
        _id: '$userId',
        highestScore: { $max: '$score' }
      }
    },
    {
      $match: {
        highestScore: { $gt: score }
      }
    },
    {
      $count: 'rank'
    }
  ]);
};

module.exports = mongoose.model('Score', ScoreSchema); 