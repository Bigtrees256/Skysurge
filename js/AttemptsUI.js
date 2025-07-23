class AttemptsUI {
    constructor(attemptsManager, game) {
        this.attemptsManager = attemptsManager;
        this.game = game;
        this.isVisible = false;
        
        this.createUI();
    }
    
    createUI() {
        // Create modal container
        this.modal = document.createElement('div');
        this.modal.id = 'attemptsModal';
        this.modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            z-index: 10000;
            align-items: center;
            justify-content: center;
        `;
        
        // Create modal content
        this.content = document.createElement('div');
        this.content.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            max-width: 400px;
            width: 90%;
            font-family: Arial, sans-serif;
        `;
        
        // Create attempts display
        this.attemptsDisplay = document.createElement('div');
        this.attemptsDisplay.style.cssText = `
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 20px;
        `;
        
        // Create title
        const title = document.createElement('h2');
        title.textContent = 'Get More Attempts';
        title.style.cssText = `
            color: #333;
            margin-bottom: 20px;
            font-size: 28px;
        `;
        
        // Create buttons container
        this.buttonsContainer = document.createElement('div');
        this.buttonsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 15px;
        `;
        
        // Create buttons
        this.createButton('💰 Buy 3 Attempts ($1)', this.handlePurchase.bind(this), '#4CAF50');
        this.createButton('📺 Watch Ad (1 Attempt)', this.handleWatchAd.bind(this), '#2196F3');
        this.createButton('📸 Share on Instagram (1 Attempt)', this.handleInstagramShare.bind(this), '#E1306C');
        this.createButton('👥 Refer Friend (1 Attempt)', this.handleReferFriend.bind(this), '#9C27B0');
        
        // Add a cancel button
        this.createButton('Cancel', () => this.hide(), '#999');
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '✕';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            background: #f0f0f0;
            border: 2px solid #ddd;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            font-size: 18px;
            cursor: pointer;
            color: #666;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        `;
        
        // Add hover effects
        closeButton.onmouseenter = () => {
            closeButton.style.background = '#ff4444';
            closeButton.style.color = 'white';
            closeButton.style.borderColor = '#ff4444';
            closeButton.style.transform = 'scale(1.1)';
        };
        
        closeButton.onmouseleave = () => {
            closeButton.style.background = '#f0f0f0';
            closeButton.style.color = '#666';
            closeButton.style.borderColor = '#ddd';
            closeButton.style.transform = 'scale(1)';
        };
        
        closeButton.onclick = () => this.hide();
        
        // Assemble UI
        this.content.appendChild(closeButton);
        this.content.appendChild(title);
        this.content.appendChild(this.attemptsDisplay);
        this.content.appendChild(this.buttonsContainer);
        this.modal.appendChild(this.content);
        
        // Add to page
        document.body.appendChild(this.modal);
        
        // Add click outside to close functionality
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
        
        // Update display
        this.updateDisplay();
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
        `;
        
        button.onmouseenter = () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        };
        
        button.onmouseleave = () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
        };
        
        button.onclick = onClick;
        this.buttonsContainer.appendChild(button);
    }
    
    updateDisplay() {
        const attempts = this.attemptsManager.getAttempts();
        this.attemptsDisplay.innerHTML = `
            <div>Attempts Remaining:</div>
            <div style="font-size: 48px; color: ${attempts > 0 ? '#4CAF50' : '#FF6B6B'};">
                ${attempts}
            </div>
        `;
    }
    
    show() {
        this.modal.style.display = 'flex';
        this.isVisible = true;
        this.updateDisplay();
    }
    
    hide() {
        this.modal.style.display = 'none';
        this.isVisible = false;
    }
    
    async handlePurchase() {
        const result = await this.attemptsManager.purchaseAttempts();
        if (result.success) {
            this.updateDisplay();
            this.hide();
            alert(result.message);

            // Notify that attempts were added
            this.notifyAttemptsAdded();
        } else {
            alert(result.message);
        }
    }
    
    async handleWatchAd() {
        const result = await this.attemptsManager.watchAd();
        if (result.success) {
            this.updateDisplay();
            this.hide();
            alert(result.message);

            // Notify that attempts were added
            this.notifyAttemptsAdded();
        } else {
            alert(result.message);
        }
    }
    
    async handleInstagramShare() {
        const result = await this.attemptsManager.shareOnInstagram();
        if (result.success) {
            this.updateDisplay();
            // Don't hide the modal immediately - let user interact with Instagram dialog
            // The dialog will be closed when user clicks close button

            // Notify that attempts were added
            this.notifyAttemptsAdded();
        } else {
            alert(result.message);
        }
    }
    
    async handleReferFriend() {
        const result = await this.attemptsManager.referFriend();
        if (result.success) {
            // Don't update display or notify about attempts since no attempts are granted immediately
            // Attempts will be granted when someone actually uses the referral link
            // Don't hide the modal immediately - let user interact with referral dialog
            // The dialog will be closed when user clicks close button
        } else {
            alert(result.message);
        }
    }

    // Notify other components that attempts were added
    notifyAttemptsAdded() {
        console.log('🎯 AttemptsUI: Notifying that attempts were added');

        // Dispatch custom event that GameOverScene can listen to
        const event = new CustomEvent('attemptsAdded', {
            detail: {
                newAttempts: this.attemptsManager.getAttempts()
            }
        });
        document.dispatchEvent(event);
    }

    // Create attempts counter for game UI
    createAttemptsCounter() {
        const counter = document.createElement('div');
        counter.id = 'attemptsCounter';
        counter.style.cssText = `
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
            const attempts = this.attemptsManager.getAttempts();
            counter.innerHTML = `🎯 Attempts: ${attempts}`;
        };

        updateCounter();
        return counter;
    }
} 