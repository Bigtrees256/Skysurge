class AttemptsUI {
    constructor(attemptsManager, game) {
        this.attemptsManager = attemptsManager;
        this.game = game;
        this.container = null;
        this.overlay = null;
        this.attemptsDisplay = null;
        this.buttonsContainer = null;
        this.isVisible = false;
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        this.createUI();
        this.updateAttemptsDisplay();
    }
    
    createUI() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'attemptsOverlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
            display: none;
        `;
        
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'attemptsUI';
        this.container.className = 'attempts-ui';
        this.container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.98);
            border: 3px solid #333;
            border-radius: 15px;
            padding: 36px 36px 30px 36px;
            text-align: center;
            font-family: Arial, sans-serif;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
            z-index: 10000;
            display: none;
            min-width: 340px;
            max-width: 95vw;
        `;
        
        // Create attempts display
        this.attemptsDisplay = document.createElement('div');
        this.attemptsDisplay.className = 'attempts-display';
        this.attemptsDisplay.style.cssText = `
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 24px;
        `;
        
        // Create title
        const title = document.createElement('h2');
        title.textContent = 'Get More Attempts';
        title.style.cssText = `
            color: #333;
            margin-bottom: 18px;
            font-size: 28px;
        `;
        
        // Create buttons container
        this.buttonsContainer = document.createElement('div');
        this.buttonsContainer.className = 'attempts-buttons';
        this.buttonsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 18px;
            margin-bottom: 10px;
        `;
        
        // Create buttons
        this.createButton('💰 Pay $1 for 3 Attempts', this.handlePayment.bind(this), '#4CAF50');
        this.createButton('📺 Watch Ad for 1 Attempt', this.handleWatchAd.bind(this), '#2196F3');
        this.createButton('📱 Share on Social for 1 Attempt', this.handleSocialShare.bind(this), '#FF9800');
        this.createButton('👥 Refer Friend for 1 Attempt', this.handleReferFriend.bind(this), '#9C27B0');
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '✕';
        closeButton.title = 'Close';
        closeButton.style.cssText = `
            position: absolute;
            top: 12px;
            right: 18px;
            background: #fff;
            border: 2px solid #333;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 4px 10px 4px 10px;
            width: 38px;
            height: 38px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            transition: background 0.2s, color 0.2s;
        `;
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.background = '#eee';
            closeButton.style.color = '#222';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.background = '#fff';
            closeButton.style.color = '#666';
        });
        closeButton.addEventListener('click', () => this.hide());
        
        // Create loading indicator
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'loading-indicator';
        this.loadingIndicator.style.cssText = `
            display: none;
            text-align: center;
            margin: 20px 0;
        `;
        this.loadingIndicator.innerHTML = `
            <div style="
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px;
            "></div>
            <div style="color: #666;">Processing...</div>
        `;
        
        // Add CSS animation for loading spinner
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        // Assemble UI
        this.container.appendChild(closeButton);
        this.container.appendChild(title);
        this.container.appendChild(this.attemptsDisplay);
        this.container.appendChild(this.loadingIndicator);
        this.container.appendChild(this.buttonsContainer);
        
        // Add overlay and modal to page
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.container);
    }
    
    createButton(text, onClick, color) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            padding: 15px 20px;
            background: ${color};
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.3)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        });
        
        button.addEventListener('click', onClick);
        
        this.buttonsContainer.appendChild(button);
    }
    
    updateAttemptsDisplay() {
        const attempts = this.attemptsManager.getAttempts();
        this.attemptsDisplay.innerHTML = `
            <div style="margin-bottom: 10px;">Attempts Remaining:</div>
            <div style="
                font-size: 48px;
                color: ${attempts > 0 ? '#4CAF50' : '#FF6B6B'};
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            ">${attempts}</div>
        `;
    }
    
    show() {
        this.overlay.style.display = 'block';
        this.container.style.display = 'block';
        this.isVisible = true;
        this.updateAttemptsDisplay();
    }
    
    hide() {
        this.overlay.style.display = 'none';
        this.container.style.display = 'none';
        this.isVisible = false;
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        this.loadingIndicator.style.display = loading ? 'block' : 'none';
        
        // Disable/enable buttons
        const buttons = this.buttonsContainer.querySelectorAll('button');
        buttons.forEach(button => {
            button.disabled = loading;
            button.style.opacity = loading ? '0.5' : '1';
        });
    }
    
    showMessage(message, isSuccess = true) {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${isSuccess ? '#4CAF50' : '#FF6B6B'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-weight: bold;
            z-index: 1001;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease;
        `;
        messageEl.textContent = message;
        
        // Add animation CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(messageEl);
        
        // Remove after 3 seconds
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }
    
    async handlePayment() {
        this.setLoading(true);
        try {
            const result = await this.attemptsManager.purchaseAttempts();
            this.showMessage(result.message, result.success);
            if (result.success) {
                this.updateAttemptsDisplay();
                this.hide();
                if (this.attemptsManager.hasAttempts()) {
                    this.triggerGameRestart();
                }
            }
        } catch (error) {
            this.showMessage('Payment failed. Please try again.', false);
        } finally {
            this.setLoading(false);
        }
    }
    
    async handleWatchAd() {
        this.setLoading(true);
        try {
            const result = await this.attemptsManager.watchAd();
            this.showMessage(result.message, result.success);
            if (result.success) {
                this.updateAttemptsDisplay();
                this.hide();
                if (this.attemptsManager.hasAttempts()) {
                    this.triggerGameRestart();
                }
            }
        } catch (error) {
            this.showMessage('Ad failed to load. Please try again.', false);
        } finally {
            this.setLoading(false);
        }
    }
    
    async handleSocialShare() {
        this.setLoading(true);
        try {
            const result = await this.attemptsManager.shareToSocial();
            this.showMessage(result.message, result.success);
            if (result.success) {
                this.updateAttemptsDisplay();
                this.hide();
                if (this.attemptsManager.hasAttempts()) {
                    this.triggerGameRestart();
                }
            }
        } catch (error) {
            this.showMessage('Sharing failed. Please try again.', false);
        } finally {
            this.setLoading(false);
        }
    }
    
    async handleReferFriend() {
        this.setLoading(true);
        try {
            const result = await this.attemptsManager.referFriend();
            this.showMessage(result.message, result.success);
            if (result.success) {
                this.updateAttemptsDisplay();
                this.hide();
                if (this.attemptsManager.hasAttempts()) {
                    this.triggerGameRestart();
                }
            }
        } catch (error) {
            this.showMessage('Referral failed. Please try again.', false);
        } finally {
            this.setLoading(false);
        }
    }
    
    // Method to trigger game restart after getting attempts
    triggerGameRestart() {
        // Reset input states to prevent stuck inputs
        if (this.game && this.game.getInputManager()) {
            this.game.getInputManager().resetInputs();
        }
        
        // Small delay to ensure UI is hidden and message is shown
        setTimeout(() => {
            // Get the current scene from the game
            const currentScene = this.game ? this.game.currentScene : null;
            
            console.log('Triggering game restart...');
            console.log('Current scene:', currentScene ? currentScene.constructor.name : 'null');
            console.log('Current attempts:', this.attemptsManager.getAttempts());
            
            if (currentScene && currentScene.constructor.name === 'StartScene') {
                // Check if we have attempts before starting
                if (this.attemptsManager.hasAttempts()) {
                    console.log('Starting game from StartScene...');
                    
                    // Play start sound
                    if (this.game.getSoundManager()) {
                        this.game.getSoundManager().playSound('start');
                    }
                    this.game.switchScene('game');
                } else {
                    console.log('No attempts available, staying on start scene');
                }
                
            } else if (currentScene && currentScene.constructor.name === 'GameOverScene') {
                // Check if we have attempts before restarting
                if (this.attemptsManager.hasAttempts()) {
                    console.log('Restarting game from GameOverScene...');
                    
                    // Play start sound
                    if (this.game.getSoundManager()) {
                        this.game.getSoundManager().playSound('start');
                    }
                    this.game.switchScene('game');
                } else {
                    console.log('No attempts available, staying on game over scene');
                }
            }
        }, 500);
    }
    
    // Method to show attempts counter in game
    showAttemptsCounter() {
        // Create attempts counter for game UI
        const counter = document.createElement('div');
        counter.id = 'attemptsCounter';
        counter.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-weight: bold;
            font-size: 18px;
            z-index: 100;
        `;
        
        const updateCounter = () => {
            const attempts = this.attemptsManager.getAttempts();
            counter.innerHTML = `🎯 Attempts: ${attempts}`;
        };
        
        updateCounter();
        
        // Update counter when attempts change
        this.attemptsManager.updateAttemptsDisplay = updateCounter;
        
        return counter;
    }
} 