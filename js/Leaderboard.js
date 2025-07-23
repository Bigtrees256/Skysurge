class Leaderboard {
    constructor() {
        this.scores = [];
        this.maxEntries = 10;
        this.apiBase = window.AppConfig ? `${window.AppConfig.apiBaseUrl}/api/scores` : 'http://localhost:3000/api/scores';
        this.isLoading = false;
        this.error = null;
        this.loadScores();
    }
    
    async loadScores() {
        this.isLoading = true;
        this.error = null;
        try {
            console.log('Leaderboard: Fetching scores from:', `${this.apiBase}/leaderboard`);
            
            const res = await fetch(`${this.apiBase}/leaderboard`);
            console.log('Leaderboard: Response status:', res.status, res.statusText);
            
            if (!res.ok) {
                const errorText = await res.text();
                console.error('Leaderboard: Failed to fetch leaderboard:', res.status, errorText);
                throw new Error(`Failed to fetch leaderboard: ${res.status} ${errorText}`);
            }
            
            const data = await res.json();
            console.log('Leaderboard: Raw data received:', data);
            
            // Process scores and keep only the highest score per user
            const userScores = new Map(); // Map to track highest score per user
            
            (data.scores || []).forEach(entry => {
                console.log('🎯 Leaderboard: Processing entry:', entry);
                const playerName = entry.username || entry.playerName || 'Player';
                const score = entry.score;
                const date = entry.createdAt || entry.date || new Date().toISOString();
                const timestamp = new Date(date).getTime();

                console.log(`🎯 Leaderboard: Extracted playerName: "${playerName}" from entry with username: "${entry.username}" and playerName: "${entry.playerName}"`);

                // If this user doesn't exist or this score is higher, update their entry
                if (!userScores.has(playerName) || score > userScores.get(playerName).score) {
                    const scoreEntry = {
                        score: score,
                        playerName: playerName,
                        username: playerName, // Add both for compatibility
                        date: date,
                        timestamp: timestamp
                    };
                    userScores.set(playerName, scoreEntry);
                    console.log(`🎯 Leaderboard: Added/Updated score entry:`, scoreEntry);
                }
            });
            
            // Convert map to array and sort by score (highest first)
            this.scores = Array.from(userScores.values())
                .sort((a, b) => b.score - a.score)
                .slice(0, this.maxEntries); // Keep only top entries
                
            console.log('Leaderboard: Processed scores:', this.scores);
                
        } catch (e) {
            console.error('Leaderboard: Error loading scores:', e);
            this.error = e.message;
            this.scores = [];
        } finally {
            this.isLoading = false;
        }
    }
    
    async addScore(score, playerName = 'Player', token = null) {
        try {
            console.log('🎯 Leaderboard: Starting score submission process');
            console.log('🎯 Leaderboard: Score details:', { score, playerName, hasToken: !!token });

            // Enhanced token logging
            if (token) {
                console.log('🎯 Leaderboard: Token preview:', token.substring(0, 50) + '...');
            } else {
                console.log('🎯 Leaderboard: No token provided');
            }

            const requestBody = {
                score: score,
                playerName: playerName
            };
            console.log('🎯 Leaderboard: Request body:', requestBody);

            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            console.log('🎯 Leaderboard: Request headers:', Object.keys(headers));

            console.log('🎯 Leaderboard: Making POST request to:', this.apiBase);
            const res = await fetch(this.apiBase, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            console.log('🎯 Leaderboard: Response status:', res.status, res.statusText);

            if (!res.ok) {
                const errorText = await res.text();
                console.error('❌ Leaderboard: Score submission failed:', res.status, errorText);
                throw new Error(`Failed to submit score: ${res.status} ${errorText}`);
            }

            const result = await res.json();
            console.log('✅ Leaderboard: Score submitted successfully:', result);
            console.log('✅ Leaderboard: Is new high score?', result.isNewHighScore);

            // Refresh leaderboard
            console.log('🔄 Leaderboard: Refreshing leaderboard data...');
            await this.loadScores();
            console.log('🔄 Leaderboard: Leaderboard refreshed, new scores count:', this.scores.length);

            // Dispatch multiple events to ensure all listeners are notified
            document.dispatchEvent(new CustomEvent('scoreAdded', { detail: { score } }));
            document.dispatchEvent(new CustomEvent('scoreSubmitted', { detail: { score, playerName } }));
            document.dispatchEvent(new CustomEvent('leaderboardUpdated', { detail: { scores: this.scores } }));

            console.log('✅ Leaderboard: Score submission process completed successfully');
        } catch (e) {
            console.error('❌ Leaderboard: Error submitting score:', e);
            this.error = e.message;
        }
    }
    
    getTopScores(count = 5) {
        return this.scores.slice(0, count);
    }
    
    getScores() {
        return this.scores;
    }
    
    getHighScore() {
        return this.scores.length > 0 ? this.scores[0].score : 0;
    }
    
    isNewHighScore(score) {
        return this.scores.length === 0 || score > this.getHighScore();
    }
    
    getScorePosition(score) {
        for (let i = 0; i < this.scores.length; i++) {
            if (score >= this.scores[i].score) {
                return i + 1;
            }
        }
        return this.scores.length + 1;
    }
    
    clearScores() {
        this.scores = [];
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }
    
    render(ctx, x, y, width, height, currentScore = null) {
        ctx.save();
        
        // Draw background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(x, y, width, height);
        
        // Draw border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Draw title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Top 10 Leaderboard', x + width / 2, y + 30);
        
        // Draw scores - show all 10 entries
        const topScores = this.getTopScores(10);
        const startY = y + 60;
        const lineHeight = 22; // Slightly smaller line height to fit 10 entries
        
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        
        if (this.isLoading) {
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('Loading...', x + width / 2, startY + 20);
        } else if (this.error) {
            ctx.fillStyle = '#c00';
            ctx.textAlign = 'center';
            ctx.fillText('Error loading leaderboard', x + width / 2, startY + 20);
            ctx.font = '12px Arial';
            ctx.fillText(this.error, x + width / 2, startY + 40);
        } else if (topScores.length === 0) {
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('No scores yet!', x + width / 2, startY + 20);
        } else {
            topScores.forEach((entry, index) => {
                const scoreY = startY + index * lineHeight;
                const isCurrentScore = currentScore && entry.score === currentScore;
                
                // Highlight current score if it matches
                if (isCurrentScore) {
                    ctx.fillStyle = '#FF6B6B';
                    ctx.fillRect(x + 5, scoreY - 12, width - 10, lineHeight);
                }
                
                // Position
                ctx.fillStyle = '#333';
                ctx.font = 'bold 12px Arial';
                ctx.fillText(`${index + 1}.`, x + 8, scoreY);
                
                // Score
                ctx.font = 'bold 14px Arial';
                ctx.fillText(entry.score.toString(), x + 35, scoreY);
                
                // Player name (truncate if too long)
                ctx.font = '12px Arial';
                ctx.fillStyle = '#666';
                let playerName = entry.playerName;
                if (playerName.length > 12) {
                    playerName = playerName.substring(0, 12) + '...';
                }
                ctx.fillText(playerName, x + 80, scoreY);
                
                // Date (shorter format)
                ctx.font = '10px Arial';
                ctx.fillText(this.formatDate(entry.date), x + 180, scoreY);
            });
        }
        
        ctx.restore();
    }
} 