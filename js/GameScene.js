class GameScene extends Scene {
    constructor(game) {
        super(game);
        this.player = null;
        this.obstacles = [];
        this.score = 0;
        this.gameTime = 0;
        this.obstacleSpawnTimer = 0;
        this.obstacleSpawnInterval = 2000; // Spawn every 2 seconds
        this.baseSpeed = 1; // Reduced from 2 to 1 for slower movement
        this.currentSpeed = this.baseSpeed;
        this.difficultyLevel = 0; // Track difficulty level
        this.obstaclesSinceLastDifficulty = 0; // Count obstacles since last difficulty increase
        this.soundManager = game.getSoundManager();
        this.gravityDelay = 5000; // 5 seconds delay before gravity
        this.gravityTimer = 0;
        this.gravityActive = false;
        this.waitingForFirstInput = true;
        this._switchingToGameOver = false; // Flag to prevent multiple switches
        this._gameOverSoundPlayed = false; // Flag to prevent multiple game over sound plays
    }
    
    async enter() {
        console.log('GameScene: Entering game scene...');
        super.enter();
        this.reset();
        
        // Start anti-cheat session
        console.log('🎮 GameScene: Checking for AntiCheatManager...');
        if (window.antiCheatManager) {
            console.log('🎮 GameScene: AntiCheatManager found, starting session...');
            const sessionStarted = await window.antiCheatManager.startSession();
            if (!sessionStarted) {
                console.warn('🎮 GameScene: Failed to start anti-cheat session');
            } else {
                console.log('🎮 GameScene: Anti-cheat session started successfully');
            }
        } else {
            console.warn('🎮 GameScene: AntiCheatManager not available!');
        }
        
        // Consume an attempt when the game starts
        const attemptsManager = this.game.getAttemptsManager();
        if (attemptsManager && attemptsManager.hasAttempts()) {
            try {
                await attemptsManager.useAttempt();
                console.log('GameScene: Attempt consumed at game start. Remaining attempts:', attemptsManager.getAttempts());
                
                // Remove any existing attempts counter for clean gameplay
                const existingCounters = [
                    document.getElementById('attemptsCounter'),
                    document.getElementById('startAttemptsCounter'),
                    document.getElementById('gameOverAttemptsCounter')
                ];
                existingCounters.forEach(counter => {
                    if (counter) {
                        counter.remove();
                    }
                });
            } catch (error) {
                console.error('GameScene: Failed to consume attempt:', error);
            }
        } else {
            console.log('GameScene: No attempts available or attempts system not ready');
        }
        
        // Set current score for attempts manager
        window.currentGameScore = this.score;
        
        console.log('GameScene: Game scene entered successfully');
    }
    
    reset() {
        // Initialize player
        this.player = new Player(150, this.height / 2);
        
        // Clear obstacles
        this.obstacles = [];
        
        // Reset game state
        this.score = 0;
        this.gameTime = 0;
        this.obstacleSpawnTimer = 0;
        this.currentSpeed = this.baseSpeed;
        this.difficultyLevel = 0;
        this.obstaclesSinceLastDifficulty = 0;
        this.waitingForFirstInput = true;
        this.gravityDelay = 5000; // 5 seconds delay before gravity
        this.gravityTimer = 0;
        this.gravityActive = false;
        this._switchingToGameOver = false; // Reset flag
        this._gameOverSoundPlayed = false; // Reset flag
    }
    
    update(deltaTime) {
        if (!this.player.isAlive) {
            // Play game over sound only once
            if (this.soundManager && !this._gameOverSoundPlayed) {
                this.soundManager.playSound('gameOver').catch(error => console.warn('Failed to play game over sound:', error));
                this._gameOverSoundPlayed = true;
            }
            
            // Game over - switch to game over scene immediately
            if (!this._switchingToGameOver) {
                this._switchingToGameOver = true;
                console.log('GameScene: Player died, switching to Game Over scene');
                this.switchScene('gameOver');
            }
            return;
        }
        
        this.gameTime += deltaTime;
        this.obstacleSpawnTimer += deltaTime;
        
        // Wait for first input before enabling gravity/jumping and obstacle movement
        if (this.waitingForFirstInput) {
            if (this.inputManager.isActionPressed()) {
                this.waitingForFirstInput = false;
                console.log('Game started - first input detected');
                
                // Record game start event
                if (window.antiCheatManager) {
                    window.antiCheatManager.recordInputEvent('gameStart', {
                        gameTime: this.gameTime
                    });
                }
                
                // Set speed for all existing obstacles when game starts
                this.obstacles.forEach(obstacle => {
                    obstacle.setSpeed(this.currentSpeed);
                });
            }
            return; // Don't update anything until first input
        }
        
        // Gravity delay logic
        if (!this.gravityActive) {
            this.gravityTimer += deltaTime;
            if (this.gravityTimer >= this.gravityDelay) {
                this.gravityActive = true;
            }
        }
        
        // Update player
        this.player.update(deltaTime, this.inputManager, !this.waitingForFirstInput);
        this.player.checkBounds(this.height, this.obstacles);
        
        // Spawn obstacles only after 5 seconds have passed AND game has started
        if (this.gameTime >= 5000 && this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
            this.spawnObstacle();
            this.obstacleSpawnTimer = 0;
        }
        
        // Update obstacles only if game has started
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.update(deltaTime);
            
            // Check collision
            if (obstacle.checkCollision(this.player)) {
                this.player.isAlive = false;
                return;
            }
            
            // Check if obstacle passed
            if (obstacle.isPassed(this.player.x)) {
                this.score++;
                // Update current score for attempts manager
                window.currentGameScore = this.score;
                // Play score sound
                if (this.soundManager) {
                    this.soundManager.playSound('score').catch(error => console.warn('Failed to play score sound:', error));
                }
            }
            
            // Remove off-screen obstacles
            if (obstacle.isOffScreen()) {
                this.obstacles.splice(i, 1);
            }
        }
        
        // Increase difficulty over time
        if (this.obstaclesSinceLastDifficulty >= 5) { // Increase difficulty every 5 obstacles
            this.increaseDifficulty();
            this.obstaclesSinceLastDifficulty = 0; // Reset counter
        }
    }
    
    render() {
        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        // Flat, monotone background
        ctx.fillStyle = '#f4f4f4';
        ctx.fillRect(0, 0, width, height);
        
        // Draw obstacles
        this.obstacles.forEach(obstacle => {
            obstacle.render(ctx);
        });
        // Draw player
        this.player.render(ctx);
        // Draw score
        this.renderScore();
        // Draw 'Get Ready!' message until first input
        if (this.waitingForFirstInput) {
            this.renderGetReadyMessage();
        }
    }
    
    renderScore() {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.fillStyle = '#333';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Score: ${this.score}`, 20, 20);
        
        // Show countdown timer before first obstacle
        if (this.gameTime < 5000) {
            const timeLeft = Math.ceil((5000 - this.gameTime) / 1000);
            ctx.fillStyle = '#FF6B6B';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`First obstacle in: ${timeLeft}s`, this.width / 2, 30);
        }
        
        ctx.restore();
    }
    
    spawnObstacle() {
        // Fixed gap size between 150-180px
        const requestedGapSize = 150 + Math.random() * 30; // Random between 150-180px
        
        const obstacle = new ObstaclePair(
            this.width + 100, // Spawn just off screen
            this.width,
            this.height,
            requestedGapSize
        );
        
        obstacle.setSpeed(this.currentSpeed);
        this.obstacles.push(obstacle);
        
        // Log gap size for debugging
        console.log(`Spawned obstacle - Score: ${this.score}, Difficulty: ${this.difficultyLevel}, Requested gap: ${requestedGapSize.toFixed(1)}px, Actual gap: ${obstacle.gapSize.toFixed(1)}px`);
        this.obstaclesSinceLastDifficulty++; // Increment obstacle count
    }
    
    increaseDifficulty() {
        // Increase difficulty level
        this.difficultyLevel++;
        
        // Increase speed based on difficulty level
        this.currentSpeed = this.baseSpeed + (this.difficultyLevel * 0.2);
        
        // Decrease spawn interval based on difficulty level
        this.obstacleSpawnInterval = Math.max(800, 2000 - (this.difficultyLevel * 150));
        
        // Update existing obstacles
        this.obstacles.forEach(obstacle => {
            obstacle.setSpeed(this.currentSpeed);
        });
        
        console.log(`Difficulty increased to level ${this.difficultyLevel} - Speed: ${this.currentSpeed.toFixed(1)}, Spawn interval: ${this.obstacleSpawnInterval}ms`);
    }
    
    getScore() {
        return this.score;
    }
    
    renderGetReadyMessage() {
        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;
        
        ctx.save();
        
        // Draw semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);
        
        // Draw "Get Ready!" message
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Get Ready!', width / 2, height / 2 - 50);
        
        // Draw instruction
        ctx.fillStyle = '#FFF';
        ctx.font = '18px Arial';
        ctx.fillText('Practice your timing before obstacles appear', width / 2, height / 2);
        
        ctx.restore();
    }
    
    setupUI() {
        // Leaderboard button removed - no longer needed
    }
} 