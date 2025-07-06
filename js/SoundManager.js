class SoundManager {
    constructor() {
        this.sounds = {};
        this.music = null;
        this.isMuted = false;
        this.volume = 0.7;
        
        this.init();
    }
    
    init() {
        // Create audio context for better sound control
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported, using fallback audio');
            this.audioContext = null;
        }
        
        this.createSounds();
    }
    
    createSounds() {
        // Create sound effects using Web Audio API
        this.sounds = {
            flap: this.createFlapSound(),
            score: this.createScoreSound(),
            gameOver: this.createGameOverSound(),
            start: this.createStartSound()
        };
    }
    
    createFlapSound() {
        if (!this.audioContext) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        return { oscillator, gainNode };
    }
    
    createScoreSound() {
        if (!this.audioContext) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2); // G5
        
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        return { oscillator, gainNode };
    }
    
    createGameOverSound() {
        if (!this.audioContext) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        return { oscillator, gainNode };
    }
    
    createStartSound() {
        if (!this.audioContext) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        return { oscillator, gainNode };
    }
    
    playSound(soundName) {
        if (this.isMuted || !this.sounds[soundName]) return;
        
        const sound = this.sounds[soundName];
        
        if (this.audioContext) {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Create new instances for overlapping sounds
            const newOscillator = this.audioContext.createOscillator();
            const newGainNode = this.audioContext.createGain();
            
            newOscillator.connect(newGainNode);
            newGainNode.connect(this.audioContext.destination);
            
            // Copy the original sound properties
            const time = this.audioContext.currentTime;
            
            if (soundName === 'flap') {
                newOscillator.frequency.setValueAtTime(800, time);
                newOscillator.frequency.exponentialRampToValueAtTime(400, time + 0.1);
                newGainNode.gain.setValueAtTime(0.3 * this.volume, time);
                newGainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
                newOscillator.start(time);
                newOscillator.stop(time + 0.1);
            } else if (soundName === 'score') {
                newOscillator.frequency.setValueAtTime(523, time);
                newOscillator.frequency.setValueAtTime(659, time + 0.1);
                newOscillator.frequency.setValueAtTime(784, time + 0.2);
                newGainNode.gain.setValueAtTime(0.2 * this.volume, time);
                newGainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
                newOscillator.start(time);
                newOscillator.stop(time + 0.3);
            } else if (soundName === 'gameOver') {
                newOscillator.frequency.setValueAtTime(200, time);
                newOscillator.frequency.exponentialRampToValueAtTime(100, time + 0.5);
                newGainNode.gain.setValueAtTime(0.4 * this.volume, time);
                newGainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
                newOscillator.start(time);
                newOscillator.stop(time + 0.5);
            } else if (soundName === 'start') {
                newOscillator.frequency.setValueAtTime(400, time);
                newOscillator.frequency.setValueAtTime(600, time + 0.1);
                newOscillator.frequency.setValueAtTime(800, time + 0.2);
                newGainNode.gain.setValueAtTime(0.3 * this.volume, time);
                newGainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
                newOscillator.start(time);
                newOscillator.stop(time + 0.3);
            }
        }
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
    
    isMuted() {
        return this.isMuted;
    }
} 