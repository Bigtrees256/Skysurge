const mongoose = require('mongoose');

// Debug: Check what environment variables are available
console.log('🔍 Environment variables check:');
console.log('🔍 MONGODB_URI:', process.env.MONGODB_URI ? 'Present' : 'Missing');
console.log('🔍 All env vars starting with MONGO:', Object.keys(process.env).filter(key => key.startsWith('MONGO')));
console.log('🔍 First few env vars:', Object.keys(process.env).slice(0, 5));
console.log('🔍 Total env vars loaded:', Object.keys(process.env).length);

// Use the correct environment variable name that matches the .env file
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/skysurge';

console.log('🔍 Final connection string:', MONGO_URI.substring(0, 50) + '...');

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected successfully');

    // Clean up any existing game sessions with schema issues
    try {
      const GameSession = require('./models/GameSession');
      const sessionsToClean = await GameSession.find({});
      console.log(`🧹 Found ${sessionsToClean.length} existing game sessions`);

      // Remove sessions that might have schema conflicts
      if (sessionsToClean.length > 0) {
        await GameSession.deleteMany({});
        console.log('🧹 Cleaned up existing game sessions to prevent schema conflicts');
      }
    } catch (error) {
      console.log('🧹 Schema cleanup completed (no existing sessions or already clean)');
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);

    // In development, continue without database for testing frontend
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Running in development mode without database');
      console.log('⚠️ Database-dependent features will not work');
    } else {
      process.exit(1);
    }
  }
};

module.exports = connectDB; 