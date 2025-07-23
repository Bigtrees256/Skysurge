class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.uiOverlay = document.getElementById('uiOverlay');
        
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.currentScene = null;
        this.scenes = {};
        this.isRunning = false;
        this.lastTime = 0;
        
        this.inputManager = new InputManager(this.canvas);
        this.soundManager = new SoundManager();
        this.leaderboard = new Leaderboard();
        
        // Initialize attempts system (will be done after all scripts load)
        this.attemptsManager = null;
        this.attemptsUI = null;
        
        this.init();
    }
    
    init() {
        // Initialize scenes
        this.scenes = {
            start: new StartScene(this),
            game: new GameScene(this),
            gameOver: new GameOverScene(this)
        };
        
        // Start with the start scene
        this.switchScene('start');
        
        // Start the game loop
        this.start();
    }
    
    start() {
        this.isRunning = true;
        this.gameLoop();
    }
    
    stop() {
        this.isRunning = false;
    }
    
    gameLoop(currentTime = 0) {
        if (!this.isRunning) return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Update current scene
        if (this.currentScene) {
            this.currentScene.update(deltaTime);
            this.currentScene.render();
        } else {
            console.error('Game: No current scene in game loop!');
        }
        
        // Update input manager to clear just-pressed states
        this.inputManager.update();
        
        // Continue the loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    switchScene(sceneName) {
        console.log('Game: Switching to scene:', sceneName);
        console.log('Game: Current scene before switch:', this.currentScene ? this.currentScene.constructor.name : 'null');
        
        if (this.currentScene) {
            console.log('Game: Exiting current scene');
            this.currentScene.exit();
        }
        
        this.currentScene = this.scenes[sceneName];
        console.log('Game: New scene:', this.currentScene ? this.currentScene.constructor.name : 'null');
        
        if (this.currentScene) {
            console.log('Game: Entering new scene');
            this.currentScene.enter();
        } else {
            console.error('Game: Failed to switch to scene:', sceneName);
        }
    }
    
    getInputManager() {
        return this.inputManager;
    }
    
    getCanvas() {
        return this.canvas;
    }
    
    getContext() {
        return this.ctx;
    }
    
    getUIOverlay() {
        return this.uiOverlay;
    }
    
    getWidth() {
        return this.width;
    }
    
    getHeight() {
        return this.height;
    }
    
    getSoundManager() {
        return this.soundManager;
    }
    
    getLeaderboard() {
        return this.leaderboard;
    }
    
    getAttemptsManager() {
        return this.attemptsManager;
    }
    
    getAttemptsUI() {
        return this.attemptsUI;
    }
    
    // Initialize attempts system after all scripts are loaded
    initAttemptsSystem() {
        console.log('Initializing attempts system...');
        
        if (typeof AttemptsManager !== 'undefined' && typeof AttemptsUI !== 'undefined') {
            this.attemptsManager = new AttemptsManager();
            this.attemptsUI = new AttemptsUI(this.attemptsManager, this);
            console.log('Attempts system initialized successfully!');
            return true;
        }
        console.error('Failed to initialize attempts system - classes not found');
        return false;
    }
} 