class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.velocityY = 0;
        this.gravity = 0.04; // Increased from 0.03 to 0.04 for better balance
        this.jumpForce = -3.0; // Keep the higher jump force
        this.maxVelocityY = 3.5; // Increased from 3 to 3.5 for better falling speed
        
        this.color = '#222'; // Monotone black for Dino style
        this.isAlive = true;
        this.canJump = true; // Simple flag to prevent continuous jumping
    }
    
    update(deltaTime, inputManager, gravityActive = true) {
        if (!this.isAlive) return;
        
        // Only allow jump and gravity if gravityActive is true
        if (gravityActive) {
            // Check if any action is pressed
            const actionPressed = inputManager.isActionPressed();
            
            // Only jump if action is pressed AND we can jump
            if (actionPressed && this.canJump) {
                console.log('Player: JUMPING!');
                this.jump().catch(error => console.warn('Jump failed:', error));
                this.canJump = false; // Prevent further jumps until input is released
                
                // Record jump event for anti-cheat
                if (window.antiCheatManager) {
                    window.antiCheatManager.recordInputEvent('jump', {
                        playerY: this.y,
                        playerVelocityY: this.velocityY
                    });
                }
            }
            
            // Reset jump ability when no action is pressed
            if (!actionPressed) {
                if (!this.canJump) {
                    console.log('Input released, canJump reset to true');
                }
                this.canJump = true;
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
    
    async jump() {
        this.velocityY = this.jumpForce;
        // Play flap sound if sound manager is available
        if (window.game && window.game.getSoundManager) {
            try {
                await window.game.getSoundManager().playSound('flap');
            } catch (error) {
                console.warn('Failed to play flap sound:', error);
            }
        }
    }
    
    // Calculate maximum jump height based on physics
    getMaxJumpHeight() {
        // Using physics formula: h = v² / (2g)
        // where v is initial velocity (jumpForce) and g is gravity
        const initialVelocity = Math.abs(this.jumpForce); // Convert negative to positive
        const maxHeight = (initialVelocity * initialVelocity) / (2 * this.gravity);
        return maxHeight;
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
    
    checkBounds(canvasHeight, obstacles = []) {
        // Check bottom boundary - player dies when hitting bottom
        if (this.y + this.height / 2 > canvasHeight) {
            this.isAlive = false;
        }
        
        // Check top boundary - prevent going off screen
        if (this.y - this.height / 2 < 0) {
            this.y = this.height / 2;
            this.velocityY = 0;
        }
    }
    
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.velocityY = 0;
        this.isAlive = true;
        this.canJump = true; // Reset jump ability
    }
} 