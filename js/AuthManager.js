class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.authStateListeners = [];
        this.tokenRefreshInterval = null;

        // Initialize Firebase auth state listener
        this.initAuthStateListener();
    }
    
    // Initialize Firebase auth state listener
    initAuthStateListener() {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                // User is signed in
                this.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                };
                console.log('✅ User authenticated:', user.email);

                // Automatically get and store token for API calls
                try {
                    const token = await user.getIdToken();
                    localStorage.setItem('authToken', token);
                    console.log('✅ Auth token stored successfully');

                    // Start periodic token refresh (every 30 minutes)
                    this.startTokenRefresh();

                    // Notify AttemptsManager to reload attempts after login
                    this.notifyAttemptsManagerOnLogin();
                } catch (error) {
                    console.error('❌ Failed to get/store auth token:', error);
                }
            } else {
                // User is signed out
                this.currentUser = null;
                this.clearStoredTokens();
                this.stopTokenRefresh();
                console.log('❌ User signed out, tokens cleared');
            }

            this.isInitialized = true;

            // Update admin button visibility
            this.updateAdminButtonVisibility();

            // Notify all listeners
            this.authStateListeners.forEach(listener => {
                listener(this.currentUser);
            });
        });
    }
    
    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }
    
    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Check if current user is admin
    isAdmin() {
        if (!this.currentUser || !this.currentUser.email) {
            return false;
        }
        // Admin email is hardcoded to match backend logic
        return this.currentUser.email === 'huangjustin256@gmail.com';
    }

    // Update admin button visibility based on current user
    updateAdminButtonVisibility() {
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            if (this.isAdmin()) {
                adminBtn.style.display = 'inline-block';
                console.log('✅ Admin button shown for admin user');
            } else {
                adminBtn.style.display = 'none';
                console.log('🔒 Admin button hidden for non-admin user');
            }
        }
    }
    
    // Wait for authentication to be ready
    async waitForAuth() {
        if (this.isInitialized) {
            return this.currentUser;
        }
        
        return new Promise((resolve) => {
            this.authStateListeners.push((user) => {
                resolve(user);
            });
        });
    }
    
    // Add auth state listener
    onAuthStateChanged(listener) {
        this.authStateListeners.push(listener);
        // Call immediately if already initialized
        if (this.isInitialized) {
            listener(this.currentUser);
        }
    }
    
    // Sign out
    async signOut() {
        try {
            this.clearStoredTokens();
            await firebase.auth().signOut();
            console.log('✅ User signed out');
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }
    
    // Get Firebase ID token for API calls
    async getIdToken(forceRefresh = false) {
        if (!this.currentUser) {
            throw new Error('No user authenticated');
        }

        try {
            // Force refresh if requested, or if token is close to expiring
            const token = await firebase.auth().currentUser.getIdToken(forceRefresh);

            // Store token in localStorage for compatibility with existing code
            localStorage.setItem('authToken', token);

            return token;
        } catch (error) {
            console.error('Failed to get ID token:', error);
            // If token refresh fails, try to re-authenticate
            if (error.code === 'auth/user-token-expired') {
                console.log('Token expired, attempting to refresh...');
                try {
                    const refreshedToken = await firebase.auth().currentUser.getIdToken(true);
                    localStorage.setItem('authToken', refreshedToken);
                    return refreshedToken;
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                    throw refreshError;
                }
            }
            throw error;
        }
    }

    // Get stored auth token (for compatibility with existing code)
    getStoredToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    // Clear stored tokens
    clearStoredTokens() {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
    }

    // Start periodic token refresh
    startTokenRefresh() {
        // Clear any existing interval
        this.stopTokenRefresh();

        // Refresh token every 30 minutes (tokens expire after 1 hour)
        this.tokenRefreshInterval = setInterval(async () => {
            try {
                if (this.currentUser && firebase.auth().currentUser) {
                    console.log('🔄 Refreshing auth token...');
                    const token = await firebase.auth().currentUser.getIdToken(true);
                    localStorage.setItem('authToken', token);
                    console.log('✅ Auth token refreshed successfully');
                }
            } catch (error) {
                console.error('❌ Failed to refresh auth token:', error);
            }
        }, 30 * 60 * 1000); // 30 minutes
    }

    // Stop token refresh
    stopTokenRefresh() {
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
            this.tokenRefreshInterval = null;
        }
    }
    
    // Handle redirect result (for Google sign-in)
    async handleRedirectResult() {
        try {
            const result = await firebase.auth().getRedirectResult();
            if (result.user) {
                console.log('✅ Redirect sign-in successful:', result.user.email);
                return true;
            }
            return false;
        } catch (error) {
            if (error.code !== 'auth/no-redirect-result') {
                console.error('Redirect result error:', error);
            }
            return false;
        }
    }

    // Notify AttemptsManager to reload attempts after successful login
    async notifyAttemptsManagerOnLogin() {
        // Wait a bit for the token to be fully ready
        setTimeout(async () => {
            if (window.game && window.game.attemptsManager) {
                console.log('🔄 AuthManager: Notifying AttemptsManager to reload attempts after login');
                try {
                    await window.game.attemptsManager.loadAttempts();
                    console.log('✅ AuthManager: AttemptsManager reloaded attempts successfully');
                } catch (error) {
                    console.error('❌ AuthManager: Failed to reload attempts:', error);
                }
            } else {
                console.log('⚠️ AuthManager: AttemptsManager not available yet for reload');
            }
        }, 1000); // 1 second delay to ensure everything is ready
    }
}

// Create global instance
window.authManager = new AuthManager(); 