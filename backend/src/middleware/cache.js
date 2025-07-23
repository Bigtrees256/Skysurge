// Simple in-memory cache for reducing database load
const cache = new Map();

// Cache middleware for leaderboard endpoints
const leaderboardCache = (duration = 30000) => { // Default 30 seconds
    return (req, res, next) => {
        const key = `leaderboard_${req.query.limit || 10}_${req.query.page || 1}`;
        const cached = cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < duration) {
            console.log('📦 Serving leaderboard from cache');
            return res.json(cached.data);
        }
        
        // Store original send method
        const originalSend = res.json;
        
        // Override send method to cache the response
        res.json = function(data) {
            cache.set(key, {
                data: data,
                timestamp: Date.now()
            });
            
            // Clean up old cache entries (older than 5 minutes)
            const fiveMinutesAgo = Date.now() - 300000;
            for (const [cacheKey, cacheValue] of cache.entries()) {
                if (cacheValue.timestamp < fiveMinutesAgo) {
                    cache.delete(cacheKey);
                }
            }
            
            return originalSend.call(this, data);
        };
        
        next();
    };
};

// Cache middleware for prize pool data
const prizePoolCache = (duration = 15000) => { // Default 15 seconds
    return (req, res, next) => {
        const key = 'prize_pool_current';
        const cached = cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < duration) {
            console.log('📦 Serving prize pool from cache');
            return res.json(cached.data);
        }
        
        const originalSend = res.json;
        
        res.json = function(data) {
            cache.set(key, {
                data: data,
                timestamp: Date.now()
            });
            
            return originalSend.call(this, data);
        };
        
        next();
    };
};

// Clear cache when new scores are added
const clearLeaderboardCache = () => {
    for (const [key] of cache.entries()) {
        if (key.startsWith('leaderboard_')) {
            cache.delete(key);
        }
    }
    console.log('🗑️ Cleared leaderboard cache');
};

// Clear cache when prize pool is updated
const clearPrizePoolCache = () => {
    cache.delete('prize_pool_current');
    console.log('🗑️ Cleared prize pool cache');
};

module.exports = {
    leaderboardCache,
    prizePoolCache,
    clearLeaderboardCache,
    clearPrizePoolCache
}; 