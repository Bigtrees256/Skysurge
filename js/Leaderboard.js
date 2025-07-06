class Leaderboard {
    constructor() {
        this.scores = [];
        this.maxEntries = 10;
        this.apiBase = '/api/scores';
        this.isLoading = false;
        this.error = null;
        this.loadScores();
    }
    
    async loadScores() {
        this.isLoading = true;
        this.error = null;
        try {
            const res = await fetch(`${this.apiBase}/leaderboard`);
            if (!res.ok) throw new Error('Failed to fetch leaderboard');
            const data = await res.json();
            this.scores = (data.scores || []).map(entry => ({
                score: entry.score,
                playerName: entry.username || entry.playerName || 'Player',
                date: entry.createdAt || entry.date || new Date().toISOString(),
                timestamp: new Date(entry.createdAt || entry.date || Date.now()).getTime()
            }));
        } catch (e) {
            this.error = e.message;
            this.scores = [];
        } finally {
            this.isLoading = false;
        }
    }
    
    async addScore(score, playerName = 'Player', token = null) {
        try {
            const res = await fetch(this.apiBase, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ score })
            });
            if (!res.ok) throw new Error('Failed to submit score');
            // Optionally, you can use the returned score
            await this.loadScores(); // Refresh leaderboard
            document.dispatchEvent(new CustomEvent('scoreAdded', { detail: { score } }));
        } catch (e) {
            this.error = e.message;
        }
    }
    
    getTopScores(count = 5) {
        return this.scores.slice(0, count);
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
        ctx.fillText('Leaderboard', x + width / 2, y + 30);
        
        // Draw scores
        const topScores = this.getTopScores(5);
        const startY = y + 60;
        const lineHeight = 25;
        
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
                    ctx.fillRect(x + 5, scoreY - 15, width - 10, lineHeight);
                }
                
                // Position
                ctx.fillStyle = '#333';
                ctx.font = 'bold 14px Arial';
                ctx.fillText(`${index + 1}.`, x + 10, scoreY);
                
                // Score
                ctx.font = 'bold 16px Arial';
                ctx.fillText(entry.score.toString(), x + 50, scoreY);
                
                // Player name
                ctx.font = '14px Arial';
                ctx.fillStyle = '#666';
                ctx.fillText(entry.playerName, x + 120, scoreY);
                
                // Date
                ctx.font = '12px Arial';
                ctx.fillText(this.formatDate(entry.date), x + 200, scoreY);
            });
        }
        
        ctx.restore();
    }
} 