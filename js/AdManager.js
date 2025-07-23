class AdManager {
    constructor() {
        console.log('🏗️ Creating AdManager instance...');
        this.isInitialized = false;
        this.adMobAppId = null;
        this.rewardedAdUnitId = null;
        this.interstitialAdUnitId = null;
        this.currentAd = null;
        this.adCallbacks = new Map();
        this.dailyAdViews = 0;
        this.maxDailyAdViews = 999999; // No daily limit
        this.lastAdViewDate = null;
        this.initializationPromise = null;
        
        // Initialize immediately
        this.initializationPromise = this.init().catch(error => {
            console.error('❌ AdManager init failed:', error);
            // Mark as initialized anyway so the system can work
            this.isInitialized = true;
        });
    }
    
    async init() {
        try {
            console.log('🔄 Initializing AdManager...');
            
            // Load daily ad view count from localStorage
            this.loadDailyAdStats();
            
            // For now, just use fallback ads (simpler and more reliable)
            this.initFallbackAds();
            
            console.log('✅ AdManager initialized successfully');
            this.isInitialized = true;
            
        } catch (error) {
            console.error('❌ Failed to initialize AdManager:', error);
            // Still mark as initialized so the system can work
            this.isInitialized = true;
        }
    }
    
    // Ensure AdManager is ready before use
    async ensureReady() {
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
        return this.isInitialized;
    }
    
    async loadAdMobSDK() {
        return new Promise((resolve, reject) => {
            if (window.admob) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3940256099942544';
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    initFallbackAds() {
        // Fallback ad system for when AdMob is not available
        console.log('✅ Using fallback ad system');
        this.isInitialized = true;
    }
    
    loadDailyAdStats() {
        const today = new Date().toDateString();
        const stored = localStorage.getItem('dailyAdStats');
        
        if (stored) {
            const stats = JSON.parse(stored);
            if (stats.date === today) {
                this.dailyAdViews = stats.views || 0;
                this.lastAdViewDate = new Date(stats.date);
            } else {
                this.dailyAdViews = 0;
                this.lastAdViewDate = new Date();
            }
        } else {
            this.dailyAdViews = 0;
            this.lastAdViewDate = new Date();
        }
    }
    
    saveDailyAdStats() {
        const stats = {
            date: new Date().toDateString(),
            views: this.dailyAdViews
        };
        localStorage.setItem('dailyAdStats', JSON.stringify(stats));
    }
    
    async canWatchAd() {
        try {
            await this.ensureReady();
            
            const token = localStorage.getItem('authToken');
            if (!token) {
                return false;
            }

            // No daily limits - always allow watching ads
            return true;
        } catch (error) {
            console.error('Error checking ad availability:', error);
            // Fallback - always allow
            return true;
        }
    }
    
    async showRewardedAd() {
        return new Promise(async (resolve, reject) => {
            try {
                await this.ensureReady();
                
                // No daily limits - always allow watching ads
                
                if (window.admob && this.isInitialized) {
                    // Use real AdMob
                    await this.showAdMobRewardedAd(resolve, reject);
                } else {
                    // Use fallback ad
                    await this.showFallbackAd(resolve, reject);
                }
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    async showAdMobRewardedAd(resolve, reject) {
        try {
            // Create rewarded ad
            const rewardedAd = await window.admob.rewardedAd({
                adUnitId: this.rewardedAdUnitId
            });
            
            // Set up event listeners
            rewardedAd.on('load', () => {
                console.log('Rewarded ad loaded');
            });
            
            rewardedAd.on('error', (error) => {
                console.error('Rewarded ad error:', error);
                reject(new Error('Ad failed to load'));
            });
            
            rewardedAd.on('close', () => {
                console.log('Rewarded ad closed');
                reject(new Error('Ad was closed without reward'));
            });
            
            rewardedAd.on('reward', (reward) => {
                console.log('User earned reward:', reward);
                this.dailyAdViews++;
                this.saveDailyAdStats();
                resolve({ success: true, reward: reward.amount || 1 });
            });
            
            // Load and show the ad
            await rewardedAd.load();
            await rewardedAd.show();
            
        } catch (error) {
            console.error('AdMob rewarded ad error:', error);
            reject(error);
        }
    }
    
    async showFallbackAd(resolve, reject) {
        // Create a simulated ad experience
        const adModal = this.createAdModal();
        document.body.appendChild(adModal);
        
        // Simulate ad loading
        setTimeout(() => {
            adModal.querySelector('.ad-content').style.display = 'block';
            adModal.querySelector('.ad-loading').style.display = 'none';
            
            // Start countdown
            let countdown = 15; // 15 seconds
            const countdownElement = adModal.querySelector('.ad-countdown');
            
            const timer = setInterval(() => {
                countdown--;
                countdownElement.textContent = countdown;
                
                if (countdown <= 0) {
                    clearInterval(timer);
                    
                    // Remove modal and resolve
                    document.body.removeChild(adModal);
                    this.dailyAdViews++;
                    this.saveDailyAdStats();
                    resolve({ success: true, reward: 1 });
                }
            }, 1000);
            
            // Handle early close
            adModal.querySelector('.ad-close').onclick = () => {
                clearInterval(timer);
                document.body.removeChild(adModal);
                reject(new Error('Ad was closed early'));
            };
            
        }, 2000);
    }
    
    createAdModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        modal.innerHTML = `
            <div style="
                background: #fff;
                border-radius: 12px;
                padding: 30px;
                text-align: center;
                max-width: 500px;
                width: 90%;
                position: relative;
            ">
                <button class="ad-close" style="
                    position: absolute;
                    top: 10px;
                    right: 15px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                ">✕</button>
                
                <div class="ad-loading" style="display: block;">
                    <div style="
                        width: 60px;
                        height: 60px;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #3498db;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 20px auto;
                    "></div>
                    <p>Loading advertisement...</p>
                </div>
                
                <div class="ad-content" style="display: none;">
                    <h3 style="color: #333; margin-bottom: 20px;">🎮 SkySurge Advertisement</h3>
                    
                    <div style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                    ">
                        <h4 style="margin: 0 0 10px 0;">Watch this ad to earn 1 attempt!</h4>
                        <p style="margin: 0; opacity: 0.9;">Please watch the full advertisement to receive your reward.</p>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <p style="color: #666; margin-bottom: 10px;">Time remaining:</p>
                        <div class="ad-countdown" style="
                            font-size: 32px;
                            font-weight: bold;
                            color: #3498db;
                        ">15</div>
                    </div>
                    
                    <p style="color: #999; font-size: 14px;">
                        Watch unlimited ads to earn attempts!
                    </p>
                </div>
            </div>
        `;
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        return modal;
    }
    
    async showInterstitialAd() {
        return new Promise(async (resolve, reject) => {
            try {
                await this.ensureReady();
                
                if (window.admob && this.isInitialized) {
                    // Use real AdMob interstitial
                    const interstitialAd = await window.admob.interstitialAd({
                        adUnitId: this.interstitialAdUnitId
                    });
                    
                    interstitialAd.on('load', () => {
                        console.log('Interstitial ad loaded');
                    });
                    
                    interstitialAd.on('error', (error) => {
                        console.error('Interstitial ad error:', error);
                        reject(error);
                    });
                    
                    interstitialAd.on('close', () => {
                        console.log('Interstitial ad closed');
                        resolve({ success: true });
                    });
                    
                    await interstitialAd.load();
                    await interstitialAd.show();
                    
                } else {
                    // Use fallback interstitial
                    await this.showFallbackInterstitial(resolve, reject);
                }
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    async showFallbackInterstitial(resolve, reject) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        modal.innerHTML = `
            <div style="
                background: #fff;
                border-radius: 12px;
                padding: 30px;
                text-align: center;
                max-width: 500px;
                width: 90%;
            ">
                <h3 style="color: #333; margin-bottom: 20px;">Advertisement</h3>
                <div style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 40px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                ">
                    <h4 style="margin: 0 0 15px 0;">SkySurge Premium</h4>
                    <p style="margin: 0; opacity: 0.9;">Upgrade to premium for unlimited attempts and exclusive features!</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove(); resolve({success: true});" style="
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                ">Continue</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    getDailyAdStats() {
        return {
            views: this.dailyAdViews,
            maxViews: 'Unlimited',
            remaining: 'Unlimited'
        };
    }
    
    resetDailyStats() {
        this.dailyAdViews = 0;
        this.lastAdViewDate = new Date();
        this.saveDailyAdStats();
    }
}

// Export for use in other modules
window.AdManager = AdManager;

// Create a global instance immediately
let globalAdManager = null;

function createGlobalAdManager() {
    if (!globalAdManager) {
        try {
            globalAdManager = new AdManager();
            window.adManager = globalAdManager;
            console.log('✅ Global AdManager created');
        } catch (error) {
            console.error('❌ Failed to create global AdManager:', error);
        }
    }
    return globalAdManager;
}

// Auto-initialize a global instance when the script loads
window.addEventListener('DOMContentLoaded', () => {
    createGlobalAdManager();
});

// Also try to initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
} else {
    // DOM is already loaded, initialize immediately
    createGlobalAdManager();
}

// Ensure AdManager is always available
window.ensureAdManager = function() {
    return createGlobalAdManager();
}; 