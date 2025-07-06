require('dotenv').config();
const express = require('express');
const path = require('path');
const connectDB = require('./db');
const passport = require('./config/passport');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import routes
const authRoutes = require('./routes/auth');
const scoreRoutes = require('./routes/scores');
const attemptsRoutes = require('./routes/attempts');
const paymentRoutes = require('./routes/payments');

// Import middleware
const { rateLimit } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000', 
  'http://127.0.0.1:3000', 
  'http://localhost:8080', 
  'http://127.0.0.1:8080',
  'https://skysurge-backend.onrender.com',
  'https://skysurge.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from the parent directory (frontend files)
app.use(express.static(path.join(__dirname, '..', '..')));

// Rate limiting
app.use(rateLimit(15 * 60 * 1000, 100)); // 100 requests per 15 minutes

// Initialize Passport (without sessions, using JWT)
app.use(passport.initialize());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/attempts', attemptsRoutes);
app.use('/api/payments', paymentRoutes);

// Google OAuth routes (these need to be at root level for passport)
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const jwt = require('jsonwebtoken');
      // Generate JWT token for the user
      const token = jwt.sign({ 
        userId: req.user._id, 
        username: req.user.username 
      }, process.env.JWT_SECRET, { expiresIn: '24h' });
      
      // Redirect to frontend with token
      const redirectUrl = process.env.NODE_ENV === 'production' 
        ? `https://skysurge-backend.onrender.com?googleLogin=success&token=${token}`
        : `http://localhost:3000?googleLogin=success&token=${token}`;
      res.redirect(redirectUrl);
    } catch (err) {
      console.error('Google OAuth callback error:', err);
      const errorUrl = process.env.NODE_ENV === 'production'
        ? 'https://skysurge-backend.onrender.com?googleLogin=error'
        : 'http://localhost:3000?googleLogin=error';
      res.redirect(errorUrl);
    }
  }
);

// Fallback: serve index.html for all non-API, non-file requests (SPA support)
app.get('*', (req, res, next) => {
  if (!req.originalUrl.startsWith('/api') && !req.originalUrl.startsWith('/auth') && !req.originalUrl.includes('.')) {
    res.sendFile(path.join(__dirname, '..', '..', 'index.html'));
  } else {
    next();
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }
  
  // Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: `${field} already exists`,
      field: field
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Connect to MongoDB and start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 SkySurge Backend server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API base: http://localhost:${PORT}/api`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
}); 