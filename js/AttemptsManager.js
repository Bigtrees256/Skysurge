class AttemptsManager {
    constructor() {
        this.attempts = 5; // Default attempts
        this.apiBase = 'http://localhost:3000/api/attempts';
        this.isLoading = false;
        this.error = null;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 AttemptsManager: Initializing...');

        // Check if authManager is available
        if (!window.authManager && typeof authManager === 'undefined') {
            console.log('⚠️ AttemptsManager: authManager not available yet, will retry...');
            // Retry after a short delay
            setTimeout(() => this.init(), 1000);
            return;
        }

        console.log('✅ AttemptsManager: authManager available');

        // Set up auth state listener to load attempts when user logs in
        const authMgr = window.authManager || authManager;
        if (authMgr && typeof authMgr.onAuthStateChanged === 'function') {
            authMgr.onAuthStateChanged((user) => {
                console.log('🔔 AttemptsManager: Auth state changed, user:', user ? user.email : 'No user');
                if (user) {
                    // User is authenticated, load attempts
                    console.log('🔄 AttemptsManager: User authenticated, loading attempts...');
                    this.loadAttempts();
                } else {
                    // User signed out, reset to default
                    console.log('🔄 AttemptsManager: User signed out, resetting to default attempts');
                    this.attempts = 5;
                    this.notifyUIUpdate();
                }
            });
        }

        // Also try to load attempts immediately if user is already authenticated
        if (authMgr && authMgr.isAuthenticated && authMgr.isAuthenticated()) {
            console.log('🔄 AttemptsManager: User already authenticated, loading attempts...');
            await this.loadAttempts();
        } else {
            console.log('🔄 AttemptsManager: User not authenticated, using default attempts');
        }
    }
    
    // Load attempts from backend
    async loadAttempts() {
        console.log('🔄 AttemptsManager: Loading attempts from backend...');
        try {
            const authMgr = window.authManager || authManager;

            // Check if user is authenticated
            if (!authMgr || !authMgr.isAuthenticated()) {
                console.log('❌ AttemptsManager: User not authenticated, using default attempts:', this.attempts);
                return;
            }

            const token = await authMgr.getIdToken();
            if (!token) {
                console.log('❌ AttemptsManager: No auth token, using default attempts:', this.attempts);
                return;
            }

            console.log('🔑 AttemptsManager: Token obtained, making API call...');
            const response = await fetch(`${this.apiBase}/my`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });

            console.log('📡 AttemptsManager: API response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('📊 AttemptsManager: Raw API data:', data);
                const newAttempts = data.remainingAttempts !== undefined ? data.remainingAttempts : 5;

                if (newAttempts !== this.attempts) {
                    this.attempts = newAttempts;
                    console.log('✅ AttemptsManager: Attempts updated from backend:', this.attempts);

                    // Trigger UI updates
                    this.notifyUIUpdate();
                } else {
                    console.log('✅ AttemptsManager: Attempts confirmed from backend:', this.attempts);
                }
            } else {
                const errorText = await response.text();
                console.log('❌ AttemptsManager: Failed to load attempts. Status:', response.status, 'Error:', errorText);
                console.log('🔄 AttemptsManager: Using default attempts:', this.attempts);
            }
        } catch (error) {
            console.error('❌ AttemptsManager: Error loading attempts:', error);
            console.log('🔄 AttemptsManager: Using default attempts:', this.attempts);
        }
    }
    
    // Get current attempts
    getAttempts() {
        return this.attempts;
    }
    
    // Check if player has attempts
    hasAttempts() {
        return this.attempts > 0;
    }
    
    // Use an attempt
    async useAttempt() {
        if (this.attempts <= 0) {
            return false;
        }
        
        try {
            const authMgr = window.authManager || authManager;
            const token = await authMgr.getIdToken();
            if (!token) {
                // No token, just decrement locally
                this.attempts--;
                console.log('No token, using local attempts. New count:', this.attempts);
                return true;
            }
            
            const response = await fetch(`${this.apiBase}/use`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.attempts = data.attempts.remainingAttempts;
                console.log('Attempt used successfully. New count:', this.attempts);
                return true;
            } else {
                // Fallback to local decrement
                this.attempts--;
                console.log('API failed, using local attempts. New count:', this.attempts);
                return true;
            }
        } catch (error) {
            console.error('Error using attempt:', error);
            // Fallback to local decrement
            this.attempts--;
            return true;
        }
    }
    
    // Add attempts
    async addAttempts(count, type = 'bonus') {
        try {
            const authMgr = window.authManager || authManager;
            const token = await authMgr.getIdToken();
            if (!token) {
                // No token, just add locally
                this.attempts += count;
                console.log('No token, adding attempts locally. New count:', this.attempts);
                return { success: true, message: `Added ${count} attempts locally.` };
            }
            
            const response = await fetch(`${this.apiBase}/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ type, amount: count })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.attempts = data.attempts.remainingAttempts;
                return { success: true, message: data.message };
            } else {
                // Fallback to local add
                this.attempts += count;
                return { success: true, message: `Added ${count} attempts locally.` };
            }
        } catch (error) {
            console.error('Error adding attempts:', error);
            // Fallback to local add
            this.attempts += count;
            return { success: true, message: `Added ${count} attempts locally.` };
        }
    }
    
    // Reset attempts
    resetAttempts() {
        this.attempts = 5;
    }

    // Refresh attempts from backend (for UI updates after purchases)
    async refreshAttempts() {
        console.log('AttemptsManager: Refreshing attempts from backend...');
        await this.loadAttempts();

        // Trigger UI update events
        if (window.game && window.game.attemptsUI) {
            window.game.attemptsUI.updateDisplay();
        }

        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('attemptsUpdated', {
            detail: { attempts: this.attempts }
        }));

        console.log('AttemptsManager: Attempts refreshed to:', this.attempts);
    }

    // Notify UI components that attempts have been updated
    notifyUIUpdate() {
        console.log('🔄 AttemptsManager: Notifying UI components of attempts update');

        // Update AttemptsUI if available
        if (window.game && window.game.attemptsUI) {
            window.game.attemptsUI.updateDisplay();
        }

        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('attemptsUpdated', {
            detail: { attempts: this.attempts }
        }));

        // Force re-render of current scene if it displays attempts
        if (window.game && window.game.currentScene) {
            // Scenes will pick up the new attempts count on their next render cycle
            console.log('🎮 AttemptsManager: Current scene will update attempts display on next render');
        }
    }
    
    // Purchase attempts via Stripe
    async purchaseAttempts(packageId = '3') {
        try {
            const response = await fetch('http://localhost:3000/api/payments/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packageId })
            });
            
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
                return { success: true };
            } else {
                return { success: false, message: data.error || 'Failed to start purchase' };
            }
        } catch (error) {
            return { success: false, message: 'Payment failed' };
        }
    }
    
    // Watch ad for attempts
    async watchAd() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                return { success: false, message: 'You must be logged in to watch ads' };
            }

            // Ensure AdManager is available and ready
            if (typeof window.ensureAdManager === 'function') {
                window.adManager = window.ensureAdManager();
            } else if (typeof AdManager !== 'undefined') {
                if (!window.adManager) {
                    window.adManager = new AdManager();
                }
            } else {
                return { success: false, message: 'Ad system not loaded. Please refresh the page and try again.' };
            }

            // Wait for AdManager to be ready
            if (window.adManager && typeof window.adManager.ensureReady === 'function') {
                await window.adManager.ensureReady();
            } else {
                // Fallback: wait a bit for initialization
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Check if user can watch an ad (no daily limits)
            try {
                const canWatch = await window.adManager.canWatchAd();
                if (!canWatch) {
                    return { 
                        success: false, 
                        message: 'You must be logged in to watch ads' 
                    };
                }
            } catch (error) {
                console.error('Error checking ad availability:', error);
                return { 
                    success: false, 
                    message: 'Ad system error. Please try again.' 
                };
            }

            // Show the rewarded ad
            let adResult;
            try {
                adResult = await window.adManager.showRewardedAd();
            } catch (error) {
                console.error('Error showing rewarded ad:', error);
                return { 
                    success: false, 
                    message: 'Failed to show advertisement. Please try again.' 
                };
            }
            
            if (adResult.success) {
                // Track the ad view on backend
                const response = await fetch(`${this.apiBase}/ads/watch`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        adType: 'rewarded',
                        adProvider: 'admob'
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.attempts = data.attempts.remainingAttempts;
                    return { success: true, message: data.message };
                } else {
                    const errorData = await response.json();
                    return { success: false, message: errorData.error || 'Failed to track ad view' };
                }
            } else {
                return { success: false, message: 'Ad was not completed. Please watch the full ad to earn attempts.' };
            }
            
        } catch (error) {
            console.error('Error watching ad:', error);
            return { success: false, message: error.message || 'Failed to show advertisement' };
        }
    }
    
    // Share on Instagram for attempts
    async shareOnInstagram() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                return { success: false, message: 'You must be logged in to share on Instagram' };
            }

            // Check Instagram share limit first
            const limitResponse = await fetch(`${this.apiBase}/instagram-limit`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (limitResponse.ok) {
                const limitData = await limitResponse.json();
                if (limitData.remainingShares <= 0) {
                    return { success: false, message: 'Daily Instagram share limit reached. Try again tomorrow!' };
                }
            }

            // Get current prize pool information and top score
            let prizePoolInfo = '';
            try {
                // Fetch prize pool
                const prizeResponse = await fetch('http://localhost:3000/api/prize-pool/current', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                let currentPrize = 0;
                let topScore = 0;
                
                if (prizeResponse.ok) {
                    const prizeData = await prizeResponse.json();
                    currentPrize = prizeData.pool?.totalAmount || 0;
                }
                
                // Fetch top score from leaderboard
                const leaderboardResponse = await fetch('http://localhost:3000/api/scores/leaderboard?limit=1', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (leaderboardResponse.ok) {
                    const leaderboardData = await leaderboardResponse.json();
                    if (leaderboardData.scores && leaderboardData.scores.length > 0) {
                        topScore = leaderboardData.scores[0].score || 0;
                    }
                }
                
                prizePoolInfo = `\n💰 Current Prize Pool: $${currentPrize.toFixed(2)}`;
                if (topScore > 0) {
                    prizePoolInfo += `\n🏆 Beat the high score of ${topScore} to win!`;
                }
            } catch (error) {
                console.log('Could not fetch prize pool info:', error);
                prizePoolInfo = '\n💰 Win real money prizes every week!';
            }
            
            // Create Instagram share content
            const gameUrl = window.location.origin;
            const shareText = `🚀 SkySurge - Win Real Money!${prizePoolInfo}\n\n🏆 Beat the high score & claim your prize! 💰`;
            const hashtags = '#SkySurge #WinMoney #Gaming #Prizes #Challenge';
            
            // Show Instagram share dialog with graphic post option
            const instagramDialog = this.createInstagramShareDialog(gameUrl, shareText, hashtags);
            document.body.appendChild(instagramDialog);
            
            // Track the share on backend
            const response = await fetch(`${this.apiBase}/instagram-share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.attempts = data.attempts.remainingAttempts;
                return { success: true, message: data.message };
            } else {
                const errorData = await response.json();
                return { success: false, message: errorData.error || 'Failed to track Instagram share' };
            }
        } catch (error) {
            console.error('Error sharing on Instagram:', error);
            return { success: false, message: 'Failed to share on Instagram' };
        }
    }
    
    // Refer friend for attempts
    async referFriend() {
        try {
            console.log('🔗 Starting referral process...');
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.log('❌ No auth token found');
                return { success: false, message: 'You must be logged in to refer friends' };
            }

            console.log('✅ Auth token found, getting user info...');
            // Get current user info to create referral link
            const userResponse = await fetch('http://localhost:3000/api/auth/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!userResponse.ok) {
                const errorText = await userResponse.text();
                console.error('❌ Failed to get user info:', userResponse.status, errorText);
                return { success: false, message: 'Failed to get user information' };
            }

            const userData = await userResponse.json();
            const username = userData.user.username;
            console.log('✅ User info retrieved:', username);

            // Check referral limits for current event
            console.log('🔍 Checking referral limits...');
            let limitData = null;
            try {
                const limitResponse = await fetch('http://localhost:3000/api/referrals/check-limit', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (limitResponse.ok) {
                    limitData = await limitResponse.json();
                    console.log('✅ Limit check response:', limitData);
                    if (!limitData.canRefer) {
                        console.log('❌ Cannot refer:', limitData.reason);
                        return {
                            success: false,
                            message: limitData.reason || 'Cannot create referral at this time'
                        };
                    }
                } else {
                    const errorText = await limitResponse.text();
                    console.warn('⚠️ Failed to check referral limits:', limitResponse.status, errorText);
                    // Continue without limit data - user can still create referral link
                }
            } catch (limitError) {
                console.warn('⚠️ Error checking referral limits:', limitError);
                // Continue without limit data - user can still create referral link
            }

            // Create referral link
            console.log('🔗 Creating referral link...');
            const gameUrl = window.location.origin;
            const referralUrl = `${gameUrl}/register.html?ref=${encodeURIComponent(username)}`;

            // Create share text
            const shareText = `🚀 Join me on SkySurge - The Ultimate Flying Challenge! Win real money prizes every week! Each referral gives you both 5 attempts! Use my referral link: ${referralUrl}`;

            console.log('📋 Referral URL created:', referralUrl);

            // Show referral dialog with copy link option and limit info
            console.log('🎨 Creating referral dialog...');
            const referralDialog = this.createReferralDialog(referralUrl, shareText, limitData);
            document.body.appendChild(referralDialog);

            console.log('✅ Referral dialog displayed successfully');
            // Return success without granting attempts immediately
            // Attempts will be granted when someone actually uses the referral link
            return { success: true, message: 'Referral link created successfully!' };
        } catch (error) {
            console.error('❌ Error referring friend:', error);
            return { success: false, message: 'Failed to create referral link' };
        }
    }

    // Create referral dialog
    createReferralDialog(referralUrl, shareText, limitData = null) {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            max-width: 500px;
            width: 90%;
            font-family: Arial, sans-serif;
        `;

        const limitInfo = limitData && limitData.currentEvent ? `
            <div style="background: #e8f5e8; border: 1px solid #4caf50; border-radius: 8px; padding: 12px; margin-bottom: 15px; font-size: 14px;">
                <strong>📊 Event Progress:</strong><br>
                Referrals made: ${limitData.currentEvent.referralsMade}/${limitData.currentEvent.limit}<br>
                Remaining: ${limitData.currentEvent.referralsRemaining}
            </div>
        ` : '';

        content.innerHTML = `
            <h2 style="color: #333; margin-bottom: 20px;">👥 Refer a Friend</h2>
            <p style="color: #666; margin-bottom: 20px;">Share this link with your friends and both of you get 5 bonus attempts!</p>

            ${limitInfo}

            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; word-break: break-all;">
                <strong>Your Referral Link:</strong><br>
                <span style="color: #2196F3; font-size: 14px;">${referralUrl}</span>
            </div>

            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button id="copyLinkBtn" style="
                    padding: 12px 20px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                ">📋 Copy Link</button>
                
                <button id="shareWhatsAppBtn" style="
                    padding: 12px 20px;
                    background: #25D366;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                ">📱 WhatsApp</button>
                
                <button id="shareTelegramBtn" style="
                    padding: 12px 20px;
                    background: #0088cc;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                ">📬 Telegram</button>
                
                <button id="shareEmailBtn" style="
                    padding: 12px 20px;
                    background: #EA4335;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                ">📧 Email</button>
            </div>
            
            <button id="closeReferralBtn" style="
                margin-top: 20px;
                padding: 10px 20px;
                background: #666;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
            ">Close</button>
        `;

        // Add event listeners
        content.querySelector('#copyLinkBtn').onclick = () => {
            navigator.clipboard.writeText(referralUrl).then(() => {
                alert('✅ Referral link copied to clipboard!');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = referralUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('✅ Referral link copied to clipboard!');
            });
        };

        content.querySelector('#shareWhatsAppBtn').onclick = () => {
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
            window.open(whatsappUrl, '_blank');
        };

        content.querySelector('#shareTelegramBtn').onclick = () => {
            const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(shareText)}`;
            window.open(telegramUrl, '_blank');
        };

        content.querySelector('#shareEmailBtn').onclick = () => {
            const emailUrl = `mailto:?subject=${encodeURIComponent('Join me on SkySurge!')}&body=${encodeURIComponent(shareText)}`;
            window.open(emailUrl);
        };

        content.querySelector('#closeReferralBtn').onclick = () => {
            document.body.removeChild(dialog);
        };

        dialog.appendChild(content);
        return dialog;
    }

    // Create Instagram share dialog
    createInstagramShareDialog(gameUrl, shareText, hashtags) {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 20000;
        `;
        
        const content = document.createElement('div');
        const fullShareText = `${shareText}\n\n${hashtags}\n\n${gameUrl}`;

        content.innerHTML = `
            <h2 style="color: #333; margin-bottom: 20px;">📸 Share on Instagram</h2>
            <p style="color: #666; margin-bottom: 20px;">Create a graphic post or copy the text to share!</p>
            
            <div style="display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 300px;">
                    <h3 style="color: #333; margin-bottom: 15px;">🎨 Graphic Post</h3>
                    <div id="instagramPostPreview" style="
                        width: 300px;
                        height: 300px;
                        margin: 0 auto;
                        background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 25%, #45B7D1 50%, #96CEB4 100%);
                        border-radius: 12px;
                        position: relative;
                        overflow: hidden;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    ">
                        <div style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            padding: 25px;
                            color: white;
                            text-align: center;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                        ">
                            <div style="font-size: 32px; font-weight: bold; margin-bottom: 10px; text-shadow: 0 0 15px rgba(255,255,255,0.5);">🚀 SkySurge</div>
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 15px; opacity: 0.9;">WIN REAL MONEY!</div>
                            <div style="font-size: 14px; margin-bottom: 10px; line-height: 1.3;">${shareText.replace(/\n/g, '<br>')}</div>
                            <div style="background: rgba(255,255,255,0.2); padding: 8px; border-radius: 6px; margin: 8px 0; border: 1px solid rgba(255,255,255,0.3);">
                                <div style="font-size: 12px; font-weight: bold;">🎮 PLAY NOW & WIN! 🎮</div>
                            </div>
                            <div style="font-size: 11px; opacity: 0.9; margin-top: auto; font-weight: bold;">${hashtags}</div>
                            <div style="font-size: 10px; opacity: 0.8; margin-top: 3px; font-weight: bold;">skysurge.game</div>
                        </div>
                    </div>
                    <div style="margin-top: 15px;">
                        <button id="downloadPostBtn" style="padding: 12px 24px; background: #E1306C; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-right: 10px;">📥 Download Post</button>
                        <button id="previewPostBtn" style="padding: 12px 24px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">👁️ Preview</button>
                    </div>
                </div>
                
                <div style="flex: 1; min-width: 300px;">
                    <h3 style="color: #333; margin-bottom: 15px;">📝 Text Post</h3>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: left; max-height: 200px; overflow-y: auto;">
                        <strong>Share Text (Copy this):</strong><br>
                        <span style="color: #333; font-size: 14px; white-space: pre-line;">${fullShareText}</span>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                        <button id="copyTextBtn" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">📋 Copy Text</button>
                        <button id="openInstagramBtn" style="padding: 10px 20px; background: #E1306C; color: white; border: none; border-radius: 5px; cursor: pointer;">📱 Open Instagram</button>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button id="shareOtherBtn" style="padding: 10px 20px; background: #25D366; color: white; border: none; border-radius: 5px; cursor: pointer;">📱 WhatsApp</button>
                <button id="shareTelegramBtn" style="padding: 10px 20px; background: #0088cc; color: white; border: none; border-radius: 5px; cursor: pointer;">📱 Telegram</button>
            </div>
            
            <button id="closeInstagramBtn" style="position: absolute; top: 10px; right: 15px; background: #ff4444; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 18px;">✕</button>
        `;
        
        content.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            max-width: 800px;
            width: 95%;
            font-family: Arial, sans-serif;
            position: relative;
        `;
        
        // Add event listeners
        content.querySelector('#copyTextBtn').onclick = () => {
            navigator.clipboard.writeText(fullShareText).then(() => {
                alert('✅ Instagram share text copied to clipboard! Now paste it on Instagram!');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = fullShareText;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('✅ Instagram share text copied to clipboard! Now paste it on Instagram!');
            });
        };

        content.querySelector('#openInstagramBtn').onclick = () => {
            const instagramUrl = 'https://www.instagram.com/';
            window.open(instagramUrl, '_blank');
            alert('📱 Instagram opened! Paste the copied text in your story or post!');
        };

        content.querySelector('#shareOtherBtn').onclick = () => {
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullShareText)}`;
            window.open(whatsappUrl, '_blank');
        };

        content.querySelector('#shareTelegramBtn').onclick = () => {
            const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(gameUrl)}&text=${encodeURIComponent(fullShareText)}`;
            window.open(telegramUrl, '_blank');
        };

        content.querySelector('#closeInstagramBtn').onclick = () => {
            document.body.removeChild(dialog);
        };

        // Add graphic post functionality
        content.querySelector('#downloadPostBtn').onclick = () => {
            this.generateInstagramPost(shareText, hashtags);
        };

        content.querySelector('#previewPostBtn').onclick = () => {
            this.previewInstagramPost(shareText, hashtags);
        };

        dialog.appendChild(content);
        return dialog;
    }
    
    // Claim daily free attempt
    async claimDailyFreeAttempt() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                return { success: false, message: 'You must be logged in to claim daily attempts' };
            }
            
            const response = await fetch(`${this.apiBase}/claim-daily`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.attempts = data.attempts.remainingAttempts;
                return { success: true, message: data.message };
            } else {
                return { success: false, message: data.error || 'Failed to claim daily attempt' };
            }
        } catch (error) {
            console.error('Error claiming daily free attempt:', error);
            return { success: false, message: 'Failed to claim daily attempt' };
        }
    }
    
    // Check if daily free attempt is available
    async checkDailyFreeAttempt() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                return { available: false, message: 'You must be logged in' };
            }
            
            const response = await fetch(`${this.apiBase}/daily-status`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return { 
                    available: data.canClaim, 
                    message: data.message,
                    lastClaimDate: data.lastClaimDate,
                    dailyFreeAttemptsClaimed: data.dailyFreeAttemptsClaimed
                };
            } else {
                return { available: false, message: 'Failed to check daily attempt status' };
            }
        } catch (error) {
            console.error('Error checking daily free attempt:', error);
            return { available: false, message: 'Failed to check daily attempt status' };
        }
    }
    
    // Generate Instagram post as downloadable image
    generateInstagramPost(shareText, hashtags) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size (Instagram square post)
        canvas.width = 1080;
        canvas.height = 1080;
        
        // Create vibrant gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#FF6B6B');
        gradient.addColorStop(0.3, '#4ECDC4');
        gradient.addColorStop(0.7, '#45B7D1');
        gradient.addColorStop(1, '#96CEB4');
        
        // Fill background
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add animated-style decorative elements
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.arc(
                canvas.width * (0.1 + i * 0.1), 
                canvas.height * (0.1 + Math.sin(i) * 0.3), 
                30 + i * 5, 
                0, 
                Math.PI * 2
            );
            ctx.fill();
        }
        
        // Add geometric shapes for modern look
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(canvas.width * 0.7, canvas.height * 0.1, 80, 80);
        ctx.fillRect(canvas.width * 0.1, canvas.height * 0.7, 60, 60);
        
        // Add glow effect around title
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 20;
        
        // Set text properties
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        
        // Enhanced title with larger font and better positioning
        ctx.font = 'bold 96px Arial';
        ctx.fillText('🚀 SkySurge', canvas.width / 2, 180);
        
        // Add subtitle
        ctx.shadowBlur = 10;
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText('WIN REAL MONEY!', canvas.width / 2, 250);
        
        // Reset shadow for main text
        ctx.shadowBlur = 0;
        
        // Main text with better spacing
        ctx.font = 'bold 42px Arial';
        const lines = this.wrapText(ctx, shareText, canvas.width - 120);
        let y = 350;
        lines.forEach(line => {
            ctx.fillText(line, canvas.width / 2, y);
            y += 60;
        });
        
        // Add call-to-action box
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(canvas.width * 0.2, canvas.height * 0.6, canvas.width * 0.6, 80);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.strokeRect(canvas.width * 0.2, canvas.height * 0.6, canvas.width * 0.6, 80);
        
        // CTA text
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText('🎮 PLAY NOW & WIN! 🎮', canvas.width / 2, canvas.height * 0.65);
        
        // Hashtags with better styling
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const hashtagLines = this.wrapText(ctx, hashtags, canvas.width - 100);
        y = canvas.height - 120;
        hashtagLines.forEach(line => {
            ctx.fillText(line, canvas.width / 2, y);
            y += 40;
        });
        
        // Add website URL with glow
        ctx.shadowBlur = 15;
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fillText('skysurge.game', canvas.width / 2, canvas.height - 40);
        
        // Convert to blob and download
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'skysurge-instagram-post.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('✅ Instagram post downloaded! Upload it to Instagram with the copied caption!');
        }, 'image/png');
    }
    
    // Preview Instagram post in full screen
    previewInstagramPost(shareText, hashtags) {
        const previewDialog = document.createElement('div');
        previewDialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 30000;
        `;
        
        const previewContent = document.createElement('div');
        previewContent.style.cssText = `
            background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 25%, #45B7D1 50%, #96CEB4 100%);
            width: 400px;
            height: 400px;
            border-radius: 12px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        `;
        
        previewContent.innerHTML = `
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                padding: 40px;
                color: white;
                text-align: center;
                display: flex;
                flex-direction: column;
                justify-content: center;
            ">
                <div style="font-size: 48px; font-weight: bold; margin-bottom: 15px; text-shadow: 0 0 20px rgba(255,255,255,0.5);">🚀 SkySurge</div>
                <div style="font-size: 20px; font-weight: bold; margin-bottom: 20px; opacity: 0.9;">WIN REAL MONEY!</div>
                <div style="font-size: 18px; margin-bottom: 15px; line-height: 1.4;">${shareText.replace(/\n/g, '<br>')}</div>
                <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; margin: 10px 0; border: 2px solid rgba(255,255,255,0.3);">
                    <div style="font-size: 16px; font-weight: bold;">🎮 PLAY NOW & WIN! 🎮</div>
                </div>
                <div style="font-size: 14px; opacity: 0.9; margin-top: auto; font-weight: bold;">${hashtags}</div>
                <div style="font-size: 12px; opacity: 0.8; margin-top: 5px; font-weight: bold;">skysurge.game</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                position: absolute;
                top: 15px;
                right: 15px;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                cursor: pointer;
                font-size: 24px;
                backdrop-filter: blur(10px);
            ">✕</button>
        `;
        
        previewDialog.appendChild(previewContent);
        document.body.appendChild(previewDialog);
    }
    
    // Helper function to wrap text
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];
        
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + ' ' + word).width;
            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }
} 