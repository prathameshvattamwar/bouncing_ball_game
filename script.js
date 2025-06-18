class Game {
    constructor() {
        this.elements = {
            board: document.getElementById('board'),
            bird: document.getElementById('bird'),
            scoreVal: document.getElementById('score-val'),
            highScoreVal: document.getElementById('high-score-val'),
            gameOverScreen: document.getElementById('game-over-screen'),
            finalScore: document.getElementById('final-score'),
            finalHighScore: document.getElementById('final-high-score'),
            playPauseButton: document.getElementById('play-pause-button'),
            messageOverlay: document.getElementById('message-overlay'),
            restartButton: document.getElementById('restart-button'),
            achievementPopup: document.getElementById('achievement-popup'),
        };
        
        this.achievements = { 5: "Getting Started!", 15: "Nice Bouncing!", 30: "Pro Bouncer!", 50: "Unstoppable!" };
        this.awardedAchievements = new Set();
        
        this.state = 'ready';
        this.score = 0;
        this.highScore = localStorage.getItem("flappyHighScore") || 0;
        
        this.handleResize();
        this.bird = new Bird(this.elements.bird, this.gameDimensions);
        this.pipeManager = new PipeManager(this.elements.board, this.gameDimensions);
        
        this.init();
    }

    init() {
        this.elements.highScoreVal.innerText = this.highScore;
        this.elements.playPauseButton.disabled = true;

        document.addEventListener('keydown', e => this.handleInput(e));
        document.addEventListener('mousedown', e => this.handleInput(e));
        document.addEventListener('touchstart', e => this.handleInput(e));
        this.elements.restartButton.addEventListener('click', () => this.restart());
        this.elements.playPauseButton.addEventListener('click', () => this.togglePause());
        window.addEventListener('resize', () => this.handleResize());

        this.gameLoop();
    }
    
    handleInput(e) {
        if (e.target.tagName === 'BUTTON') return;
        if (this.state === 'ready') {
            this.start();
        }
        if (this.state === 'playing' && (e.code === 'Space' || e.type.includes('touch') || e.type.includes('mouse'))) {
            this.bird.flap();
        }
    }
    
    start() {
        this.state = 'playing';
        this.elements.messageOverlay.classList.remove('active');
        this.elements.playPauseButton.disabled = false;
        this.elements.playPauseButton.innerText = "PAUSE";
    }

    gameLoop() {
        if (this.state === 'playing') {
            this.update();
        }
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.bird.update();
        this.pipeManager.update(this.score);

        if (this.pipeManager.checkCollision(this.bird) || this.bird.isOutOfBounds()) {
            this.endGame();
        }

        const scored = this.pipeManager.checkScore(this.bird);
        if (scored) {
            this.score++;
            this.checkAchievements();
        }
    }

    render() {
        this.bird.render();
        this.pipeManager.render();
        this.elements.scoreVal.innerText = this.score;
    }

    endGame() {
        if (this.state === 'over') return;
        this.state = 'over';
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem("flappyHighScore", this.highScore);
        }

        this.elements.finalScore.innerText = this.score;
        this.elements.finalHighScore.innerText = this.highScore;
        this.elements.highScoreVal.innerText = this.highScore;
        this.elements.gameOverScreen.classList.add('active');
        this.elements.playPauseButton.disabled = true;
    }

    restart() {
        this.state = 'ready';
        this.score = 0;
        this.awardedAchievements.clear();
        this.bird.reset();
        this.pipeManager.reset();
        this.elements.gameOverScreen.classList.remove('active');
        this.elements.messageOverlay.classList.add('active');
    }
    
    togglePause() {
        if (this.state === 'over') return;
        this.state = this.state === 'paused' ? 'playing' : 'paused';
        this.elements.playPauseButton.innerText = this.state === 'paused' ? "PLAY" : "PAUSE";
    }

    checkAchievements() {
        const achievementText = this.achievements[this.score];
        if (achievementText && !this.awardedAchievements.has(this.score)) {
            this.elements.achievementPopup.innerText = achievementText;
            this.elements.achievementPopup.classList.add("show");
            this.awardedAchievements.add(this.score);
            setTimeout(() => {
                this.elements.achievementPopup.classList.remove("show");
            }, 2500);
        }
    }

    handleResize() {
        const boardRect = this.elements.board.getBoundingClientRect();
        this.gameDimensions = {
            width: boardRect.width,
            height: boardRect.height
        };
        if (this.bird) this.bird.updateDimensions(this.gameDimensions);
        if (this.pipeManager) this.pipeManager.updateDimensions(this.gameDimensions);
    }
}

class Bird {
    constructor(element, gameDimensions) {
        this.element = element;
        this.updateDimensions(gameDimensions);
        this.gravity = 0.25;
        this.lift = -5.0;
        this.reset();
    }

