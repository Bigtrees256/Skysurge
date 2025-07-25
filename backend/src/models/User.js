const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String }, // Made optional for Google OAuth users
  googleId: { type: String, unique: true, sparse: true }, // For Google OAuth
  email: { type: String, unique: true, sparse: true }, // For Firebase Authentication
  firebaseUid: { type: String, unique: true, sparse: true }, // For Firebase Authentication
  isAdmin: { type: Boolean, default: false }, // Admin role field
  adminEmail: { type: String } // Email for admin identification
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema); 