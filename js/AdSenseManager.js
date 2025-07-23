/**
 * AdSense Manager for SkySurge Website
 * Handles Google AdSense integration for web-based ads
 */
class AdSenseManager {
    constructor() {
        this.isInitialized = false;
        this.clientId = null;
        this.adUnits = {};
        this.adContainers = {};
        
        // AdSense configuration
        this.config = {
            // TODO: Replace with your real AdSense Client ID after approval
            clientId: 'ca-pub-3940256099942544', // Test ID - replace with your real one
            adUnits: {
                gameAd: {
                    id: '1234567890', // Test ID - replace with your real ad unit ID
                    name: 'SkySurge Game Ad',
                    size: 'responsive'
                }
            }
        };
    }

    /**
     * Initialize AdSense
     */
    async initialize() {
        try {
            console.log('Initializing AdSense...');
            
            // Load AdSense script
            await this.loadAdSenseScript();
            
            // Initialize AdSense
            if (window.adsbygoogle) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                this.isInitialized = true;
                console.log('AdSense initialized successfully');
            } else {
                console.warn('AdSense script not loaded, using fallback');
            }
            
            return true;
        } catch (error) {
            console.error('Failed to initialize AdSense:', error);
            return false;
        }
    }

    /**
     * Load AdSense script
     */
    async loadAdSenseScript() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.adsbygoogle) {
                resolve();
                return;
            }

            // Create script element
            const script = document.createElement('script');
            script.async = true;
            script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
            script.setAttribute('data-ad-client', this.config.clientId);
            
            script.onload = () => {
                console.log('AdSense script loaded');
                resolve();
            };
            
            script.onerror = () => {
                console.error('Failed to load AdSense script');
                reject(new Error('AdSense script failed to load'));
            };

            // Add to head
            document.head.appendChild(script);
        });
    }

    /**
     * Create an ad container
     */
    createAdContainer(adUnitName, containerId = null) {
        const adUnit = this.config.adUnits[adUnitName];
        if (!adUnit) {
            console.error(`Ad unit '${adUnitName}' not found`);
            return null;
        }

        const container = document.createElement('div');
        container.className = 'adsense-ad-container';
        container.style.cssText = `
            width: 100%;
            max-width: 728px;
            margin: 10px auto;
            text-align: center;
            background: #f8f8f8;
            border: 1px solid #ddd;
            padding: 10px;
            min-height: 90px;
        `;

        // Create AdSense ad
        const adElement = document.createElement('ins');
        adElement.className = 'adsbygoogle';
        adElement.style.display = 'block';
        adElement.setAttribute('data-ad-client', this.config.clientId);
        adElement.setAttribute('data-ad-slot', adUnit.id);
        adElement.setAttribute('data-ad-format', 'auto');
        adElement.setAttribute('data-full-width-responsive', 'true');

        container.appendChild(adElement);

        // Add to page
        if (containerId) {
            const targetElement = document.getElementById(containerId);
            if (targetElement) {
                targetElement.appendChild(container);
            } else {
                document.body.appendChild(container);
            }
        } else {
            document.body.appendChild(container);
        }

        // Store reference
        this.adContainers[adUnitName] = container;

        // Load ad if AdSense is ready
        if (this.isInitialized && window.adsbygoogle) {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        }

        return container;
    }

    /**
     * Show a rewarded ad (simulated for web)
     */
    async showRewardedAd() {
        return new Promise((resolve) => {
            console.log('Showing AdSense rewarded ad...');
            
            // Create modal for ad
            const modal = this.createAdModal();
            document.body.appendChild(modal);

            // Show ad container
            const adContainer = this.createAdContainer('gameAd');
            modal.querySelector('.ad-content').appendChild(adContainer);

            // Simulate ad completion after 15 seconds
            let timeLeft = 15;
            const timer = modal.querySelector('.ad-timer');
            
            const countdown = setInterval(() => {
                timeLeft--;
                timer.textContent = `Ad will complete in ${timeLeft} seconds...`;
                
                if (timeLeft <= 0) {
                    clearInterval(countdown);
                    modal.remove();
                    resolve({ success: true, reward: 1 });
                }
            }, 1000);

            // Allow manual completion after 15 seconds
            const completeBtn = modal.querySelector('.complete-ad-btn');
            completeBtn.addEventListener('click', () => {
                if (timeLeft <= 0) {
                    clearInterval(countdown);
                    modal.remove();
                    resolve({ success: true, reward: 1 });
                }
            });
        });
    }

    /**
     * Create ad modal
     */
    createAdModal() {
        const modal = document.createElement('div');
        modal.className = 'ad-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        modal.innerHTML = `
            <div class="ad-content" style="
                background: white;
                padding: 20px;
                border-radius: 8px;
                max-width: 90%;
                max-height: 90%;
                overflow: auto;
                text-align: center;
            ">
                <h3 style="margin: 0 0 15px 0; color: #333;">Watch Ad for 1 Attempt</h3>
                <div class="ad-timer" style="margin: 10px 0; color: #666;">Ad will complete in 15 seconds...</div>
                <div class="ad-placeholder" style="
                    background: #f0f0f0;
                    border: 2px dashed #ccc;
                    padding: 40px;
                    margin: 15px 0;
                    color: #666;
                ">
                    <p>AdSense Ad Loading...</p>
                    <p style="font-size: 12px;">(This will show real ads after AdSense approval)</p>
                </div>
                <button class="complete-ad-btn" style="
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 10px;
                " disabled>Complete Ad (15s)</button>
            </div>
        `;

        // Enable complete button after 15 seconds
        setTimeout(() => {
            const btn = modal.querySelector('.complete-ad-btn');
            btn.disabled = false;
            btn.textContent = 'Complete Ad';
            btn.style.background = '#4CAF50';
        }, 15000);

        return modal;
    }

    /**
     * Update configuration with real AdSense IDs
     */
    updateConfig(clientId, adUnitId) {
        this.config.clientId = clientId;
        this.config.adUnits.gameAd.id = adUnitId;
        console.log('AdSense configuration updated with real IDs');
    }

    /**
     * Get earnings info (placeholder - real data comes from AdSense dashboard)
     */
    getEarningsInfo() {
        return {
            totalEarnings: '$0.00',
            thisMonth: '$0.00',
            adViews: 0,
            clickRate: '0%'
        };
    }
}

// Export for use in other files
window.AdSenseManager = AdSenseManager; 