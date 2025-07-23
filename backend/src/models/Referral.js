const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
  referrerUserId: {
    type: String, // Firebase UID of the user who made the referral
    required: true
  },
  referrerUsername: {
    type: String,
    required: true,
    trim: true
  },
  refereeUserId: {
    type: String, // Firebase UID of the user who was referred
    required: true
  },
  refereeUsername: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed' // Most referrals will be completed immediately upon registration
  },
  attemptsGranted: {
    type: Boolean,
    default: false
  },
  referrerAttemptsGranted: {
    type: Number,
    default: 0
  },
  refereeAttemptsGranted: {
    type: Number,
    default: 0
  },
  eventStartDate: {
    type: Date,
    required: true
  },
  eventEndDate: {
    type: Date,
    required: true
  },
  eventId: {
    type: String,
    required: true,
    index: true
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, { 
  timestamps: true,
  indexes: [
    { referrerUserId: 1 },
    { refereeUserId: 1 },
    { referrerUsername: 1 },
    { refereeUsername: 1 },
    { status: 1 },
    { createdAt: -1 }
  ]
});

// Compound index to prevent duplicate referrals
ReferralSchema.index({ referrerUserId: 1, refereeUserId: 1 }, { unique: true });

// Virtual to get total referrals for a user
ReferralSchema.statics.getReferralCount = function(userId) {
  return this.countDocuments({ 
    referrerUserId: userId, 
    status: 'completed',
    attemptsGranted: true 
  });
};

// Virtual to get total successful referrals received by a user
ReferralSchema.statics.getReferralsReceived = function(userId) {
  return this.countDocuments({ 
    refereeUserId: userId, 
    status: 'completed' 
  });
};

// Method to check if a referral already exists
ReferralSchema.statics.referralExists = function(referrerUserId, refereeUserId) {
  return this.findOne({ referrerUserId, refereeUserId });
};

// Method to count referrals made by a user in the current event
ReferralSchema.statics.getReferralCountForEvent = function(userId, eventId) {
  return this.countDocuments({
    referrerUserId: userId,
    eventId: eventId,
    status: 'completed',
    attemptsGranted: true
  });
};

// Method to check if user has reached referral limit for current event
ReferralSchema.statics.hasReachedReferralLimit = async function(userId, eventId, limit = 5) {
  const count = await this.getReferralCountForEvent(userId, eventId);
  return count >= limit;
};

// Method to generate event ID from contest dates
ReferralSchema.statics.generateEventId = function(startDate, endDate) {
  const start = new Date(startDate).toISOString().split('T')[0];
  const end = new Date(endDate).toISOString().split('T')[0];
  return `event_${start}_${end}`;
};

module.exports = mongoose.model('Referral', ReferralSchema);
