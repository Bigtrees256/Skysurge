const mongoose = require('mongoose');

const prizePoolSchema = new mongoose.Schema({
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  contributionPercentage: {
    type: Number,
    default: 60, // 60% of each purchase goes to prize pool
    min: 0,
    max: 100
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: 'Accumulated prize pool from player purchases (60% of purchases)'
  },
  // Timer control fields
  contestStartDate: {
    type: Date,
    default: null
  },
  contestEndDate: {
    type: Date,
    default: null
  },
  contestDuration: {
    type: Number,
    default: 7 // Default 7 days
  },
  contestPaused: {
    type: Boolean,
    default: false
  },
  pauseStartTime: {
    type: Date,
    default: null
  },
  nextDistribution: {
    type: Date,
    default: function() {
      // Default to 7 days from now
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date;
    }
  }
}, {
  timestamps: true
});

// Method to add contribution to prize pool
prizePoolSchema.methods.addContribution = function(amount) {
  this.totalAmount += amount;
  this.lastUpdated = new Date();
  return this.save();
};

// Method to distribute prize pool to top 3 players
prizePoolSchema.methods.distributeToTopPlayers = async function() {
  if (this.totalAmount < 10) {
    throw new Error('Insufficient funds in prize pool (minimum $10 required)');
  }

  // Get top 3 players by score
  const Score = require('./Score');
  const topPlayers = await Score.find()
    .sort({ score: -1 })
    .limit(3)
    .populate('userId', 'username email');

  if (topPlayers.length === 0) {
    throw new Error('No players found for distribution');
  }

  const distribution = {
    totalDistributed: this.totalAmount,
    winners: [],
    distributionBreakdown: {
      firstPlace: { percentage: 60, amount: this.totalAmount * 0.6 },
      secondPlace: { percentage: 30, amount: this.totalAmount * 0.3 },
      thirdPlace: { percentage: 10, amount: this.totalAmount * 0.1 }
    }
  };

  // Distribute to winners
  for (let i = 0; i < topPlayers.length; i++) {
    const player = topPlayers[i];
    const place = i + 1;
    let percentage, amount;
    
    switch (place) {
      case 1:
        percentage = 60;
        amount = this.totalAmount * 0.6;
        break;
      case 2:
        percentage = 30;
        amount = this.totalAmount * 0.3;
        break;
      case 3:
        percentage = 10;
        amount = this.totalAmount * 0.1;
        break;
    }

    distribution.winners.push({
      userId: player.userId._id,
      username: player.userId.username,
      email: player.userId.email,
      place: place,
      score: player.score,
      percentage: percentage,
      amount: amount
    });
  }

  // Clear the prize pool
  this.totalAmount = 0;
  this.lastUpdated = new Date();
  await this.save();

  return distribution;
};

// Method to distribute prize pool (legacy - for manual distribution)
prizePoolSchema.methods.distributePrize = function(amount) {
  if (amount > this.totalAmount) {
    throw new Error('Insufficient funds in prize pool');
  }
  this.totalAmount -= amount;
  this.lastUpdated = new Date();
  return this.save();
};

// Static method to get or create the main prize pool
prizePoolSchema.statics.getMainPrizePool = async function() {
  let prizePool = await this.findOne({ isActive: true });
  if (!prizePool) {
    prizePool = new this({
      totalAmount: 0,
      contributionPercentage: 60, // 60% of purchases go to prize pool
      isActive: true
    });
    await prizePool.save();
  }
  return prizePool;
};

module.exports = mongoose.model('PrizePool', prizePoolSchema); 