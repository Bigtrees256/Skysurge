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
        this.difficultyTimer = 0;
        this.difficultyInterval = 10000; // Increase difficulty every 10 seconds
        this.soundManager = game.getSoundManager();
        this.leaderboard = game.getLeaderboard();
        this.showLeaderboard = false;
        this.gravityDelay = 5000; // 5 seconds delay before gravity
        this.gravityTimer = 0;
        this.gravityActive = false;
        this.waitingForFirstInput = true;
    }
    
    enter() {
        console.log('GameScene: Entering game scene...');
        super.enter();
        this.reset();
        
        // Set current score for attempts manager
        window.currentGameScore = this.score;
        
        // Show attempts counter if attempts system is ready
        const attemptsUI = this.game.getAttemptsUI();
        if (attemptsUI) {
            const attemptsCounter = attemptsUI.showAttemptsCounter();
            this.game.getUIOverlay().appendChild(attemptsCounter);
        }
        
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
        this.difficultyTimer = 0;
        this.waitingForFirstInput = true;
        this.gravityDelay = 5000; // 5 seconds delay before gravity
        this.gravityTimer = 0;
        this.gravityActive = false;
    }
    
    update(deltaTime) {
        if (!this.player.isAlive) {
            // Play game over sound
            if (this.soundManager) {
                this.soundManager.playSound('gameOver');
            }
            // Game over - switch to game over scene
            this.switchScene('gameOver');
            return;
        }
        
        this.gameTime += deltaTime;
        this.obstacleSpawnTimer += deltaTime;
        this.difficultyTimer += deltaTime;
        
        // Wait for first input before enabling gravity/jumping
        if (this.waitingForFirstInput) {
            if (this.inputManager.isActionPressed()) {
                this.waitingForFirstInput = false;
            }
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
        this.player.checkBounds(this.height);
        
        // Spawn obstacles only after 5 seconds have passed
        if (this.gameTime >= 5000 && this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
            this.spawnObstacle();
            this.obstacleSpawnTimer = 0;
        }
        
        // Update obstacles
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
                    this.soundManager.playSound('score');
                }
            }
            
            // Remove off-screen obstacles
            if (obstacle.isOffScreen()) {
                this.obstacles.splice(i, 1);
            }
        }
        
        // Increase difficulty over time
        if (this.difficultyTimer >= this.difficultyInterval) {
            this.increaseDifficulty();
            this.difficultyTimer = 0;
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
        // Draw leaderboard if requested
        if (this.showLeaderboard) {
            this.renderLeaderboard();
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
        const obstacle = new ObstaclePair(
            this.width + 100, // Spawn just off screen
            this.width,
            this.height,
            150 - Math.min(this.score * 2, 50) // Decrease gap size with score
        );
        
        obstacle.setSpeed(this.currentSpeed);
        this.obstacles.push(obstacle);
    }
    
    increaseDifficulty() {
        // Increase speed (smaller increments for slower progression)
        this.currentSpeed += 0.2; // Reduced from 0.5 to 0.2
        
        // Decrease spawn interval
        this.obstacleSpawnInterval = Math.max(1000, this.obstacleSpawnInterval - 100);
        
        // Update existing obstacles
        this.obstacles.forEach(obstacle => {
            obstacle.setSpeed(this.currentSpeed);
        });
    }
    
    getScore() {
        return this.score;
    }
    
    renderLeaderboard() {
        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;
        
        // Draw leaderboard in the top right corner
        const leaderboardWidth = 280;
        const leaderboardHeight = 200;
        const x = width - leaderboardWidth - 20;
        const y = 20;
        
        this.leaderboard.render(ctx, x, y, leaderboardWidth, leaderboardHeight, this.score);
    }
    
    toggleLeaderboard() {
        this.showLeaderboard = !this.showLeaderboard;
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