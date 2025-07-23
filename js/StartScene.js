class StartScene extends Scene {
    constructor(game) {
        super(game);
        this.title = "SkySurge";
        this.subtitle = "Tap to Start";
        this.animationTime = 0;
    }
    
    async enter() {
        super.enter();
        this.animationTime = 0;
        
        // Load attempts from backend
        const attemptsManager = this.game.getAttemptsManager();
        if (attemptsManager) {
            await attemptsManager.loadAttempts();
            const currentAttempts = attemptsManager.getAttempts();
            console.log('[StartScene] Loaded attempts count:', currentAttempts);
        }
        
        this.setupUI();
    }
    
    exit() {
        super.exit();
        // The base class clearUI() method will handle cleanup
    }
    
    update(deltaTime) {
        this.animationTime += deltaTime;
        
        // Check for input to start game
        if (this.inputManager.isActionPressed()) {
            const attemptsManager = this.game.getAttemptsManager();
            if (attemptsManager && attemptsManager.hasAttempts()) {
                // Attempt will be consumed when game starts
                this.switchScene('game');
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
        ctx.fillText('Use SPACE, ARROW UP, or CLICK to jump', width / 2, height - 150);
        ctx.fillText('Avoid the obstacles and get the highest score!', width / 2, height - 130);
        
        // Draw attempts info - use current attempts count
        const attemptsManager = this.game.getAttemptsManager();
        if (attemptsManager) {
            const attempts = attemptsManager.getAttempts();
            console.log('[StartScene] render using attempts:', attempts, '(current count)');
            ctx.fillStyle = attempts > 0 ? '#222' : '#666'; // Monotone colors
            ctx.font = 'bold 18px Arial';
            ctx.fillText(`Attempts: ${attempts}`, width / 2, height - 100);
            
            if (attempts === 0) {
                ctx.fillStyle = '#666';
                ctx.font = '14px Arial';
                ctx.fillText('Tap to get more attempts!', width / 2, height - 80);
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
        

        
        // Add attempts counter to Start Scene
        if (attemptsManager) {
            const attemptsCounter = document.createElement('div');
            attemptsCounter.id = 'startAttemptsCounter';
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
            const attemptsButton = document.createElement('button');
            attemptsButton.textContent = attemptsManager.hasAttempts() ? '🎯 Get More Attempts' : '🎯 Get More Attempts';
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