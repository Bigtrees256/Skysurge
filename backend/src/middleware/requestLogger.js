// Request logging middleware to track frequent requests
const requestCounts = new Map();

const requestLogger = (req, res, next) => {
    const path = req.path;
    const ip = req.ip || req.connection.remoteAddress;
    const key = `${ip}_${path}`;
    
    // Track request count
    if (!requestCounts.has(key)) {
        requestCounts.set(key, { count: 0, firstSeen: Date.now() });
    }
    
    const tracker = requestCounts.get(key);
    tracker.count++;
    
    // Log if too many requests from same IP to same endpoint
    if (tracker.count > 10) {
        const timeWindow = Date.now() - tracker.firstSeen;
        const requestsPerMinute = (tracker.count / timeWindow) * 60000;
        
        if (requestsPerMinute > 60) { // More than 60 requests per minute
            console.warn(`⚠️ High request rate detected: ${ip} -> ${path} (${Math.round(requestsPerMinute)} req/min)`);
        }
    }
    
    // Reset counter every 5 minutes
    if (Date.now() - tracker.firstSeen > 300000) {
        tracker.count = 1;
        tracker.firstSeen = Date.now();
    }
    
    // Add request info to response headers for debugging
    res.set('X-Request-Count', tracker.count.toString());
    res.set('X-Request-Rate', `${Math.round((tracker.count / (Date.now() - tracker.firstSeen)) * 60000)}/min`);
    
    next();
};

// Clean up old entries every 10 minutes
setInterval(() => {
    const tenMinutesAgo = Date.now() - 600000;
    for (const [key, tracker] of requestCounts.entries()) {
        if (tracker.firstSeen < tenMinutesAgo) {
            requestCounts.delete(key);
        }
    }
}, 600000);

module.exports = requestLogger; 