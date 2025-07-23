class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            pressed: false
        };
        this.touch = {
            pressed: false
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            // Prevent default behavior for game keys
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
            }
            this.keys[e.code] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent default to avoid text selection
            this.mouse.pressed = true;
            this.updateMousePosition(e);
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            this.mouse.pressed = false;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            this.updateMousePosition(e);
        });
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touch.pressed = true;
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touch.pressed = false;
        });
        
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    updateMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
    }
    
    isKeyPressed(keyCode) {
        return this.keys[keyCode] || false;
    }
    
    isMousePressed() {
        return this.mouse.pressed;
    }
    
    isTouchPressed() {
        return this.touch.pressed;
    }
    
    isActionPressed() {
        // Check for any input that should trigger player action
        return this.isKeyPressed('Space') || 
               this.isKeyPressed('ArrowUp') || 
               this.isMousePressed() || 
               this.isTouchPressed();
    }
    
    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }
    
    // Reset all input states
    resetInputs() {
        this.keys = {};
        this.mouse.pressed = false;
        this.touch.pressed = false;
    }
    
    // Call this at the end of each frame
    update() {
        // No special processing needed - Player class handles jump logic
    }
} 