class AntiCheatManager {
    constructor() {
        this.currentSession = null;
        this.sessionStartTime = 0;
        this.inputEvents = [];
        this.physicsSnapshots = [];
        this.snapshotInterval = null;
        this.clientHash = null;
        this.apiBase = window.AppConfig ? `${window.AppConfig.apiBaseUrl}/api/game-sessions` : 'http://localhost:3000/api/game-sessions';
        this.initializeHash();
    }

    async initializeHash() {
        this.clientHash = await this.generateClientHash();
        console.log('🔒 AntiCheatManager: Initialized with client hash:', this.clientHash);
    }
    
    // Generate client hash for integrity validation
    async generateClientHash() {
        const gameConstants = {
            gravity: 0.04,
            jumpForce: -3.0,
            maxVelocityY: 3.5,
            baseSpeed: 1,
            obstacleSpawnInterval: 2000,
            gapSize: { min: 150, max: 180 }
        };

        // Use Web Crypto API to match server-side SHA-256 hash
        const hashString = JSON.stringify(gameConstants);
        const encoder = new TextEncoder();
        const data = encoder.encode(hashString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }
    
    // Start a new game session
    async startSession() {
        try {
            // Ensure hash is ready
            if (!this.clientHash) {
                await this.initializeHash();
            }

            const authMgr = window.authManager || authManager;
            const token = await authMgr.getIdToken();
            if (!token) {
                console.warn('AntiCheat: No auth token available');
                return false;
            }
            
            const response = await fetch(`${this.apiBase}/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    clientHash: this.clientHash
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to create session: ${response.status}`);
            }
            
            const data = await response.json();
            this.currentSession = data.sessionId;
            this.sessionStartTime = Date.now();
            this.inputEvents = [];
            this.physicsSnapshots = [];
            
            console.log('🔒 AntiCheatManager: Game session started successfully:', this.currentSession);
            
            // Start periodic physics snapshots
            this.startPhysicsSnapshots();
            
            return true;
        } catch (error) {
            console.error('AntiCheat: Failed to start session:', error);
            return false;
        }
    }
    
    // Record input events
    recordInputEvent(type, data = {}) {
        if (!this.currentSession) return;
        
        const event = {
            timestamp: Date.now() - this.sessionStartTime,
            type: type,
            data: data
        };
        
        this.inputEvents.push(event);
        
        // Send to server periodically (every 10 events)
        if (this.inputEvents.length % 10 === 0) {
            this.sendInputEvents();
        }
    }
    
