class PaymentManager {
    constructor() {
        this.stripe = null;
        this.elements = null;
        this.paymentElement = null;
        this.apiBase = '/api/payments';
        this.isInitialized = false;
        this.currentPaymentIntent = null;
    }
    
    async init() {
        try {
            // Load Stripe.js
            if (!window.Stripe) {
                await this.loadStripeScript();
            }
            
            // Initialize Stripe with your publishable key
            this.stripe = Stripe(process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_your_publishable_key');
            this.isInitialized = true;
            console.log('PaymentManager initialized');
            
        } catch (error) {
            console.error('Failed to initialize PaymentManager:', error);
        }
    }
    
    async loadStripeScript() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    async createPaymentIntent(amount, attempts) {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Authentication required');
            }
            
            const response = await fetch(`${this.apiBase}/create-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ amount, attempts })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create payment intent');
            }
            
            const data = await response.json();
            this.currentPaymentIntent = data.paymentIntentId;
            return data;
            
        } catch (error) {
            console.error('Failed to create payment intent:', error);
            throw error;
        }
    }
    
    async confirmPayment(paymentElement) {
        try {
            if (!this.stripe || !this.currentPaymentIntent) {
                throw new Error('Payment not initialized');
            }
            
            const { error } = await this.stripe.confirmPayment({
                elements: this.elements,
                confirmParams: {
                    return_url: window.location.origin + '/payment-success.html',
                },
            });
            
            if (error) {
                throw error;
            }
            
            // Payment succeeded, confirm with backend
            return await this.confirmPaymentWithBackend();
            
        } catch (error) {
            console.error('Payment confirmation failed:', error);
            throw error;
        }
    }
    
    async confirmPaymentWithBackend() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Authentication required');
            }
            
            const response = await fetch(`${this.apiBase}/confirm-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    paymentIntentId: this.currentPaymentIntent
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to confirm payment with backend');
            }
            
            const data = await response.json();
            this.currentPaymentIntent = null;
            return data;
            
        } catch (error) {
            console.error('Backend confirmation failed:', error);
            throw error;
        }
    }
    
    async getPackages() {
        try {
            const response = await fetch(`${this.apiBase}/packages`);
            if (!response.ok) {
                throw new Error('Failed to fetch packages');
            }
            
            const data = await response.json();
            return data.packages;
            
        } catch (error) {
            console.error('Failed to get packages:', error);
            throw error;
        }
    }
    
    async getPaymentHistory() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Authentication required');
            }
            
            const response = await fetch(`${this.apiBase}/history`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch payment history');
            }
            
            const data = await response.json();
            return data.payments;
            
        } catch (error) {
            console.error('Failed to get payment history:', error);
            throw error;
        }
    }
    
    createPaymentForm(containerId, amount, attempts) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.isInitialized) {
                    await this.init();
                }
                
                // Create payment intent
                const paymentIntent = await this.createPaymentIntent(amount, attempts);
                
                // Create elements
                this.elements = this.stripe.elements({
                    clientSecret: paymentIntent.clientSecret,
                    appearance: {
                        theme: 'stripe',
                        variables: {
                            colorPrimary: '#FF6B6B',
                        },
                    },
                });
                
                // Create payment element
                this.paymentElement = this.elements.create('payment');
                
                // Mount to container
                const container = document.getElementById(containerId);
                if (!container) {
                    throw new Error('Container not found');
                }
                
                container.innerHTML = '';
                this.paymentElement.mount(container);
                
                resolve({
                    confirmPayment: () => this.confirmPayment(this.paymentElement),
                    mount: () => this.paymentElement.mount(container)
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    showPaymentModal(package) {
        return new Promise((resolve, reject) => {
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'payment-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;
            
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: white;
                padding: 30px;
                border-radius: 10px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                font-family: 'Press Start 2P', monospace;
            `;
            
            modalContent.innerHTML = `
                <h2>Purchase ${package.name}</h2>
                <p>${package.description}</p>
                <p style="font-size: 1.2em; color: #FF6B6B; margin: 20px 0;">
                    $${package.price}
                </p>
                <div id="payment-element"></div>
                <div id="payment-message" style="margin-top: 20px;"></div>
                <button id="cancel-payment" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #666;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                ">Cancel</button>
            `;
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Create payment form
            this.createPaymentForm('payment-element', package.price, package.attempts)
                .then(({ confirmPayment }) => {
                    // Add confirm button
                    const confirmBtn = document.createElement('button');
                    confirmBtn.textContent = `Pay $${package.price}`;
                    confirmBtn.style.cssText = `
                        margin-top: 20px;
                        padding: 15px 30px;
                        background: #FF6B6B;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-family: 'Press Start 2P', monospace;
                        font-size: 14px;
                    `;
                    
                    confirmBtn.onclick = async () => {
                        try {
                            confirmBtn.disabled = true;
                            confirmBtn.textContent = 'Processing...';
                            
                            const result = await confirmPayment();
                            
                            // Show success message
                            const messageEl = document.getElementById('payment-message');
                            messageEl.innerHTML = `
                                <div style="color: green; margin: 20px 0;">
                                    ✅ Payment successful! Added ${package.attempts} attempts.
                                </div>
                            `;
                            
                            // Close modal after delay
                            setTimeout(() => {
                                document.body.removeChild(modal);
                                resolve(result);
                            }, 2000);
                            
                        } catch (error) {
                            const messageEl = document.getElementById('payment-message');
                            messageEl.innerHTML = `
                                <div style="color: red; margin: 20px 0;">
                                    ❌ Payment failed: ${error.message}
                                </div>
                            `;
                            confirmBtn.disabled = false;
                            confirmBtn.textContent = `Pay $${package.price}`;
                        }
                    };
                    
                    modalContent.appendChild(confirmBtn);
                })
                .catch(error => {
                    const messageEl = document.getElementById('payment-message');
                    messageEl.innerHTML = `
                        <div style="color: red; margin: 20px 0;">
                            ❌ Failed to load payment form: ${error.message}
                        </div>
                    `;
                });
            
            // Cancel button
            document.getElementById('cancel-payment').onclick = () => {
                document.body.removeChild(modal);
                reject(new Error('Payment cancelled'));
            };
        });
    }
} 