// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing game dependencies...');
    // Check if browser supports WebGL
    if (!THREE.WebGLRenderer) {
        showError('Your browser does not support WebGL, which is required to run this game.');
        return;
    }

    // Ensure THREE is properly loaded first
    if (typeof THREE === 'undefined') {
        showError('THREE.js library not loaded. Please check your internet connection.');
        return;
    }

    // First ensure all required libraries are loaded
    Promise.all([
        loadLibrary('GSAP', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.9.1/gsap.min.js'),
        loadLibrary('OrbitControls', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'),
        loadLibrary('OBJLoader', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js'),
        loadLibrary('GLTFLoader', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js')
    ])
    .then(() => {
        console.log('All dependencies loaded, setting up game selection...');
        setupGameSelection();
    })
    .catch(error => {
        console.error('Error loading dependencies:', error);
        showError('Failed to load game dependencies: ' + error);
    });
});

// Helper function to load external libraries
function loadLibrary(name, url) {
    return new Promise((resolve, reject) => {
        // Check if already loaded
        if (name === 'GSAP' && typeof gsap !== 'undefined') {
            console.log(`${name} already loaded`);
            resolve();
            return;
        }
        
        if (name === 'OrbitControls' && typeof THREE.OrbitControls === 'function') {
            console.log(`${name} already loaded`);
            resolve();
            return;
        }
        
        if (name === 'OBJLoader' && typeof THREE.OBJLoader === 'function') {
            console.log(`${name} already loaded`);
            resolve();
            return;
        }
        
        if (name === 'GLTFLoader' && typeof THREE.GLTFLoader === 'function') {
            console.log(`${name} already loaded`);
            resolve();
            return;
        }
        
        console.log(`Loading ${name} from ${url}`);
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
            console.log(`${name} loaded successfully`);
            resolve();
        };
        script.onerror = () => {
            const error = `Failed to load ${name}`;
            console.error(error);
            reject(error);
        };
        document.head.appendChild(script);
    });
}

// Setup game selection screen
function setupGameSelection() {
    const playFriendButton = document.getElementById('play-friend');
    const playComputerButton = document.getElementById('play-computer');
    const gameSelection = document.getElementById('game-selection');
    const gameContainer = document.getElementById('game-container');
    
    // Play with friend button handler
    playFriendButton.addEventListener('click', () => {
        console.log('Starting game with friend...');
        gameSelection.style.display = 'none';
        gameContainer.style.display = 'flex';
        initGame('friend');
    });
    
    // Play with computer button handler
    playComputerButton.addEventListener('click', () => {
        console.log('Starting game with computer...');
        gameSelection.style.display = 'none';
        gameContainer.style.display = 'flex';
        initGame('computer');
    });
}

// Initialize the game with selected mode
function initGame(gameMode) {
    try {
        console.log(`Creating game instance with mode: ${gameMode}`);
        
        // If there's an existing game instance, clean it up properly
        if (window.chessGame) {
            console.log('Cleaning up previous game instance...');
            window.chessGame.cleanupResources();
            window.chessGame = null;
        }
        
        // Clear the chess board container to prevent canvas stacking
        const chessBoard = document.getElementById('chess-board');
        if (chessBoard) {
            chessBoard.innerHTML = '';
        }
        
        // Reset status displays to prepare for new game
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = "White's turn";
            statusElement.style.color = '';
        }
        
        // Clear captured pieces display
        const whiteCaptured = document.getElementById('white-captured');
        const blackCaptured = document.getElementById('black-captured');
        if (whiteCaptured) whiteCaptured.innerHTML = '';
        if (blackCaptured) blackCaptured.innerHTML = '';
        
        // Handle undo button visibility based on game mode
        const undoButton = document.getElementById('undo-button');
        if (undoButton) {
            if (gameMode === 'computer') {
                // Hide undo button when playing against computer
                undoButton.style.display = 'none';
                console.log('Hiding undo button for computer mode');
            } else {
                // Show undo button when playing with friend
                undoButton.style.display = 'inline-block';
                console.log('Showing undo button for friend mode');
            }
        }
        
        // Create the game instance with the selected game mode
        // Using a slight delay to ensure DOM and previous cleanup is complete
        setTimeout(() => {
            // Force complete garbage collection if possible
            if (window.gc) window.gc();
            
            // Create a fresh game instance with the current mode
            window.chessGame = new Game(gameMode);
            console.log('3D Chess Game initialized successfully with mode:', gameMode);
            
            // The game constructor will handle updating the game mode display
        }, 100);
    } catch (error) {
        console.error('Game initialization error:', error);
        showError('Error initializing the game: ' + error.message);
    }
}

// Display error message to the user
function showError(message) {
    const container = document.getElementById('chess-board');
    if (container) {
        container.innerHTML = `
            <div style="color: red; padding: 20px; text-align: center;">
                <h2>Error</h2>
                <p>${message}</p>
            </div>
        `;
    }
    console.error(message);
}