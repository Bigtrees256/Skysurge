class Scene {
    constructor(game) {
        this.game = game;
        this.ctx = game.getContext();
        this.width = game.getWidth();
        this.height = game.getHeight();
        this.uiOverlay = game.getUIOverlay();
        this.inputManager = game.getInputManager();
    }
    
    enter() {
        // Called when scene becomes active
        this.setupUI();
    }
    
    exit() {
        // Called when scene is deactivated
        this.clearUI();
    }
    
    update(deltaTime) {
        // Override in subclasses
    }
    
    render() {
        // Override in subclasses
    }
    
    setupUI() {
        // Override in subclasses to set up UI elements
    }
    
    clearUI() {
        // Clear all UI elements
        console.log('Clearing UI elements from overlay:', this.uiOverlay);
        console.log('Elements before clearing:', this.uiOverlay.children.length);
        this.uiOverlay.innerHTML = '';
        console.log('Elements after clearing:', this.uiOverlay.children.length);
        
        // Hide attempts UI if it exists
        if (this.game && this.game.getAttemptsUI()) {
            this.game.getAttemptsUI().hide();
        }
    }
    
    switchScene(sceneName) {
        this.game.switchScene(sceneName);
    }
} 