# SkySurge

A modern, modular flappy-style game built with HTML5 Canvas and JavaScript. Players control a character that must navigate through obstacles by flapping to gain altitude.

## 🎮 How to Play

- **Controls**: Use SPACE, ARROW UP, or CLICK/TAP to make your character flap upward
- **Objective**: Navigate through the gaps in obstacles to score points
- **Scoring**: Gain 1 point for each obstacle pair you successfully pass
- **Game Over**: The game ends when you hit an obstacle or go off-screen
- **Leaderboard**: Press L during gameplay to toggle leaderboard visibility
- **Sound**: Toggle sound effects using the sound button on the start screen

## 🏗️ Game Architecture

The game is built using a modular scene-based architecture:

### Core Components

- **Game.js**: Main game loop and scene management
- **Scene.js**: Base scene class for all game scenes
- **InputManager.js**: Handles keyboard, mouse, and touch input
- **Player.js**: Player character with physics and collision detection
- **Obstacle.js**: Obstacle system with pairs and scrolling movement
- **SoundManager.js**: Audio system with procedural sound effects
- **Leaderboard.js**: High score tracking with localStorage persistence

### Game Scenes

1. **StartScene**: Welcome screen with animated title and instructions
2. **GameScene**: Main gameplay with player, obstacles, and scoring
3. **GameOverScene**: Final score display with restart option

### Features

- ✅ **Modular Design**: Easy to extend and modify
- ✅ **Responsive Input**: Supports keyboard, mouse, and touch
- ✅ **Progressive Difficulty**: Speed and gap size change over time
- ✅ **Smooth Animations**: Animated UI elements and smooth gameplay
- ✅ **Collision Detection**: Precise collision system
- ✅ **Score Tracking**: Real-time score display
- ✅ **Sound Effects**: Procedural audio for all game events
- ✅ **Leaderboard System**: Persistent high score tracking
- ✅ **High Score Notifications**: Celebrate new records

## 🚀 Getting Started

1. Open `index.html` in a modern web browser
2. The game will automatically start with the welcome screen
3. Click or press any action key to begin playing
4. Try to achieve the highest score possible!

## 🎯 Game Mechanics

### Player Physics
- Gravity affects the player continuously
- Flapping provides upward velocity
- Maximum fall speed is limited for playability

### Obstacle System
- Obstacles spawn at regular intervals
- Each obstacle pair has a random gap position
- Gap size decreases as score increases
- Speed increases over time for progressive difficulty

### Scoring System
- 1 point per obstacle pair passed
- Score is displayed in real-time
- Final score shown on game over screen

## 🔧 Technical Details

### Browser Compatibility
- Modern browsers with HTML5 Canvas support
- ES6+ JavaScript features
- Touch support for mobile devices

### Performance
- 60 FPS game loop using requestAnimationFrame
- Efficient collision detection
- Object pooling for obstacles (future enhancement)

## 🎨 Visual Design

- Clean, minimalist design with simple shapes
- Gradient backgrounds for visual appeal
- Color-coded elements for clarity
- Smooth animations and transitions

## 🔮 Future Enhancements

- [x] High score persistence (localStorage)
- [x] Sound effects and background music
- [ ] Particle effects for collisions and scoring
- [ ] Multiple character skins
- [x] Leaderboard integration
- [ ] Mobile-optimized controls
- [ ] Power-ups and special abilities
- [ ] Different obstacle types
- [ ] Background music tracks
- [ ] Sound volume controls
- [ ] Online leaderboard sharing

## 📝 Development

The game is structured for easy modification and extension:

- Add new scenes by extending the `Scene` class
- Modify game mechanics in the respective component files
- Adjust difficulty parameters in `GameScene.js`
- Customize visuals by modifying render methods

## 🎮 Enjoy Playing!

SkySurge is designed to be both fun and challenging. The progressive difficulty system ensures that players of all skill levels can enjoy the game while providing a challenge for experienced players.

Happy gaming! 🚀 
