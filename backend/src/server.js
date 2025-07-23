const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('./db');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Initialize Firebase Admin
const admin = require('./firebaseAdmin');

// Import routes
const authRoutes = require('./routes/auth');
const scoreRoutes = require('./routes/scores');
const attemptsRoutes = require('./routes/attempts');
const paymentRoutes = require('./routes/payments');
const gameSessionRoutes = require('./routes/gameSessions');
const prizePoolRoutes = require('./routes/prizePool');
const configRoutes = require('./routes/config');
const adsRoutes = require('./routes/ads');
const referralRoutes = require('./routes/referrals');

// Import middleware
const { authenticateToken, optionalAuth } = require('./middleware/auth');
const { apiLimiter } = require('./middleware/rateLimit');
const requestLogger = require('./middleware/requestLogger');

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.gstatic.com", "https://apis.google.com", "https://js.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://accounts.google.com", "https://oauth2.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
// CORS configuration for production and development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // Production: Only allow specific domains
      const allowedOrigins = [
        'https://skysurge-frontend.onrender.com', // Your frontend domain
        'https://skysurge.onrender.com', // Alternative domain
        'https://www.skysurge.com', // Custom domain if you have one
      ];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.log('❌ CORS blocked origin:', origin);
        return callback(new Error('Not allowed by CORS'));
      }
    } else {
      // Development: Allow localhost and file protocol
      if (origin.startsWith('file://')) return callback(null, true);

      if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
        return callback(null, true);
      }

      const devOrigins = [
        'http://localhost:8000', 'http://127.0.0.1:8000',
        'http://localhost:8080', 'http://127.0.0.1:8080',
        'http://localhost:3000', 'http://127.0.0.1:3000',
        'http://localhost:5000', 'http://127.0.0.1:5000'
      ];

      if (devOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log('❌ CORS blocked origin in dev:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());

// Request logging middleware
app.use(requestLogger);

// Connect to database
connectDB();

// Rate limiting - enabled for production
if (process.env.NODE_ENV === 'production') {
  app.use(apiLimiter);
  console.log('✅ Rate limiting enabled for production');
} else {
  console.log('⚠️  Rate limiting disabled for development');
}

// API routes
console.log('🔧 Mounting API routes...');
app.use('/api/auth', authRoutes);
console.log('🔧 Mounted /api/auth');
app.use('/api/scores', scoreRoutes);
console.log('🔧 Mounted /api/scores');
app.use('/api/attempts', attemptsRoutes);
console.log('🔧 Mounted /api/attempts');
app.use('/api/payments', paymentRoutes);
console.log('🔧 Mounted /api/payments');
app.use('/api/prize-pool', prizePoolRoutes);
console.log('🔧 Mounted /api/prize-pool');
app.use('/api/game-sessions', gameSessionRoutes);
console.log('🔧 Mounted /api/game-sessions');
app.use('/api/config', configRoutes);
console.log('🔧 Mounted /api/config');
app.use('/api/ads', adsRoutes);
console.log('🔧 Mounted /api/ads');
app.use('/api/referrals', referralRoutes);
console.log('🔧 Mounted /api/referrals');

// Serve static files from the frontend
const frontendPath = path.join(__dirname, '../../');
app.use(express.static(frontendPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
  etag: true,
  lastModified: true
}));
console.log('🔧 Serving static files from:', frontendPath);

// Serve admin pages with proper MIME types
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(frontendPath, req.path + '.html'), (err) => {
    if (err) {
      res.sendFile(path.join(frontendPath, 'admin.html'));
    }
  });
});

// Handle SPA routing - serve index.html for non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
    return next();
  }

  // Serve index.html for all other routes
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: mongoose.connection.readyState === 1,
      state: mongoose.connection.readyState
    },
    firebase: {
      initialized: admin.apps.length > 0
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404 Handler caught request:', req.method, req.originalUrl);
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 