    reset() {
        this.y = this.gameHeight / 2;
        this.x = this.gameWidth / 5;
        this.velocity = 0;
    }

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;
    }
    
    render() {
        this.element.style.top = `${this.y}px`;
        this.element.style.left = `${this.x}px`;
        const rotation = Math.max(-45, Math.min(this.velocity * 7, 25));
        this.element.style.transform = `rotate(${rotation}deg)`;
    }

    flap() {
        this.velocity = this.lift;
    }
    
    isOutOfBounds() {
        return this.y < -this.height || this.y > this.gameHeight - this.height;
    }

    updateDimensions(gameDimensions) {
        this.gameWidth = gameDimensions.width;
        this.gameHeight = gameDimensions.height;
        this.width = this.element.clientWidth;
        this.height = this.element.clientHeight;
    }

    getRect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}

class PipeManager {
    constructor(boardElement, gameDimensions) {
        this.board = boardElement;
        this.updateDimensions(gameDimensions);
        this.spawnInterval = 120;
        this.spawnTimer = 0;
        this.pipes = [];
        this.reset();
    }

    reset() {
        this.pipes.forEach(pipe => pipe.remove());
        this.pipes = [];
        this.spawnTimer = this.spawnInterval;
        this.speed = 2;
    }

    update(score) {
        this.spawnTimer++;
        if (this.spawnTimer > this.spawnInterval) {
            this.spawnPipe();
            this.spawnTimer = 0;
        }

        this.speed = 2 + Math.floor(score / 5) * 0.15;

        this.pipes.forEach(pipe => pipe.update(this.speed));
        this.pipes = this.pipes.filter(pipe => {
            if (pipe.isOffScreen()) {
                pipe.remove();
                return false;
            }
            return true;
        });
    }

    render() {
        this.pipes.forEach(pipe => pipe.render());
    }

    spawnPipe() {
        const newPipe = new Pipe(this.board, this.gameDimensions);
        this.pipes.push(newPipe);
    }
    
    checkCollision(bird) {
        const birdRect = bird.getRect();
        for (const pipe of this.pipes) {
            if (pipe.collidesWith(birdRect)) {
                return true;
            }
        }
        return false;
    }

    checkScore(bird) {
        for (const pipe of this.pipes) {
            if (!pipe.passed && bird.x > pipe.x + pipe.width) {
                pipe.passed = true;
                return true;
            }
        }
        return false;
    }

    updateDimensions(gameDimensions) {
        this.gameDimensions = gameDimensions;
    }
}

class Pipe {
    constructor(boardElement, gameDimensions) {
        this.board = boardElement;
        this.gameHeight = gameDimensions.height;
        this.gameWidth = gameDimensions.width;
        this.gap = gameDimensions.height / 4.0;
        
        const tempPipe = document.createElement('div');
        tempPipe.classList.add('pipe');
        this.width = tempPipe.getBoundingClientRect().width || 80;
        
        this.x = this.gameWidth;
        this.passed = false;
        
        const gapY = this.gap + Math.random() * (this.gameHeight - this.gap * 2.5);

        this.topPipe = this.createPipeElement(true, gapY);
        this.bottomPipe = this.createPipeElement(false, gapY);
        
        this.board.appendChild(this.topPipe.element);
        this.board.appendChild(this.bottomPipe.element);
    }
    
    createPipeElement(isTop, gapY) {
        const element = document.createElement('div');
        element.classList.add('pipe');
        element.classList.add(isTop ? 'pipe-top' : 'pipe-bottom');
        let height, y;
        if (isTop) {
            height = gapY - this.gap / 2;
            y = 0;
        } else {
            y = gapY + this.gap / 2;
            height = this.gameHeight - y;
        }
        element.style.height = `${height}px`;
        element.style.top = `${y}px`;
        return { element, y, height };
    }
    
    update(speed) { this.x -= speed; }
    render() {
        this.topPipe.element.style.left = `${this.x}px`;
        this.bottomPipe.element.style.left = `${this.x}px`;
    }

    isOffScreen() { return this.x < -this.width; }
    remove() {
        this.topPipe.element.remove();
        this.bottomPipe.element.remove();
    }
    
    collidesWith(birdRect) {
        const checkCollision = (pipeRect) => {
            return birdRect.x < pipeRect.x + pipeRect.width &&
                   birdRect.x + birdRect.width > pipeRect.x &&
                   birdRect.y < pipeRect.y + pipeRect.height &&
                   birdRect.y + birdRect.height > pipeRect.y;
        }
        
        const topPipeRect = {x: this.x, y: 0, width: this.width, height: this.topPipe.height};
        const bottomPipeRect = {x: this.x, y: this.bottomPipe.y, width: this.width, height: this.bottomPipe.height};
        
        return checkCollision(topPipeRect) || checkCollision(bottomPipeRect);
    }
}

window.onload = () => {
    new Game();
};