    // Send input events to server
    async sendInputEvents() {
        if (!this.currentSession || this.inputEvents.length === 0) return;
        
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;
            
            const eventsToSend = this.inputEvents.splice(0, 10); // Send 10 events at a time
            
            await fetch(`${this.apiBase}/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    sessionId: this.currentSession,
                    eventType: 'batch',
                    eventData: eventsToSend,
                    timestamp: Date.now() - this.sessionStartTime
                })
            });
        } catch (error) {
            console.error('AntiCheat: Failed to send input events:', error);
        }
    }
    
    // Start periodic physics snapshots
    startPhysicsSnapshots() {
        this.snapshotInterval = setInterval(() => {
            this.takePhysicsSnapshot();
        }, 1000); // Take snapshot every second
    }
    
    // Take a physics snapshot
    takePhysicsSnapshot() {
        if (!this.currentSession || !window.game) return;
        
        const gameScene = window.game.currentScene;
        if (!gameScene || !gameScene.player) return;
        
        const snapshot = {
            timestamp: Date.now() - this.sessionStartTime,
            playerY: gameScene.player.y,
            playerVelocityY: gameScene.player.velocityY,
            obstacles: gameScene.obstacles.map(obstacle => ({
                x: obstacle.x,
                y: obstacle.y,
                width: obstacle.width,
                height: obstacle.height,
                isTop: obstacle.isTop
            })),
            score: gameScene.score || 0
        };
        
        this.physicsSnapshots.push(snapshot);
        
        // Keep only last 60 snapshots (1 minute of data)
        if (this.physicsSnapshots.length > 60) {
            this.physicsSnapshots.shift();
        }
    }
    
    // End the current session and submit score
    async endSession(finalScore) {
        console.log('🔒 AntiCheatManager: Ending session with score:', finalScore);

        if (!this.currentSession) {
            console.warn('🔒 AntiCheatManager: No active session to end');
            return false;
        }
        
        try {
            // Stop physics snapshots
            if (this.snapshotInterval) {
                clearInterval(this.snapshotInterval);
                this.snapshotInterval = null;
            }
            
            // Send final input events
            await this.sendInputEvents();
            
            const gameDuration = Date.now() - this.sessionStartTime;
            
            // Submit score with anti-cheat data
            const authMgr = window.authManager || authManager;
            const token = await authMgr.getIdToken();
            if (!token) {
                console.warn('AntiCheat: No auth token for score submission');
                return false;
            }
            
            const apiUrl = window.AppConfig ? `${window.AppConfig.apiBaseUrl}/api/scores` : 'http://localhost:3000/api/scores';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    score: finalScore,
                    sessionId: this.currentSession,
                    finalScore: finalScore,
                    gameDuration: gameDuration,
                    inputEvents: this.inputEvents,
                    physicsSnapshots: this.physicsSnapshots,
                    clientHash: this.clientHash
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.code === 'SUSPICIOUS_ACTIVITY') {
                    console.warn('AntiCheat: Score submission blocked due to suspicious activity');
                    return false;
                } else if (errorData.code === 'TOKEN_EXPIRED') {
                    console.warn('AntiCheat: Token expired, attempting to refresh and retry...');
                    // Try to get a fresh token and retry once
                    try {
                        const freshToken = await authManager.getIdToken();
                        const retryResponse = await fetch('http://localhost:3000/api/scores', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${freshToken}`
                            },
                            body: JSON.stringify({
                                score: finalScore,
                                sessionId: this.currentSession,
                                finalScore: finalScore,
                                gameDuration: gameDuration,
                                inputEvents: this.inputEvents,
                                physicsSnapshots: this.physicsSnapshots,
                                clientHash: this.clientHash
                            })
                        });

                        if (retryResponse.ok) {
                            console.log('AntiCheat: Score submitted successfully after token refresh');
                            const result = await retryResponse.json();
                            this.currentSession = null;
                            return true;
                        }
                    } catch (retryError) {
                        console.error('AntiCheat: Retry after token refresh failed:', retryError);
                    }
                    return false;
                }
                throw new Error(`Score submission failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
            }
            
            console.log('🔒 AntiCheatManager: Score submitted successfully with validation');
            console.log('🔒 AntiCheatManager: Score details:', {
                score: finalScore,
                sessionId: this.currentSession,
                gameDuration: gameDuration,
                inputEventsCount: this.inputEvents.length,
                snapshotsCount: this.physicsSnapshots.length
            });
            
            // Clear session data
            this.currentSession = null;
            this.sessionStartTime = 0;
            this.inputEvents = [];
            this.physicsSnapshots = [];
            
            return true;
        } catch (error) {
            console.error('AntiCheat: Failed to end session:', error);
            return false;
        }
    }
    
    // Get current session ID
    getCurrentSessionId() {
        return this.currentSession;
    }
    
    // Check if session is active
    isSessionActive() {
        return this.currentSession !== null;
    }
    
    // Force end session (for error handling)
    forceEndSession() {
        if (this.snapshotInterval) {
            clearInterval(this.snapshotInterval);
            this.snapshotInterval = null;
        }
        
        this.currentSession = null;
        this.sessionStartTime = 0;
        this.inputEvents = [];
        this.physicsSnapshots = [];
        
        console.log('AntiCheat: Session force ended');
    }
}

// Create global instance
window.antiCheatManager = new AntiCheatManager();

// Version: 1.0.1 - Fixed score submission URL 