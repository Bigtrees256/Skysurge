window.onerror = function(msg, url, line, col, error) {
  alert('Error: ' + msg + ' at ' + url + ':' + line);
};


const game = new Game();
window.game = game;

// AuthManager is initialized in AuthManager.js file

// Initialize AntiCheatManager
if (typeof AntiCheatManager !== 'undefined') {
    window.antiCheatManager = new AntiCheatManager();
    console.log('✅ AntiCheatManager initialized');
} else {
    console.warn('⚠️ AntiCheatManager not available');
}

// Initialize prize pool manager
let prizePoolManager = null;
if (typeof PrizePoolManager !== 'undefined') {
    prizePoolManager = new PrizePoolManager();
    window.prizePoolManager = prizePoolManager;
    
    // Render prize pool widget
    const prizePoolContainer = document.getElementById('prize-pool-container');
    if (prizePoolContainer && prizePoolManager) {
        prizePoolManager.renderWidget(prizePoolContainer);
    }
}

// Ensure widget updates after data is loaded
if (window.prizePoolManager) {
    document.addEventListener('prizePoolUpdated', () => {
        const prizePoolContainer = document.getElementById('prize-pool-container');
        if (prizePoolContainer && window.prizePoolManager) {
            window.prizePoolManager.renderWidget(prizePoolContainer);
        }
    });
}

// Initialize leaderboard display
initLeaderboardDisplay();

// Function to initialize and update the HTML leaderboard display
function initLeaderboardDisplay() {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) {
        console.warn('Leaderboard list element not found');
        return;
    }
    
    console.log('Initializing leaderboard display...');
    
    // Function to update the leaderboard display
    async function updateLeaderboardDisplay() {
        console.log('Updating leaderboard display...');
        
        const leaderboard = window.game.getLeaderboard();
        if (!leaderboard) {
            console.warn('Leaderboard not available');
            return;
        }
        
        try {
            // Refresh scores from backend
            await leaderboard.loadScores();
            const scores = leaderboard.getTopScores(10); // Show top 10 instead of 5
            
            console.log('Loaded scores:', scores.length);
            
            // Update each list item with actual scores and usernames
            const listItems = leaderboardList.querySelectorAll('li');
            listItems.forEach((item, index) => {
                const scoreSpan = item.querySelector('.score-value');
                const usernameSpan = item.querySelector('.score-username');

                if (scores[index]) {
                    scoreSpan.textContent = scores[index].score;
                    const username = scores[index].playerName || scores[index].username || 'Player';
                    usernameSpan.textContent = username;
                    console.log(`🎯 Updated item ${index + 1}: ${scores[index].score} by "${username}"`);
                    console.log(`🎯 Raw score data:`, scores[index]);

                    // Special debugging for third place
                    if (index === 2) {
                        console.log(`🔍 THIRD PLACE DEBUG:`);
                        console.log(`  - Username span element:`, usernameSpan);
                        console.log(`  - Username span text:`, usernameSpan.textContent);
                        console.log(`  - Username span style:`, window.getComputedStyle(usernameSpan));
                        console.log(`  - List item element:`, item);
                    }
                } else {
                    scoreSpan.textContent = '0';
                    usernameSpan.textContent = '-';
                }
            });
            
            console.log('Leaderboard display updated successfully');
        } catch (error) {
            console.error('Error updating leaderboard display:', error);
        }
    }
    
    // Update immediately
    updateLeaderboardDisplay();
    
    // Update every 30 seconds to keep it current (reduced from 60 seconds)
    setInterval(updateLeaderboardDisplay, 30000); // 30,000 ms = 30 seconds
    
    // Also update when a new score is added (listen for custom events)
    document.addEventListener('scoreAdded', (event) => {
        console.log('Score added event received:', event.detail);
        // Add a small delay to ensure the backend has processed the score
        setTimeout(updateLeaderboardDisplay, 1000);
    });
    
    // Listen for game over events
    document.addEventListener('gameOver', (event) => {
        console.log('Game over event received, updating leaderboard...');
        // Add a delay to ensure score submission is complete
        setTimeout(updateLeaderboardDisplay, 2000);
    });
    
    // Listen for any score submission events
    document.addEventListener('scoreSubmitted', (event) => {
        console.log('Score submitted event received, updating leaderboard...');
        setTimeout(updateLeaderboardDisplay, 1500);
    });
    
    console.log('Leaderboard display initialized with event listeners');
}

// Initialize attempts system after a short delay to ensure all scripts are loaded
setTimeout(() => {
    if (window.game && window.game.initAttemptsSystem) {
        const success = window.game.initAttemptsSystem();
        if (success) {
            console.log('✅ Attempts system initialized successfully');
        } else {
            console.log('❌ Failed to initialize attempts system');
        }
    }
}, 500);