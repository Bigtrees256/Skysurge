# SkySurge 🦅

A modern, full-stack arcade flying game with user authentication, leaderboards, payment processing, and anti-cheat protection. Built with HTML5 Canvas, Node.js, MongoDB, and Firebase.

## 🎮 Game Features

- **Intuitive Controls**: Use SPACE, ARROW UP, or CLICK/TAP to navigate
- **Progressive Difficulty**: Speed and gap size change as you advance
- **Real-time Leaderboards**: Compete with players worldwide
- **User Authentication**: Secure Firebase-based login system
- **Attempts System**: Purchase additional attempts with Stripe integration
- **Anti-cheat Protection**: Server-side validation and session tracking
- **Mobile Responsive**: Optimized for both desktop and mobile devices

## 🏗️ Architecture

### Frontend (Client-side)
- **HTML5 Canvas**: Game rendering and physics
- **Modular JavaScript**: Scene-based architecture with ES6 classes
- **Firebase Auth**: User authentication and session management
- **Stripe Elements**: Secure payment processing
- **Responsive Design**: Mobile-first approach with touch controls

### Backend (Server-side)
- **Node.js + Express**: RESTful API server
- **MongoDB**: User data, scores, and game sessions
- **Firebase Admin**: Server-side authentication verification
- **Stripe API**: Payment processing and webhook handling
- **Anti-cheat System**: Server-side game validation

### Core Game Components
- **Game.js**: Main game loop and scene management
- **AntiCheatManager.js**: Client-side session tracking
- **AuthManager.js**: Firebase authentication wrapper
- **PaymentManager.js**: Stripe payment integration
- **Leaderboard.js**: Real-time score management

## 🚀 Quick Start

### For Players
1. Visit the deployed game URL
2. Create an account or sign in with Firebase
3. Set up your username
4. Start playing and compete on the leaderboard!

### For Developers

#### Local Development
```bash
# Clone the repository
git clone https://github.com/your-username/skysurge.git
cd skysurge

# Set up backend
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm start

# Open frontend
# Navigate to http://localhost:3000 in your browser
```

#### Production Deployment
See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

## 🔧 Technical Stack

### Frontend Technologies
- **HTML5 Canvas**: Game rendering and physics
- **Vanilla JavaScript**: ES6+ with modular architecture
- **Firebase SDK**: Authentication and real-time features
- **Stripe Elements**: Secure payment forms
- **CSS3**: Responsive design and animations

### Backend Technologies
- **Node.js**: Runtime environment
- **Express.js**: Web framework and API server
- **MongoDB**: NoSQL database with Mongoose ODM
- **Firebase Admin**: Server-side authentication
- **Stripe API**: Payment processing
- **Helmet**: Security middleware
- **CORS**: Cross-origin resource sharing

### Infrastructure
- **Render**: Cloud hosting platform
- **MongoDB Atlas**: Cloud database
- **Firebase**: Authentication and hosting
- **Stripe**: Payment processing
- **GitHub**: Version control and CI/CD

## 🛡️ Security Features

- **Firebase Authentication**: Secure user management
- **JWT Tokens**: Server-side authentication verification
- **Anti-cheat System**: Server-side game validation
- **Rate Limiting**: API abuse prevention
- **CORS Protection**: Cross-origin request filtering
- **Input Validation**: Sanitized user inputs
- **Environment Variables**: Secure credential management

## 📊 Game Features

### ✅ Implemented
- User authentication and profiles
- Real-time leaderboards
- Payment processing (Stripe)
- Anti-cheat protection
- Mobile responsive design
- Progressive difficulty
- Sound effects and music
- Admin dashboard
- Prize pool system

### 🔮 Future Enhancements
- [ ] Particle effects for collisions
- [ ] Multiple character skins
- [ ] Power-ups and special abilities
- [ ] Tournament system
- [ ] Social features and sharing
- [ ] Achievement system
- [ ] Replay system

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/user` - Get user profile

### Game Endpoints
- `GET /api/scores/leaderboard` - Get top scores
- `POST /api/scores` - Submit new score
- `POST /api/game-sessions/start` - Start game session
- `POST /api/game-sessions/update` - Update session data

### Payment Endpoints
- `POST /api/payments/create-checkout-session` - Create Stripe session
- `POST /api/payments/grant-attempts` - Grant purchased attempts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, please check:
1. [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for deployment issues
2. GitHub Issues for bug reports
3. API documentation for integration help

---

**SkySurge** - Soar to new heights! 🦅✨
