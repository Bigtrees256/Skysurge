class AttemptsManager {
    constructor() {
        this.maxAttempts = 1; // or 3, as desired
        this.paymentAmount = 1; // $1 for 3 attempts
        this.adAttempts = 1; // 1 attempt for watching ad
        this.socialAttempts = 1; // 1 attempt for social share
        this.referralAttempts = 1; // 1 attempt for referral
        
        this.attempts = 0;
        this.isLoading = false;
        this.error = null;
        this.apiBase = '/api/attempts';
        this.paymentManager = null;
        
        this.init();
    }
    
    async init() {
        // Load attempts from backend
        await this.loadAttempts();
        
        // Initialize payment manager
        this.initPaymentManager();
        
        // Initialize any external services
        this.initAdSystem();
        this.initSocialSharing();
        this.initReferralSystem();
    }
    
    // Initialize payment manager
    initPaymentManager() {
        try {
            this.paymentManager = new PaymentManager();
            console.log('Payment manager initialized');
        } catch (error) {
            console.error('Failed to initialize payment manager:', error);
        }
    }
    
    // Load attempts from backend
    async loadAttempts() {
        this.isLoading = true;
        this.error = null;
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                // No token, use default attempts
                this.attempts = this.maxAttempts;
                return;
            }
            
            const res = await fetch(`${this.apiBase}/my`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!res.ok) {
                if (res.status === 401) {
                    // Token expired or invalid, use default
                    this.attempts = this.maxAttempts;
                    return;
                }
                throw new Error('Failed to fetch attempts');
            }
            
            const data = await res.json();
            this.attempts = data.remainingAttempts || this.maxAttempts;
            
        } catch (e) {
            this.error = e.message;
            // Fallback to default attempts
            this.attempts = this.maxAttempts;
        } finally {
            this.isLoading = false;
        }
    }
    
    // Get current attempts
    getAttempts() {
        return this.attempts;
    }
    
    // Check if player has attempts left
    hasAttempts() {
        return this.attempts > 0;
    }
    
    // Use an attempt via backend
    async useAttempt() {
        if (this.attempts <= 0) {
            return false;
        }
        
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                // No token, use local fallback
                this.attempts--;
                return true;
            }
            
            const res = await fetch(`${this.apiBase}/use`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!res.ok) {
                if (res.status === 401) {
                    // Token expired, use local fallback
                    this.attempts--;
                    return true;
                }
                throw new Error('Failed to use attempt');
            }
            
            const data = await res.json();
            this.attempts = data.attempts.remainingAttempts;
            return true;
            
        } catch (e) {
            this.error = e.message;
            // Fallback to local update
            this.attempts--;
            return true;
        }
    }
    
    // Add attempts via backend
    async addAttempts(count, type = 'bonus') {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                // No token, use local fallback
                this.attempts += count;
                return { success: true, message: `Added ${count} attempts locally.` };
            }
            
            const res = await fetch(`${this.apiBase}/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: type,
                    amount: count
                })
            });
            
            if (!res.ok) {
                if (res.status === 401) {
                    // Token expired, use local fallback
                    this.attempts += count;
                    return { success: true, message: `Added ${count} attempts locally.` };
                }
                throw new Error('Failed to add attempts');
            }
            
            const data = await res.json();
            this.attempts = data.attempts.remainingAttempts;
            return { success: true, message: data.message };
            
        } catch (e) {
            this.error = e.message;
            // Fallback to local update
            this.attempts += count;
            return { success: true, message: `Added ${count} attempts locally.` };
        }
    }
    
    // Reset attempts to default
    resetAttempts() {
        this.attempts = this.maxAttempts;
    }
    
    // Payment system with Stripe
    async purchaseAttempts(packageId = null) {
        try {
            if (!this.paymentManager) {
                throw new Error('Payment system not available');
            }
            
            let selectedPackage;
            
            if (packageId) {
                // Get specific package
                const packages = await this.paymentManager.getPackages();
                selectedPackage = packages.find(p => p.id === packageId);
                if (!selectedPackage) {
                    throw new Error('Package not found');
                }
            } else {
                // Use default package
                selectedPackage = {
                    id: 'basic',
                    name: 'Basic Pack',
                    attempts: 3,
                    price: 0.99,
                    description: '3 attempts for $0.99'
                };
            }
            
            // Show payment modal
            const result = await this.paymentManager.showPaymentModal(selectedPackage);
            
            // Update attempts after successful payment
            if (result && result.attempts) {
                this.attempts = result.attempts.remainingAttempts;
            }
            
            return result;
            
        } catch (error) {
            console.error('Payment failed:', error);
            return { success: false, message: error.message };
        }
    }
    
    // Show purchase options
    async showPurchaseOptions() {
        try {
            if (!this.paymentManager) {
                throw new Error('Payment system not available');
            }
            
            const packages = await this.paymentManager.getPackages();
            return this.showPackageSelectionModal(packages);
            
        } catch (error) {
            console.error('Failed to show purchase options:', error);
            return { success: false, message: error.message };
        }
    }
    
    // Show package selection modal
    showPackageSelectionModal(packages) {
        return new Promise((resolve, reject) => {
            const modal = document.createElement('div');
            modal.className = 'package-selection-modal';
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
                max-width: 600px;
                width: 90%;
                text-align: center;
                font-family: 'Press Start 2P', monospace;
            `;
            
            let packagesHtml = '<h2>Choose Your Pack</h2><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0;">';
            
            packages.forEach(pkg => {
                packagesHtml += `
                    <div style="border: 2px solid #ddd; border-radius: 8px; padding: 20px; cursor: pointer;" 
                         onclick="window.selectedPackage = '${pkg.id}'; this.parentElement.parentElement.parentElement.remove();">
                        <h3>${pkg.name}</h3>
                        <p style="font-size: 1.5em; color: #FF6B6B; margin: 10px 0;">$${pkg.price}</p>
                        <p>${pkg.attempts} attempts</p>
                        <p style="font-size: 0.8em; color: #666;">${pkg.description}</p>
                    </div>
                `;
            });
            
            packagesHtml += '</div>';
            
            modalContent.innerHTML = packagesHtml;
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Handle package selection
            const checkSelection = setInterval(() => {
                if (window.selectedPackage) {
                    clearInterval(checkSelection);
                    document.body.removeChild(modal);
                    resolve(window.selectedPackage);
                    delete window.selectedPackage;
                }
            }, 100);
            
            // Close modal on background click
            modal.onclick = (e) => {
                if (e.target === modal) {
                    clearInterval(checkSelection);
                    document.body.removeChild(modal);
                    reject(new Error('Selection cancelled'));
                }
            };
        });
    }
    
    // Ad system
    initAdSystem() {
        // Initialize ad provider (Google AdMob, Unity Ads, etc.)
        console.log('Ad system initialized');
    }
    
    async watchAd() {
        try {
            console.log('Loading advertisement...');
            
            // In a real implementation, you would:
            // 1. Load ad from provider
            // 2. Show ad to user
            // 3. Wait for ad completion
            // 4. Reward user with attempts
            
            // Simulate ad watching
            await this.simulateAd();
            
            // Add attempts via backend
            return await this.addAttempts(this.adAttempts, 'ad');
            
        } catch (error) {
            console.error('Ad failed:', error);
            return { success: false, message: 'Ad failed to load. Please try again.' };
        }
    }
    
    async simulateAd() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 2000);
        });
    }
    
    // Social sharing
    initSocialSharing() {
        console.log('Social sharing initialized');
    }
    
    async shareToSocial() {
        try {
            const shareData = {
                title: 'SkySurge - Flappy Game',
                text: `I just scored ${this.getCurrentScore()} in SkySurge! Can you beat my score?`,
                url: window.location.href
            };
            
            // Try to use native sharing API
            if (navigator.share) {
                await navigator.share(shareData);
                return await this.addAttempts(this.socialAttempts, 'bonus');
            } else {
                // Fallback: open share dialog
                this.openShareDialog(shareData);
                return await this.addAttempts(this.socialAttempts, 'bonus');
            }
            
        } catch (error) {
            console.error('Social sharing failed:', error);
            return { success: false, message: 'Sharing failed. Please try again.' };
        }
    }
    
    openShareDialog(shareData) {
        // Create share URLs for different platforms
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`;
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`;
        
        // Open in new window
        window.open(twitterUrl, '_blank', 'width=600,height=400');
    }
    
    // Referral system
    initReferralSystem() {
        console.log('Referral system initialized');
    }
    
    generateReferralLink() {
        const baseUrl = window.location.origin + window.location.pathname;
        const referralCode = this.generateReferralCode();
        return `${baseUrl}?ref=${referralCode}`;
    }
    
    generateReferralCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    async referFriend() {
        try {
            const referralLink = this.generateReferralLink();
            const shareData = {
                title: 'SkySurge - Flappy Game',
                text: `Try SkySurge! Use my referral link: ${referralLink}`,
                url: referralLink
            };
            
            if (navigator.share) {
                await navigator.share(shareData);
                return await this.addAttempts(this.referralAttempts, 'referral');
            } else {
                this.openShareDialog(shareData);
                return await this.addAttempts(this.referralAttempts, 'referral');
            }
            
        } catch (error) {
            console.error('Referral failed:', error);
            return { success: false, message: 'Referral failed. Please try again.' };
        }
    }
    
    getCurrentScore() {
        // Get current score from game if available
        if (window.game && window.game.currentScene && window.game.currentScene.getScore) {
            return window.game.currentScene.getScore();
        }
        return 0;
    }
    
    // Check if user came from referral
    checkReferral() {
        const urlParams = new URLSearchParams(window.location.search);
        const referralCode = urlParams.get('ref');
        
        if (referralCode) {
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Process referral
            this.processReferral(referralCode);
            return true;
        }
        return false;
    }
    
    async processReferral(referralCode) {
        try {
            console.log(`User came from referral: ${referralCode}`);
            
            // In a real implementation, you would:
            // 1. Send referral code to backend
            // 2. Verify referral is valid
            // 3. Give bonus to new user
            // 4. Give bonus to referrer
            
            // For now, just add bonus attempts
            await this.addAttempts(this.referralAttempts, 'referral');
            
        } catch (error) {
            console.error('Failed to process referral:', error);
        }
    }
} 