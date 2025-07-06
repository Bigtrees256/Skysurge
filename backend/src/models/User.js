const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String }, // Made optional for Google OAuth users
  googleId: { type: String, unique: true, sparse: true }, // For Google OAuth
  email: { type: String, unique: true, sparse: true } // For Google OAuth
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema); 