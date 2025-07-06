class StartScene extends Scene {
    constructor(game) {
        super(game);
        this.title = "SkySurge";
        this.subtitle = "Tap to Start";
        this.animationTime = 0;
    }
    
    enter() {
        super.enter();
        this.animationTime = 0;
    }
    
    update(deltaTime) {
        this.animationTime += deltaTime;
        
        // Check for input to start game
        if (this.inputManager.isActionPressed()) {
            const attemptsManager = this.game.getAttemptsManager();
            if (attemptsManager && attemptsManager.hasAttempts()) {
                // Use an attempt and start game
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
                // Attempts system not ready, start game anyway
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
        
        // Draw title with animation
        ctx.save();
        ctx.fillStyle = '#222'; // Monotone black text
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add a subtle bounce animation
        const bounce = Math.sin(this.animationTime * 0.003) * 5;
        ctx.fillText(this.title, width / 2, height / 2 - 50 + bounce);
        
        // Draw subtitle with pulsing effect
        const pulse = Math.sin(this.animationTime * 0.005) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
        ctx.font = '24px Arial';
        ctx.fillText(this.subtitle, width / 2, height / 2 + 20);
        
        ctx.restore();
        
        // Draw simple instructions
        ctx.save();
        ctx.fillStyle = '#666'; // Dark gray for instructions
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Use SPACE, ARROW UP, or CLICK to flap', width / 2, height - 100);
        ctx.fillText('Avoid the obstacles and get the highest score!', width / 2, height - 80);
        
        // Draw attempts info
        const attemptsManager = this.game.getAttemptsManager();
        if (attemptsManager) {
            const attempts = attemptsManager.getAttempts();
            ctx.fillStyle = attempts > 0 ? '#222' : '#666'; // Monotone colors
            ctx.font = 'bold 18px Arial';
            ctx.fillText(`Attempts: ${attempts}`, width / 2, height - 50);
            
            if (attempts === 0) {
                ctx.fillStyle = '#666';
                ctx.font = '14px Arial';
                ctx.fillText('Tap to get more attempts!', width / 2, height - 30);
            }
        }
        ctx.restore();
    }
    
    setupUI() {
        const attemptsManager = this.game.getAttemptsManager();
        const attemptsUI = this.game.getAttemptsUI();
        // Always hide attempts UI if you have attempts
        if (attemptsManager && attemptsUI && attemptsManager.hasAttempts() && attemptsUI.isVisible) {
            attemptsUI.hide();
        }
        
        // Add sound toggle button
        const soundButton = document.createElement('button');
        soundButton.textContent = '🔊 Sound: ON';
        soundButton.className = 'ui-element';
        soundButton.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            background: rgba(255, 255, 255, 0.9);
            border: 2px solid #333;
            border-radius: 5px;
            font-size: 14px;
            cursor: pointer;
            font-family: Arial, sans-serif;
        `;
        
        soundButton.addEventListener('click', () => {
            const soundManager = this.game.getSoundManager();
            const isMuted = soundManager.toggleMute();
            soundButton.textContent = isMuted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
        });
        
        this.uiOverlay.appendChild(soundButton);
        
        // Add "Get More Attempts" button when no attempts left
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