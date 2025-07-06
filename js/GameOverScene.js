class GameOverScene extends Scene {
    constructor(game) {
        super(game);
        this.finalScore = 0;
        this.animationTime = 0;
        this.leaderboard = game.getLeaderboard();
        this.scoreAdded = false;
        this.isNewHighScore = false;
        this.scorePosition = 0;
        this._restarting = false; // Prevent multiple restarts
    }
    
    enter() {
        super.enter();
        this.animationTime = 0;
        // Get the final score from the game scene
        this.finalScore = this.game.scenes.game.getScore();
        
        // Add score to leaderboard
        if (!this.scoreAdded && this.finalScore > 0) {
            // Get user info and token from localStorage
            let username = 'Player';
            let token = null;
            try {
                const userStr = localStorage.getItem('currentUser');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    if (user && user.username) username = user.username;
                }
                token = localStorage.getItem('authToken');
            } catch (e) {
                // fallback to default
            }
            // Submit score to backend
            this.leaderboard.addScore(this.finalScore, username, token);
            this.isNewHighScore = this.leaderboard.isNewHighScore(this.finalScore);
            this.scoreAdded = true;
        }
        this._restarting = false; // Reset flag on enter
    }
    
    update(deltaTime) {
        this.animationTime += deltaTime;
        if (this._restarting) return;
        // Check for input to restart game
        if (this.inputManager.isActionPressed()) {
            this._restarting = true;
            // Check if player has attempts
            const attemptsManager = this.game.getAttemptsManager();
            
            if (attemptsManager && attemptsManager.hasAttempts()) {
                // Use an attempt and restart game
                attemptsManager.useAttempt().then(() => {
                    if (this.game.getAttemptsUI()) {
                        this.game.getAttemptsUI().updateAttemptsDisplay();
                    }
                    this.switchScene('game');
                });
            } else if (attemptsManager) {
                // Show attempts UI
                this.game.getAttemptsUI().show();
            } else {
                // Attempts system not ready, restart game anyway
                this.switchScene('game');
            }
        }
    }
    
    render() {
        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw flat light gray background (monotone Dino style)
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, width, height);
        
        // Draw game over panel
        this.renderGameOverPanel();
        
        // Draw leaderboard
        this.renderLeaderboard();
    }
    
    renderGameOverPanel() {
        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;
        
        // Panel background
        const panelWidth = 400;
        const panelHeight = 300;
        const panelX = (width - panelWidth) / 2;
        const panelY = (height - panelHeight) / 2;
        
        ctx.save();
        
        // Draw panel background with shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        
        ctx.restore();
        
        // Draw panel border
        ctx.save();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        ctx.restore();
        
        // Draw game over text
        ctx.save();
        ctx.fillStyle = '#FF6B6B';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Game Over', width / 2, panelY + 80);
        ctx.restore();
        
        // Draw score
        ctx.save();
        ctx.fillStyle = '#333';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Final Score: ${this.finalScore}`, width / 2, panelY + 140);
        
        // Draw high score indicator
        if (this.isNewHighScore) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 18px Arial';
            ctx.fillText('🏆 NEW HIGH SCORE! 🏆', width / 2, panelY + 170);
        }
        ctx.restore();
        
        // Draw restart instruction with animation
        ctx.save();
        const pulse = Math.sin(this.animationTime * 0.005) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#666';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        
        const attemptsManager = this.game.getAttemptsManager();
        if (attemptsManager) {
            const attempts = attemptsManager.getAttempts();
            
            if (attempts > 0) {
                ctx.fillText('Tap to Play Again', width / 2, panelY + 200);
            } else {
                ctx.fillText('Tap to Get More Attempts', width / 2, panelY + 200);
            }
        } else {
            ctx.fillText('Tap to Play Again', width / 2, panelY + 200);
        }
        ctx.restore();
        
        // Draw additional info
        ctx.save();
        ctx.fillStyle = '#999';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Try to beat your high score!', width / 2, panelY + 240);
        ctx.restore();
    }
    
    renderLeaderboard() {
        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;
        
        // Draw leaderboard on the right side
        const leaderboardWidth = 300;
        const leaderboardHeight = 400;
        const x = width - leaderboardWidth - 20;
        const y = (height - leaderboardHeight) / 2;
        
        this.leaderboard.render(ctx, x, y, leaderboardWidth, leaderboardHeight, this.finalScore);
    }
    
    setupUI() {
        // Add "Get More Attempts" button when no attempts left
        const attemptsManager = this.game.getAttemptsManager();
        if (attemptsManager && !attemptsManager.hasAttempts()) {
            const attemptsButton = document.createElement('button');
            attemptsButton.textContent = '🎯 Get More Attempts';
            attemptsButton.className = 'ui-element';
            attemptsButton.style.cssText = `
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 15px 25px;
                background: linear-gradient(45deg, #FF6B6B, #FF8E53);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                font-family: Arial, sans-serif;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
            `;
            
            attemptsButton.addEventListener('mouseenter', () => {
                attemptsButton.style.transform = 'translateX(-50%) translateY(-2px)';
                attemptsButton.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4)';
            });
            
            attemptsButton.addEventListener('mouseleave', () => {
                attemptsButton.style.transform = 'translateX(-50%) translateY(0)';
                attemptsButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
            });
            
            attemptsButton.addEventListener('click', () => {
                this.game.getAttemptsUI().show();
            });
            
            this.uiOverlay.appendChild(attemptsButton);
        }
    }
} 