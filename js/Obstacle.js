class Obstacle {
    constructor(x, y, width, height, isTop = false) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isTop = isTop;
        this.speed = 0; // Start with zero speed - obstacles don't move until game starts
        this.color = '#222'; // Monotone black for Dino style
        this.passed = false;
    }
    
    update(deltaTime) {
        // Move obstacle to the left only if speed > 0
        if (this.speed > 0) {
            this.x -= this.speed;
        }
    }
    
    render(ctx) {
        ctx.save();
        
        // Draw obstacle as a rectangle
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add a border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        ctx.restore();
    }
    
    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }
    
    isOffScreen() {
        return this.x + this.width < 0;
    }
    
    setSpeed(speed) {
        this.speed = speed;
    }
}

class ObstaclePair {
    constructor(x, canvasWidth, canvasHeight, gapSize = 150) {
        this.x = x;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Validate and adjust gap size to ensure it's reasonable
        this.gapSize = this.validateGapSize(gapSize, canvasHeight);
        
        // More randomized width (60-120 pixels)
        this.width = 80 + (Math.random() - 0.5) * 60;
        this.width = Math.max(60, Math.min(120, this.width));
        
        // Enhanced randomization for gap positioning
        // Calculate the safe zone for gap placement
        const playerHeight = 30; // Player height
        const minGapFromTop = 60; // Reduced minimum distance from top for more variation
        const minGapFromBottom = 80; // Reduced minimum distance from bottom for more variation
        const maxGapFromTop = canvasHeight - this.gapSize - minGapFromBottom;
        
        // Ensure the gap is always in a reasonable range
        const safeMinGapY = Math.max(minGapFromTop, 60);
        const safeMaxGapY = Math.min(maxGapFromTop, canvasHeight - this.gapSize - minGapFromBottom);
        
        // Generate gap position with multiple randomization layers
        let gapY;
        if (safeMaxGapY > safeMinGapY) {
            // Use multiple random factors for more variation
            const baseRandom = Math.random();
            const secondaryRandom = Math.random();
            const tertiaryRandom = Math.random();
            
            // Combine different random factors for more unpredictable placement
            const combinedRandom = (baseRandom * 0.5 + secondaryRandom * 0.3 + tertiaryRandom * 0.2);
            
            gapY = safeMinGapY + combinedRandom * (safeMaxGapY - safeMinGapY);
        } else {
            // Fallback if safe range is too small
            gapY = canvasHeight / 2 - this.gapSize / 2;
        }
        
        // Add significant controlled randomness for more variation
        const maxVariation = 50; // Increased variation range
        const extraRandomness = (Math.random() - 0.5) * maxVariation;
        
        // Apply the randomness but ensure it stays within bounds
        let finalGapY = gapY + extraRandomness;
        
        // Clamp to safe bounds
        finalGapY = Math.max(safeMinGapY, Math.min(safeMaxGapY, finalGapY));
        
        // Add occasional extreme positions (but still within safe bounds)
        if (Math.random() < 0.15) { // 15% chance for more extreme positioning
            const extremeVariation = (Math.random() - 0.5) * 30;
            finalGapY = Math.max(safeMinGapY, Math.min(safeMaxGapY, finalGapY + extremeVariation));
        }
        
        // Create top and bottom obstacles
        this.top = new Obstacle(x, 0, this.width, finalGapY, true);
        this.bottom = new Obstacle(x, finalGapY + this.gapSize, this.width, canvasHeight - (finalGapY + this.gapSize), false);
        
        this.passed = false;
        this.speed = 0; // Start with zero speed - obstacles don't move until game starts
        
        // Log gap positioning for debugging
        console.log(`Obstacle gap - Y: ${finalGapY.toFixed(1)}, Gap: ${this.gapSize.toFixed(1)}, Safe range: ${safeMinGapY.toFixed(1)}-${safeMaxGapY.toFixed(1)}, Variation: ${extraRandomness.toFixed(1)}`);
    }
    
    // Validate gap size to ensure it's not too narrow or too wide
    validateGapSize(requestedGapSize, canvasHeight) {
        // Ensure gap is not too small or too large
        const minGap = 110; // Slightly reduced minimum gap size for more challenge
        const maxGap = Math.min(200, canvasHeight * 0.6); // Maximum gap size (60% of canvas height)
        
        return Math.max(minGap, Math.min(maxGap, requestedGapSize));
    }
    
    update(deltaTime) {
        this.top.update(deltaTime);
        this.bottom.update(deltaTime);
        this.x = this.top.x; // Keep x in sync
    }
    
    render(ctx) {
        this.top.render(ctx);
        this.bottom.render(ctx);
    }
    
    checkCollision(player) {
        return player.checkCollision(this.top) || player.checkCollision(this.bottom);
    }
    
    isOffScreen() {
        return this.top.isOffScreen();
    }
    
    isPassed(playerX) {
        if (!this.passed && playerX > this.x + this.width) {
            this.passed = true;
            return true;
        }
        return false;
    }
    
    setSpeed(speed) {
        this.speed = speed;
        this.top.setSpeed(speed);
        this.bottom.setSpeed(speed);
    }
    
    getGapCenter() {
        return this.top.y + this.top.height + this.gapSize / 2;
    }
} 