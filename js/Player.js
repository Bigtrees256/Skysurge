class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.velocityY = 0;
        this.gravity = 0.08; // Much lower gravity for floatier movement
        this.jumpForce = -3; // Much smaller jump force for smaller jumps
        this.maxVelocityY = 6; // Reduced max velocity for even slower movement
        
        this.color = '#222'; // Monotone black for Dino style
        this.isAlive = true;
    }
    
    update(deltaTime, inputManager, gravityActive = true) {
        if (!this.isAlive) return;
        
        // Only allow jump and gravity if gravityActive is true
        if (gravityActive) {
            if (inputManager.isActionPressed()) {
                console.log('Player: Input detected, jumping...');
                this.jump();
            }
            this.velocityY += this.gravity;
            
            // Limit fall speed
            if (this.velocityY > this.maxVelocityY) {
                this.velocityY = this.maxVelocityY;
            }
        } else {
            this.velocityY = 0; // Prevent drop
        }
        
        // Update position
        this.y += this.velocityY;
    }
    
    jump() {
        this.velocityY = this.jumpForce;
        // Play flap sound if sound manager is available
        if (window.game && window.game.getSoundManager) {
            window.game.getSoundManager().playSound('flap');
        }
    }
    
    render(ctx) {
        ctx.save();
        
        // Draw player as a rectangle
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        // Add a simple border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        
        ctx.restore();
    }
    
    getBounds() {
        return {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y - this.height / 2,
            bottom: this.y + this.height / 2
        };
    }
    
    checkCollision(obstacle) {
        const playerBounds = this.getBounds();
        const obstacleBounds = obstacle.getBounds();
        
        return !(playerBounds.left > obstacleBounds.right ||
                playerBounds.right < obstacleBounds.left ||
                playerBounds.top > obstacleBounds.bottom ||
                playerBounds.bottom < obstacleBounds.top);
    }
    
    checkBounds(canvasHeight) {
        // Check if player is off screen (only bottom border causes death)
        if (this.y + this.height / 2 > canvasHeight) {
            this.isAlive = false;
        }
        
        // Player can now go through the top border freely
        // No restrictions on upward movement
    }
    
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.velocityY = 0;
        this.isAlive = true;
    }
} 