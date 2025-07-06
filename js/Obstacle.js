class Obstacle {
    constructor(x, y, width, height, isTop = false) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isTop = isTop;
        this.speed = 1; // Reduced from 2 to 1 for slower movement
        this.color = '#222'; // Monotone black for Dino style
        this.passed = false;
    }
    
    update(deltaTime) {
        // Move obstacle to the left
        this.x -= this.speed;
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
        
        // More randomized gap size (120-200 pixels)
        this.gapSize = gapSize + (Math.random() - 0.5) * 80;
        this.gapSize = Math.max(120, Math.min(200, this.gapSize));
        
        // More randomized width (60-120 pixels)
        this.width = 80 + (Math.random() - 0.5) * 60;
        this.width = Math.max(60, Math.min(120, this.width));
        
        // More randomized gap position with wider range
        const minGapY = 80; // Minimum distance from top
        const maxGapY = canvasHeight - this.gapSize - 80; // Maximum distance from bottom
        const gapY = Math.random() * (maxGapY - minGapY) + minGapY;
        
        // Create top and bottom obstacles
        this.top = new Obstacle(x, 0, this.width, gapY, true);
        this.bottom = new Obstacle(x, gapY + this.gapSize, this.width, canvasHeight - (gapY + this.gapSize), false);
        
        this.passed = false;
        this.speed = 2;
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