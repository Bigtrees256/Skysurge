// Main entry point for the game
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('DOM loaded, initializing game...');
        
        // Initialize the game
        const game = new Game();
        console.log('Game instance created:', game);
        
        // Make game globally accessible for debugging
        window.game = game;
        
        // Initialize attempts system after a short delay to ensure all scripts are loaded
        setTimeout(async () => {
            try {
                if (game.initAttemptsSystem()) {
                    // Check for referral on startup
                    const attemptsManager = game.getAttemptsManager();
                    if (attemptsManager) {
                        // Wait for attempts to load from backend
                        await attemptsManager.init();
                        
                        if (attemptsManager.checkReferral()) {
                            console.log('User came from referral!');
                        }
                        console.log('Attempts system enabled!');
                    }
                } else {
                    console.error('Failed to initialize attempts system - classes not found');
                }
                
                // Initialize leaderboard display
                initLeaderboardDisplay();
                
            } catch (error) {
                console.error('Error initializing attempts system:', error);
            }
        }, 100);
        
        console.log('SkySurge game initialized!');
        console.log('Controls: SPACE, ARROW UP, or CLICK to flap');
        console.log('Press L to toggle leaderboard during gameplay');
        console.log('Sound effects and leaderboard system enabled!');
        
    } catch (error) {
        console.error('Error initializing game:', error);
        alert('Error initializing game: ' + error.message);
    }
});

// Function to initialize and update the HTML leaderboard display
function initLeaderboardDisplay() {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;
    
    // Function to update the leaderboard display
    function updateLeaderboardDisplay() {
        const leaderboard = window.game.getLeaderboard();
        if (!leaderboard) return;
        
        const scores = leaderboard.getScores();
        const listItems = leaderboardList.querySelectorAll('li');
        
        // Update each list item with actual scores
        listItems.forEach((item, index) => {
            const rankSpan = item.querySelector('.score-rank');
            const scoreSpan = item.querySelector('.score-value');
            
            if (scores[index]) {
                scoreSpan.textContent = scores[index];
            } else {
                scoreSpan.textContent = '0';
            }
        });
    }
    
    // Update immediately
    updateLeaderboardDisplay();
    
    // Update every 5 seconds to keep it current
    setInterval(updateLeaderboardDisplay, 5000);
    
    // Also update when a new score is added (listen for custom events)
    document.addEventListener('scoreAdded', updateLeaderboardDisplay);
} 