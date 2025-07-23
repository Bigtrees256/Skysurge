// Ad Configuration
const adConfig = {
    // Daily limits
    maxDailyAdViews: 999999, // No practical limit
    
    // Ad rewards (attempts granted per ad type)
    adRewards: {
        rewarded: 1,      // Full attempt for rewarded ads
        interstitial: 0.5 // Half attempt for interstitial ads
    },
    
    // Ad providers
    providers: {
        admob: {
            enabled: true,
            appId: 'ca-app-pub-3940256099942544~3347511713', // Test app ID
            rewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917', // Test rewarded ad unit
            interstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712' // Test interstitial ad unit
        },
        unity: {
            enabled: false,
            gameId: 'your-unity-game-id'
        },
        facebook: {
            enabled: false,
            placementId: 'your-facebook-placement-id'
        }
    },
    
    // Rate limiting
    rateLimits: {
        adWatchPerMinute: 2,
        adWatchPerHour: 10
    },
    
    // Analytics settings
    analytics: {
        trackAdViews: true,
        trackRevenue: true,
        estimatedCPM: 1.00 // Estimated cost per mille (per 1000 views) in USD
    }
};

module.exports = adConfig; 