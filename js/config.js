// Configuration management for SkySurge
class Config {
    constructor() {
        this.apiBaseUrl = this.getApiBaseUrl();
        this.firebaseConfig = this.getFirebaseConfig();
    }

    getApiBaseUrl() {
        // Determine API base URL based on environment
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

        let apiUrl;
        if (isLocal) {
            apiUrl = 'http://localhost:3000';
        } else {
            // Production: Use same origin since backend serves frontend
            apiUrl = window.location.origin;
        }

        console.log('🔧 Config: API Base URL determined:', apiUrl);
        console.log('🔧 Config: Current hostname:', hostname);
        console.log('🔧 Config: Is local environment:', isLocal);

        return apiUrl;
    }

    getFirebaseConfig() {
        // Firebase configuration - these are public keys and safe to expose
        return {
            apiKey: "AIzaSyDI2xMR2-ISaIp5SPAHWSoenqDY3M-B8iE",
            authDomain: "skysurge-67edc.firebaseapp.com",
            projectId: "skysurge-67edc",
            storageBucket: "skysurge-67edc.firebasestorage.app",
            messagingSenderId: "40942548025",
            appId: "1:40942548025:web:2093ed85e51a6eb89289e8",
            measurementId: "G-PZ1SZN6RW4"
        };
    }

    // Get Stripe publishable key from backend
    async getStripePublishableKey() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/config/stripe-key`);
            const data = await response.json();
            return data.publishableKey;
        } catch (error) {
            console.error('Failed to fetch Stripe key:', error);
            return null;
        }
    }
}

// Export singleton instance
window.AppConfig = new Config();
