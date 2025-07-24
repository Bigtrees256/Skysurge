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
    // Production-ready connection options
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds
    };

    await mongoose.connect(MONGO_URI, options);
    console.log('✅ MongoDB connected successfully');
    console.log('✅ Database name:', mongoose.connection.name);

    // Only clean up in development
    if (process.env.NODE_ENV === 'development') {
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
    }

    // Set up connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);

    // In development, continue without database for testing frontend
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Running in development mode without database');
      console.log('⚠️ Database-dependent features will not work');
    } else {
      console.error('❌ Production deployment requires database connection');
      process.exit(1);
    }
  }
};

module.exports = connectDB; 