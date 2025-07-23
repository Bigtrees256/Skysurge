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
        // Remove the stored attempts count - always use fresh data
    }
    
    async enter() {
        this.animationTime = 0;
        // Get the final score from the game scene
        this.finalScore = this.game.scenes.game.getScore();
        
        console.log('GameOverScene: Entering with final score:', this.finalScore);
        
        // Add score to leaderboard with anti-cheat validation
        if (!this.scoreAdded && this.finalScore > 0) {
            console.log('GameOverScene: Submitting score:', this.finalScore);
            
            // End anti-cheat session and submit score
            let scoreSubmitted = false;
            console.log('🏁 GameOverScene: Checking for active anti-cheat session...');

            if (window.antiCheatManager) {
                console.log('🏁 GameOverScene: AntiCheatManager found');
                if (window.antiCheatManager.isSessionActive()) {
                    console.log('🏁 GameOverScene: Active session found, ending session and submitting score...');
                    scoreSubmitted = await window.antiCheatManager.endSession(this.finalScore);
                    if (!scoreSubmitted) {
                        console.warn('🏁 GameOverScene: Score submission blocked by anti-cheat system');
                    } else {
                        console.log('🏁 GameOverScene: Score submitted successfully via anti-cheat system');
                    }
                } else {
                    console.warn('🏁 GameOverScene: No active anti-cheat session found');
                }
            } else {
                console.warn('🏁 GameOverScene: AntiCheatManager not available');
            }
            
            // If anti-cheat submission failed, show error message
            if (!scoreSubmitted) {
                console.error('🏁 GameOverScene: Score submission failed - anti-cheat validation required');
                // You could show an error message to the user here
                // For now, we'll just log the error
            }

            // Dispatch events to notify other components
            document.dispatchEvent(new CustomEvent('gameOver', {
                detail: { score: this.finalScore }
            }));

            this.isNewHighScore = this.leaderboard.isNewHighScore(this.finalScore);
            this.scoreAdded = true;
            console.log('GameOverScene: Score submission completed, isNewHighScore:', this.isNewHighScore);
        } else {
            console.log('GameOverScene: Score already added or score is 0:', { scoreAdded: this.scoreAdded, finalScore: this.finalScore });
        }
        this._restarting = false; // Reset flag on enter
        
        // Load attempts from backend
        const attemptsManager = this.game.getAttemptsManager();
        if (attemptsManager) {
            await attemptsManager.loadAttempts();
            const currentAttempts = attemptsManager.getAttempts();
            console.log('[GameOverScene] Loaded attempts count:', currentAttempts);
        } else {
            console.log('GameOverScene: No attempts manager available');
        }
        
        // Setup UI elements - attempt was already consumed when game started
        this.setupUI();

        // Listen for attempts being added
        this.setupAttemptsListener();

        console.log('GameOverScene: Setup complete, UI rendered');
    }
    
    exit() {
        // Called when scene is deactivated
        this.cleanupAttemptsListener();
        super.clearUI(); // Call parent clearUI method
    }
    
    update(deltaTime) {
        this.animationTime += deltaTime;
        // Removed automatic tap-to-restart functionality
        // Users must now use the buttons to restart or get more attempts
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
    }
    
    renderGameOverPanel() {
        const ctx = this.ctx;
        const width = this.width;
        const height = this.height;
        
        // Panel background (wider since no leaderboard)
        const panelWidth = 500;
        const panelHeight = 350;
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
        
        // Draw attempts info - show the attempts that are actually remaining
        ctx.save();
        const attemptsManager = this.game.getAttemptsManager();
        if (attemptsManager) {
            const attempts = attemptsManager.getAttempts();
            console.log('[GameOverScene] renderGameOverPanel showing attempts remaining:', attempts);
            ctx.fillStyle = attempts > 0 ? '#222' : '#666';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Attempts Remaining: ${attempts}`, width / 2, panelY + 200);
            
            if (attempts === 0) {
                ctx.fillStyle = '#FF6B6B';
                ctx.font = '16px Arial';
                ctx.fillText('No attempts left!', width / 2, panelY + 230);
            }
        }
        ctx.restore();
        
        // Removed tap-to-restart instructions since functionality was removed
        
        // Draw additional info
        ctx.save();
        ctx.fillStyle = '#999';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Try to beat your high score!', width / 2, panelY + 310);
        ctx.restore();
    }
    
    setupUI() {
        console.log('GameOverScene: Setting up UI');
        const attemptsManager = this.game.getAttemptsManager();
        
        if (attemptsManager) {
            // Always use fresh attempts count from backend
            const attempts = attemptsManager.getAttempts();
            console.log('GameOverScene: SETUP UI - fresh attempts from backend:', attempts);
            
            // Add "Play Again" button ONLY if player has attempts
            if (attempts > 0) {
                console.log('GameOverScene: Creating Play Again button (attempts > 0)');
                const playAgainButton = document.createElement('button');
                playAgainButton.textContent = '🎮 Play Again';
                playAgainButton.className = 'ui-element';
                playAgainButton.style.cssText = `
                    position: absolute;
                    bottom: 20px;
                    left: 35%;
                    transform: translateX(-50%);
                    padding: 15px 25px;
                    background: linear-gradient(45deg, #4CAF50, #45a049);
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
                
                playAgainButton.addEventListener('mouseenter', () => {
                    playAgainButton.style.transform = 'translateX(-50%) translateY(-2px)';
                    playAgainButton.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4)';
                });
                
                playAgainButton.addEventListener('mouseleave', () => {
                    playAgainButton.style.transform = 'translateX(-50%) translateY(0)';
                    playAgainButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
                });
                
                playAgainButton.addEventListener('click', () => {
                    this.switchScene('game');
                });
                
                this.uiOverlay.appendChild(playAgainButton);
            } else {
                console.log('GameOverScene: NOT creating Play Again button (attempts = 0)');
            }
            
            // Add attempts counter to Game Over Scene
            const attemptsCounter = document.createElement('div');
            attemptsCounter.id = 'gameOverAttemptsCounter';
            attemptsCounter.style.cssText = `
                position: absolute;
                top: 20px;
                right: 20px;
                background: #f8f8f8;
                color: #222;
                padding: 12px 18px;
                border: 2px solid #222;
                border-radius: 0;
                font-family: 'Press Start 2P', monospace;
                font-weight: bold;
                font-size: 14px;
                z-index: 100;
                box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.2);
                text-transform: uppercase;
            `;
            
            const updateCounter = () => {
                const attempts = attemptsManager.getAttempts();
                attemptsCounter.innerHTML = `🎯 Attempts: ${attempts}`;
            };
            
            updateCounter();
            this.uiOverlay.appendChild(attemptsCounter);
            
            // Add "Get More Attempts" button (always available)
            console.log('GameOverScene: Creating Get More Attempts button');
            const attemptsButton = document.createElement('button');
            attemptsButton.textContent = '🎯 Get More Attempts';
            attemptsButton.className = 'ui-element';
            attemptsButton.style.cssText = `
                position: absolute;
                bottom: 20px;
                left: ${attempts > 0 ? '65%' : '50%'};
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
        } else {
            console.log('GameOverScene: No attempts manager available');
        }
    }

    forceRender() {
        if (typeof this.renderGameOverPanel === 'function') {
            console.log('[GameOverScene] Forcing renderGameOverPanel. Attempts:', this.game.getAttemptsManager().getAttempts());
            this.renderGameOverPanel();
        }
    }

    // Setup listener for when attempts are added
    setupAttemptsListener() {
        console.log('🎯 GameOverScene: Setting up attempts listener');

        // Remove any existing listener first
        this.cleanupAttemptsListener();

        // Create bound function so we can remove it later
        this.attemptsAddedHandler = (event) => {
            console.log('🎯 GameOverScene: Attempts were added!', event.detail);

            // Refresh the UI to show the Play Again button
            this.refreshUI();
        };

        // Add the event listener
        document.addEventListener('attemptsAdded', this.attemptsAddedHandler);
    }

    // Cleanup attempts listener
    cleanupAttemptsListener() {
        if (this.attemptsAddedHandler) {
            console.log('🎯 GameOverScene: Cleaning up attempts listener');
            document.removeEventListener('attemptsAdded', this.attemptsAddedHandler);
            this.attemptsAddedHandler = null;
        }
    }

    // Refresh the UI when attempts are added
    refreshUI() {
        console.log('🎯 GameOverScene: Refreshing UI after attempts added');

        // Clear existing UI
        super.clearUI();

        // Reload attempts from backend
        const attemptsManager = this.game.getAttemptsManager();
        if (attemptsManager) {
            attemptsManager.loadAttempts().then(() => {
                // Setup UI again with fresh attempts count
                this.setupUI();
                console.log('🎯 GameOverScene: UI refreshed with new attempts count');
            }).catch(error => {
                console.error('🎯 GameOverScene: Error reloading attempts:', error);
                // Setup UI anyway with current count
                this.setupUI();
            });
        } else {
            // Setup UI anyway
            this.setupUI();
        }
    }
}