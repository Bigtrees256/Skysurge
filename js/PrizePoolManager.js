class PrizePoolManager {
    constructor() {
        this.apiBase = 'http://localhost:3000/api/prize-pool';
        this.prizePoolInfo = null;
        this.updateInterval = null;
        this.isLoading = false;
        this.container = null;
        
        // Set up event listeners immediately
        this.setupEventListeners();
        
        this.init();
    }
    
    setupEventListeners() {
        // Listen for prize pool updates and re-render widget
        document.addEventListener('prizePoolUpdated', () => {
            console.log('📡 Prize pool updated event received');
            if (this.container) {
                this.renderWidget(this.container);
            }
        });
        
        // Listen for prize pool errors and re-render widget
        document.addEventListener('prizePoolError', () => {
            console.log('📡 Prize pool error event received');
            if (this.container) {
                this.renderWidget(this.container);
            }
        });
    }
    
    async init() {
        try {
            await this.loadPrizePoolInfo();
            
            // Update every 60 seconds
            this.updateInterval = setInterval(() => {
                this.loadPrizePoolInfo();
            }, 60000);
            
            console.log('✅ Prize pool manager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize prize pool manager:', error);
            
            // Retry initialization after 5 seconds
            setTimeout(() => {
                console.log('🔄 Retrying prize pool manager initialization...');
                this.init();
            }, 5000);
        }
    }
    
    async loadPrizePoolInfo() {
        try {
            this.isLoading = true;
            console.log('🔄 Loading prize pool info...');
            
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(`${this.apiBase}/info`, {
                cache: 'no-store', // Bypass browser cache
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('💰 Prize pool data received:', data);
            
            if (data.success && data.data) {
                this.prizePoolInfo = data.data;
                console.log('✅ Prize pool data loaded successfully:', this.prizePoolInfo);
                // Dispatch event for UI updates
                document.dispatchEvent(new CustomEvent('prizePoolUpdated', { 
                    detail: { prizePool: this.prizePoolInfo } 
                }));
                // Force widget update
                if (this.container) {
                    this.renderWidget(this.container);
                }
            } else {
                throw new Error(data.message || 'Invalid prize pool data');
            }
            
        } catch (error) {
            console.error('❌ Failed to load prize pool info:', error);
            
            // If it's a network error, show a retry option
            if (error.name === 'AbortError') {
                console.log('⏰ Prize pool request timed out');
            }
            
            // Clear any existing data on error
            this.prizePoolInfo = null;
            
            // Dispatch error event for UI updates
            document.dispatchEvent(new CustomEvent('prizePoolError', { 
                detail: { error: error.message } 
            }));
        } finally {
            this.isLoading = false;
            console.log('🔄 Prize pool loading state updated - isLoading:', this.isLoading, 'prizePoolInfo:', this.prizePoolInfo);
            // Force widget update after loading state is correct
            if (this.container) {
                this.renderWidget(this.container);
            }
        }
    }
    
    getPrizePoolInfo() {
        return this.prizePoolInfo;
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    async getAuthToken() {
        return await authManager.getIdToken();
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    // Render prize pool widget
    renderWidget(container) {
        if (!container) return;
        
        // Store container reference for updates
        this.container = container;
        
        console.log('🎨 Rendering prize pool widget - isLoading:', this.isLoading, 'prizePoolInfo:', this.prizePoolInfo);
        
        // Clear existing content
        container.innerHTML = '';
        
        const widget = document.createElement('div');
        widget.className = 'prize-pool-widget';
        widget.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            margin: 10px 0;
            text-align: center;
            position: relative;
            overflow: hidden;
        `;
        
        if (this.isLoading) {
            widget.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 60px;">
                    <div style="width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
            `;
        } else if (this.prizePoolInfo) {
            widget.innerHTML = `
                <div style="position: relative; z-index: 2;">
                    <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">🏆 Prize Pool</h3>
                    <div style="font-size: 28px; font-weight: bold; margin: 10px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        ${this.formatCurrency(this.prizePoolInfo.totalAmount)}
                    </div>
                </div>
                <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                <div style="position: absolute; bottom: -30px; left: -30px; width: 60px; height: 60px; background: rgba(255,255,255,0.05); border-radius: 50%;"></div>
            `;
        } else {
            // Check if there was an error
            const hasError = this.prizePoolInfo === null && !this.isLoading;
            
            if (hasError) {
                widget.innerHTML = `
                    <div style="color: rgba(255,255,255,0.8);">
                        <h3 style="margin: 0 0 10px 0; font-size: 18px;">🏆 Prize Pool</h3>
                        <div style="font-size: 14px; margin-bottom: 10px;">Unable to load</div>
                        <button onclick="window.prizePoolManager.loadPrizePoolInfo()" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Retry
                        </button>
                    </div>
                `;
            } else {
                widget.innerHTML = `
                    <div style="color: rgba(255,255,255,0.8);">
                        <h3 style="margin: 0 0 10px 0; font-size: 18px;">🏆 Prize Pool</h3>
                        <div style="font-size: 14px;">Loading prize pool...</div>
                    </div>
                `;
            }
        }
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        container.appendChild(widget);
    }
    
    // Render prize pool info in a modal or dedicated section
    renderDetailedView(container) {
        if (!container) return;
        
        const detailedView = document.createElement('div');
        detailedView.className = 'prize-pool-detailed';
        detailedView.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            margin: 20px 0;
        `;
        
        if (this.isLoading) {
            detailedView.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                    <p style="margin-top: 20px; color: #666;">Loading prize pool information...</p>
                </div>
            `;
        } else if (this.prizePoolInfo) {
            detailedView.innerHTML = `
                <div style="text-align: center;">
                    <h2 style="color: #333; margin-bottom: 20px;">🏆 Current Prize Pool</h2>
                    
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin: 20px 0;">
                        <div style="font-size: 36px; font-weight: bold; margin: 10px 0;">
                            ${this.formatCurrency(this.prizePoolInfo.totalAmount)}
                        </div>
                        <div style="font-size: 16px; opacity: 0.9;">
                            Total Prize Pool
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0;">
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #667eea;">${this.prizePoolInfo.contributionPercentage}%</div>
                            <div style="color: #666; font-size: 14px;">Contribution Rate</div>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: #28a745;">${this.prizePoolInfo.isActive ? 'Active' : 'Inactive'}</div>
                            <div style="color: #666; font-size: 14px;">Status</div>
                        </div>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #333; margin-bottom: 15px;">How it works</h3>
                        <ul style="text-align: left; color: #666; line-height: 1.6;">
                            <li>Every purchase contributes ${this.prizePoolInfo.contributionPercentage}% to the prize pool</li>
                            <li>The prize pool accumulates over time</li>
                            <li>Prizes are distributed to top players</li>
                            <li>Last updated: ${this.formatDate(this.prizePoolInfo.lastUpdated)}</li>
                        </ul>
                    </div>
                </div>
            `;
        } else {
            detailedView.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <h2 style="color: #333; margin-bottom: 20px;">🏆 Prize Pool</h2>
                    <p>Unable to load prize pool information at this time.</p>
                    <button onclick="window.prizePoolManager.loadPrizePoolInfo()" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 15px;">
                        Retry
                    </button>
                </div>
            `;
        }
        
        container.appendChild(detailedView);
    }
}

// Initialize globally
window.prizePoolManager = new PrizePoolManager(); 