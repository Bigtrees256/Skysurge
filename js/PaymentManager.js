class PaymentManager {
    constructor() {
        this.stripe = null;
        this.elements = null;
        this.cardElement = null;
        this.publishableKey = null;
        this.apiBase = window.AppConfig ? `${window.AppConfig.apiBaseUrl}/api/payments` : 'http://localhost:3000/api/payments';
        this.isInitialized = false;

        this.init();
    }
    
    async init() {
        try {
            // Get Stripe publishable key from backend
            const response = await fetch('http://localhost:3000/api/config/stripe-key');
            if (!response.ok) {
                throw new Error(`Failed to fetch Stripe key: ${response.status}`);
            }
            const data = await response.json();
            this.publishableKey = data.publishableKey;
            
            if (!this.publishableKey || this.publishableKey === 'pk_test_placeholder') {
                console.warn('⚠️ Stripe publishable key not configured. Payment system will not work.');
                return;
            }
            
            // Load Stripe.js
            await this.loadStripe();
            this.isInitialized = true;
            
            console.log('✅ Payment manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize payment manager:', error);
            // Don't throw error, just log it so the game can still work
        }
    }
    
    async loadStripe() {
        return new Promise((resolve, reject) => {
            // Check if Stripe is already loaded
            if (window.Stripe) {
                this.stripe = Stripe(this.publishableKey);
                resolve();
                return;
            }
            
            // Load Stripe.js script
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = () => {
                this.stripe = Stripe(this.publishableKey);
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // Get available packages (matching backend structure)
    getPackages() {
        return [
            {
                id: '3',
                name: '3 Attempts',
                attempts: 3,
                price: 0.99,
                description: '3 attempts for $0.99',
                popular: false
            },
            {
                id: '10',
                name: '10 Attempts',
                attempts: 10,
                price: 2.00,
                description: '10 attempts for $2.00',
                popular: true
            },
            {
                id: '30',
                name: '30 Attempts',
                attempts: 30,
                price: 5.00,
                description: '30 attempts for $5.00',
                popular: false
            }
        ];
    }

    // Purchase attempts using Stripe Checkout (main method used by AttemptsManager)
    async purchaseAttempts(packageId = '3') {
        try {
            if (!this.isInitialized) {
                throw new Error('Payment system not initialized');
            }

            const response = await fetch(`${this.apiBase}/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packageId })
            });
            
            const data = await response.json();
            if (data.url) {
                // Redirect to Stripe Checkout
                window.location.href = data.url;
                return { success: true };
            } else {
                return { success: false, message: data.error || 'Failed to start purchase' };
            }
        } catch (error) {
            console.error('💳 Purchase failed:', error);
            return { success: false, message: error.message || 'Payment failed' };
        }
    }

    // Grant attempts after successful Stripe Checkout (called from index.html)
    async grantAttempts(sessionId) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('You must be logged in to receive attempts');
            }

            const response = await fetch(`${this.apiBase}/grant-attempts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ sessionId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to grant attempts');
            }

            const result = await response.json();
            
            // Trigger attempts update event for UI refresh
            if (window.game && window.game.attemptsManager) {
                window.game.attemptsManager.refreshAttempts();
            }
            
            return result;
        } catch (error) {
            console.error('❌ Failed to grant attempts:', error);
            throw error;
        }
    }

    // Show payment modal with package selection (alternative to direct checkout)
    showPaymentModal() {
        if (!this.isInitialized) {
            alert('Payment system not available. Please check your configuration.');
            return;
        }

        const packages = this.getPackages();
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'payment-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
            font-family: 'Press Start 2P', monospace;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 500px;
            width: 90%;
            text-align: center;
        `;
        
        modalContent.innerHTML = `
            <h2 style="margin-bottom: 20px; color: #333;">Choose Your Package</h2>
            <div id="package-list"></div>
            <button id="close-payment-modal" style="
                margin-top: 20px;
                padding: 10px 20px;
                background: #666;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-family: 'Press Start 2P', monospace;
                font-size: 10px;
            ">Close</button>
        `;
        
        const packageList = modalContent.querySelector('#package-list');
        
        packages.forEach(pkg => {
            const packageDiv = document.createElement('div');
            packageDiv.style.cssText = `
                border: 2px solid ${pkg.popular ? '#4CAF50' : '#ddd'};
                margin: 10px 0;
                padding: 15px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
                ${pkg.popular ? 'background: #f0f8f0;' : ''}
            `;
            
            packageDiv.innerHTML = `
                <div style="font-size: 14px; font-weight: bold; color: #333;">
                    ${pkg.name} ${pkg.popular ? '⭐ POPULAR' : ''}
                </div>
                <div style="font-size: 18px; color: #4CAF50; margin: 5px 0;">$${pkg.price}</div>
                <div style="font-size: 10px; color: #666;">${pkg.description}</div>
            `;
            
            packageDiv.addEventListener('click', async () => {
                modal.remove();
                const result = await this.purchaseAttempts(pkg.id);
                if (!result.success) {
                    alert(result.message);
                }
            });
            
            packageList.appendChild(packageDiv);
        });
        
        // Close button
        modalContent.querySelector('#close-payment-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }

    // Get payment history for the user
    async getPaymentHistory() {
        try {
            const token = this.getAuthToken();
            if (!token) {
                return { payments: [] };
            }

            const response = await fetch(`${this.apiBase}/history`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch payment history');
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Failed to get payment history:', error);
            return { payments: [] };
        }
    }

    // Utility method to get auth token (matches AttemptsManager pattern)
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    // Check if payment system is available
    isAvailable() {
        return this.isInitialized && this.stripe !== null;
    }
}

// Export globally for use in other files (matches existing pattern)
window.PaymentManager = PaymentManager;
