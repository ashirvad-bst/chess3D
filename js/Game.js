class Game {
    constructor(gameMode = 'friend') {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.board = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.gameMode = gameMode; // 'friend' or 'computer'
        this.currentPlayer = 'white'; // white starts
        this.selectedPiece = null;
        this.capturedPieces = [];
        this.gameOver = false;
        
        // AI settings
        this.isComputerThinking = false;
        this.computerColor = 'black'; // Computer plays as black
        
        // Add debug flag
        this.debugMode = true;
        this.animationFrameCount = 0;
        
        this.init();
        
        // Ensure game mode display is updated whenever a new game is created
        this.updateGameModeDisplay();
    }
    
    init() {
        // Initialize Three.js scene
        this.initScene();
        
        // Initialize the board
        this.board = new Board(this.scene);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize chess pieces
        this.board.initializePieces();
        
        // Update game mode display
        this.updateGameModeDisplay();
        
        // Start the render loop
        this.animate();
    }
    
    // Initialize the scene with properly computed bounding spheres
    initScene() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xbbdefb);  // Light blue background
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 10, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        const chessBoard = document.getElementById('chess-board');
        if (!chessBoard) {
            console.error("Chess board element not found!");
            return;
        }
        
        this.renderer.setSize(
            chessBoard.clientWidth,
            chessBoard.clientHeight
        );
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        chessBoard.appendChild(this.renderer.domElement);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Setup controls (orbit controls for camera)
        try {
            if (typeof THREE.OrbitControls === 'function') {
                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                // Only set properties if controls is successfully created
                if (this.controls) {
                    this.controls.enableDamping = true;
                    this.controls.dampingFactor = 0.1;
                    this.controls.screenSpacePanning = false;
                    this.controls.maxPolarAngle = Math.PI / 2;
                    
                    // Make sure target is set properly
                    this.controls.target.set(0, 0, 0);
                    this.controls.update();
                }
            } else {
                console.warn('OrbitControls not available as a function. Camera controls will be disabled.');
                this.createDummyControls();
            }
        } catch (error) {
            console.error('Error initializing OrbitControls:', error);
            this.createDummyControls();
        }
    }
    
    // Create dummy controls object to avoid errors
    createDummyControls() {
        this.controls = {
            update: function() {},
            target: new THREE.Vector3(0, 0, 0)
        };
    }
    
    setupEventListeners() {
        // Mouse click event to select and move pieces
        this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));
        
        // Window resize event
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Reset button
        document.getElementById('reset-button').addEventListener('click', this.resetGame.bind(this));
        
        // Back to menu button
        document.getElementById('back-to-menu').addEventListener('click', this.backToMenu.bind(this));
    }
    
    // Fix the raycaster intersection with proper checks
    onMouseClick(event) {
        // If it's computer's turn and game mode is computer, ignore clicks
        if (this.gameMode === 'computer' && this.currentPlayer === this.computerColor) {
            return;
        }
        
        if (this.gameOver || !this.renderer || !this.scene || !this.camera || !this.board) return;
        
        try {
            // Calculate mouse position in normalized device coordinates (-1 to +1)
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Update the picking ray with the camera and mouse position
            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            // Get objects to test for intersection - only include valid meshes
            const objectsToTest = [];
            
            // Add all board squares to test objects with valid geometry
            for (let x = 0; x < 8; x++) {
                for (let y = 0; y < 8; y++) {
                    if (this.board.squares[x] && this.board.squares[x][y] && this.board.squares[x][y].mesh) {
                        const mesh = this.board.squares[x][y].mesh;
                        
                        // Ensure the mesh has a valid geometry with boundingSphere
                        if (mesh.geometry && !mesh.geometry.boundingSphere) {
                            mesh.geometry.computeBoundingSphere();
                        }
                        
                        objectsToTest.push(mesh);
                    }
                }
            }
            
            // Only proceed if we have valid objects to test
            if (objectsToTest.length > 0) {
                // Test only specific objects instead of all scene children
                const intersects = this.raycaster.intersectObjects(objectsToTest);
                
                if (intersects.length > 0) {
                    // Find if we hit a square
                    for (const intersect of intersects) {
                        const object = intersect.object;
                        
                        // Check if it's a board square
                        for (let x = 0; x < 8; x++) {
                            for (let y = 0; y < 8; y++) {
                                if (this.board.squares[x][y] && this.board.squares[x][y].mesh === object) {
                                    this.board.handleSquareClick(x, y, this);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
            
            // Try to intersect with piece meshes if no square was hit
            const pieceMeshes = [];
            for (const piece of this.board.pieces) {
                if (piece && piece.mesh) {
                    piece.mesh.traverse(child => {
                        if (child.isMesh) {
                            // Ensure the mesh has a valid geometry with boundingSphere
                            if (child.geometry && !child.geometry.boundingSphere) {
                                child.geometry.computeBoundingSphere();
                            }
                            
                            // Store reference to parent piece for easier lookup
                            child.userData.parentPiece = piece;
                            pieceMeshes.push(child);
                        }
                    });
                }
            }
            
            if (pieceMeshes.length > 0) {
                const pieceIntersects = this.raycaster.intersectObjects(pieceMeshes);
                if (pieceIntersects.length > 0) {
                    const hitObject = pieceIntersects[0].object;
                    if (hitObject.userData.parentPiece) {
                        const piece = hitObject.userData.parentPiece;
                        const { x, y } = piece.position;
                        this.board.handleSquareClick(x, y, this);
                    }
                }
            }
        } catch (error) {
            console.error('Error in mouse click handling:', error);
        }
    }
    
    onWindowResize() {
        const container = document.getElementById('chess-board');
        
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    animate() {
        try {
            this.animationFrameCount++;
            
            if (this.debugMode && this.animationFrameCount % 60 === 0) { // Log every 60 frames to avoid console spam
                console.log(`Animation frame ${this.animationFrameCount}`);
                console.log('Game instance exists:', !!this);
                console.log('Scene exists:', !!this.scene);
                console.log('Camera exists:', !!this.camera);
                console.log('Renderer exists:', !!this.renderer);
                console.log('Controls exists:', !!this.controls);
                
                if (this.controls) {
                    console.log('Controls.update type:', typeof this.controls.update);
                    console.log('Controls.target:', this.controls.target);
                }
            }
            
            // Safety check for this reference
            if (!this || !this.scene || !this.camera || !this.renderer) {
                console.error('Critical objects missing in animate:',
                    'this:', !!this,
                    'scene:', this ? !!this.scene : 'N/A',
                    'camera:', this ? !!this.camera : 'N/A',
                    'renderer:', this ? !!this.renderer : 'N/A'
                );
                return;
            }
            
            // Schedule next animation frame - do this first to ensure loop continues even if error occurs later
            requestAnimationFrame(this.animate.bind(this));
            
            // Update controls if they exist and have an update method
            if (this.controls) {
                if (typeof this.controls.update === 'function') {
                    try {
                        this.controls.update();
                        if (this.debugMode && this.animationFrameCount % 300 === 0) {
                            console.log('Controls updated successfully');
                        }
                    } catch (controlsError) {
                        console.error('Error updating controls:', controlsError);
                        console.log('Controls object:', this.controls);
                        
                        // If controls error persists, recreate dummy controls
                        this.createDummyControls();
                    }
                } else {
                    if (this.debugMode && this.animationFrameCount % 300 === 0) {
                        console.log('Controls.update is not a function, skipping update');
                    }
                }
            }
            
            // Fix any potential geometry issues before rendering
            this.fixSceneGeometries();
            
            // Render scene - with extra safety checks
            if (this.renderer && this.scene && this.camera) {
                try {
                    // Check if any objects in the scene have improper geometry
                    if (this.debugMode && this.animationFrameCount % 600 === 0) {
                        console.log('Scene children count:', this.scene.children.length);
                        this.checkSceneObjects();
                    }
                    
                    this.renderer.render(this.scene, this.camera);
                    
                    if (this.debugMode && this.animationFrameCount % 300 === 0) {
                        console.log('Render successful');
                    }
                } catch (renderError) {
                    console.error('Error rendering scene:', renderError);
                    console.log('Error stack:', renderError.stack);
                    
                    // Try to identify the problematic objects
                    this.findProblematicObjects();
                }
            } else {
                console.error('Cannot render: missing required objects');
            }
        } catch (error) {
            console.error('General error in animation loop:', error);
            console.log('Error stack:', error.stack);
        }
    }
    
    // New method to fix geometries before rendering
    fixSceneGeometries() {
        if (!this.scene) return;
        
        try {
            this.scene.traverse(object => {
                if (object.isMesh && object.geometry) {
                    // Skip objects without geometry to prevent errors
                    if (!object.geometry) {
                        return;
                    }
                    
                    // Fix BufferGeometry without position attributes
                    if (object.geometry.isBufferGeometry && 
                        (!object.geometry.attributes || !object.geometry.attributes.position)) {
                        
                        console.warn('Fixing mesh with missing position attribute:', object.uuid);
                        // Create a minimal valid position attribute if missing
                        if (!object.geometry.attributes) {
                            object.geometry.attributes = {};
                        }
                        
                        if (!object.geometry.attributes.position) {
                            // Create a minimal position attribute with a triangle
                            const positions = new Float32Array([
                                0, 0, 0,
                                0, 1, 0,
                                1, 0, 0
                            ]);
                            object.geometry.setAttribute('position', 
                                new THREE.BufferAttribute(positions, 3));
                        }
                    }
                    
                    // Ensure boundingSphere is computed - check if method exists first
                    if (!object.geometry.boundingSphere) {
                        if (typeof object.geometry.computeBoundingSphere === 'function') {
                            object.geometry.computeBoundingSphere();
                        } else {
                            // Create a default bounding sphere if the compute method doesn't exist
                            object.geometry.boundingSphere = new THREE.Sphere(
                                new THREE.Vector3(0, 0, 0), 1
                            );
                        }
                    }
                    
                    // Ensure bounding box is computed - check if method exists first
                    if (!object.geometry.boundingBox) {
                        if (typeof object.geometry.computeBoundingBox === 'function') {
                            object.geometry.computeBoundingBox();
                        } else {
                            // Create a default bounding box if the compute method doesn't exist
                            object.geometry.boundingBox = new THREE.Box3(
                                new THREE.Vector3(-1, -1, -1),
                                new THREE.Vector3(1, 1, 1)
                            );
                        }
                    }
                    
                    // Handle BufferGeometry specifics
                    if (object.geometry.isBufferGeometry && object.geometry.attributes) {
                        // Update vertices if needed
                        if (object.geometry.attributes.position) {
                            if (object.geometry.attributes.position.needsUpdate) {
                                object.geometry.attributes.position.needsUpdate = true;
                            }
                        }
                    }
                } else if (object.isGroup) {
                    // Fix for Group objects that might not have geometry
                    if (object.children.length === 0) {
                        // Add a dummy invisible object to empty groups to prevent errors
                        const dummyGeometry = new THREE.BufferGeometry();
                        const positions = new Float32Array([0, 0, 0, 0, 1, 0, 1, 0, 0]); // Triangle
                        dummyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                        
                        // Compute bounding sphere correctly
                        if (typeof dummyGeometry.computeBoundingSphere === 'function') {
                            dummyGeometry.computeBoundingSphere();
                        } else {
                            dummyGeometry.boundingSphere = new THREE.Sphere(
                                new THREE.Vector3(0, 0, 0), 1
                            );
                        }
                        
                        const dummyMaterial = new THREE.MeshBasicMaterial({visible: false});
                        const dummyMesh = new THREE.Mesh(dummyGeometry, dummyMaterial);
                        dummyMesh.visible = false;
                        object.add(dummyMesh);
                    }
                }
            });
        } catch (error) {
            console.error('Error fixing scene geometries:', error);
        }
    }
    
    // Helper method to check scene objects for potential issues
    checkSceneObjects() {
        try {
            if (!this.scene) return;
            
            let count = 0;
            let problemCount = 0;
            this.scene.traverse(object => {
                count++;
                let hasProblem = false;
                
                // Check for common issues
                if (object.isMesh) {
                    const geometry = object.geometry;
                    const material = object.material;
                    
                    if (!geometry) {
                        console.warn(`- Problem ${++problemCount}: Mesh without geometry:`, object.uuid);
                        hasProblem = true;
                    } else if (!geometry.attributes || !geometry.attributes.position) {
                        console.warn(`- Problem ${++problemCount}: Mesh missing position attribute:`, object.uuid);
                        hasProblem = true;
                    } else if (geometry.boundingSphere === null) {
                        console.warn(`- Problem ${++problemCount}: Missing boundingSphere:`, object.uuid);
                        hasProblem = true;
                    }
                    
                    // Log details for problematic objects or a sample of all objects
                    if (hasProblem || count <= 10 || count % 50 === 0) {
                        console.log(`Object ${count}:`, object.type, object.uuid.substring(0, 8));
                        console.log(`- Mesh has geometry: ${!!geometry}, material: ${!!material}`);
                        if (geometry && geometry.attributes) {
                            console.log(`- Geometry has position attribute: ${!!geometry.attributes.position}`);
                        }
                    }
                }
            });
            
            console.log(`Total objects checked: ${count}, Problems found: ${problemCount}`);
        } catch (error) {
            console.error('Error checking scene objects:', error);
        }
    }
    
    // Try to find problematic objects in the scene
    findProblematicObjects() {
        try {
            if (!this.scene) return;
            
            console.log('Attempting to identify problematic objects...');
            
            // Check mesh objects for proper geometry
            this.scene.traverse(object => {
                if (object.isMesh) {
                    if (!object.geometry) {
                        console.warn('Found mesh without geometry:', object.uuid);
                        // Create minimal geometry for the mesh
                        object.geometry = new THREE.BufferGeometry();
                        // Use BufferAttribute for position attribute
                        const positions = new Float32Array([0, 0, 0, 0, 1, 0, 1, 0, 0]); // Triangle
                        object.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                        console.log('Created minimal geometry for mesh');
                    } 
                    else if (!object.geometry.attributes || !object.geometry.attributes.position) {
                        console.warn('Found mesh with invalid geometry (no position attribute):', object.uuid);
                        
                        // Handle different geometry types correctly
                        if (object.geometry.isBufferGeometry) {
                            // For BufferGeometry, use setAttribute
                            const positions = new Float32Array([0, 0, 0, 0, 1, 0, 1, 0, 0]);
                            try {
                                if (!object.geometry.attributes) {
                                    object.geometry.attributes = {};
                                }
                                object.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                                console.log('Added position attribute to BufferGeometry');
                            } catch (error) {
                                console.error('Failed to set attributes on BufferGeometry:', error);
                                // Replace with a fresh BufferGeometry if setAttribute fails
                                const newGeom = new THREE.BufferGeometry();
                                newGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                                object.geometry = newGeom;
                            }
                        } else {
                            // For legacy Geometry, create vertices
                            // Note: This branch may never be reached with Three.js r128 which only uses BufferGeometry
                            console.log('Replacing non-BufferGeometry with BufferGeometry');
                            const newGeom = new THREE.BufferGeometry();
                            const positions = new Float32Array([0, 0, 0, 0, 1, 0, 1, 0, 0]);
                            newGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                            object.geometry = newGeom;
                        }
                    } 
                    else if (object.geometry.boundingSphere === null) {
                        console.warn('Found mesh with null boundingSphere:', object.uuid);
                        try {
                            // Try to fix it safely
                            if (typeof object.geometry.computeBoundingSphere === 'function') {
                                object.geometry.computeBoundingSphere();
                                console.log('Computed boundingSphere for mesh');
                            } else {
                                // Create a default bounding sphere
                                object.geometry.boundingSphere = new THREE.Sphere(
                                    new THREE.Vector3(0, 0, 0), 1
                                );
                                console.log('Created default boundingSphere');
                            }
                        } catch (error) {
                            console.error('Error computing boundingSphere:', error);
                            // If computation fails, create a default one
                            object.geometry.boundingSphere = new THREE.Sphere(
                                new THREE.Vector3(0, 0, 0), 1
                            );
                            console.log('Created default boundingSphere after error');
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error while finding problematic objects:', error);
        }
    }
    
    updateStatus() {
        const statusElement = document.getElementById('status');
        
        // If it's computer's turn, show thinking message
        if (this.gameMode === 'computer' && this.currentPlayer === this.computerColor && !this.gameOver) {
            if (this.isComputerThinking) {
                statusElement.textContent = "Computer is thinking...";
                return;
            }
        }
        
        statusElement.textContent = `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)}'s turn`;
        
        // Update captured pieces display
        this.updateCapturedPieces();
        
        // Check for game over conditions
        this.checkGameOver();
        
        // If it's computer's turn, trigger AI move after a short delay
        // Only trigger computer move if game mode is computer
        if (this.gameMode === 'computer' && this.currentPlayer === this.computerColor && !this.gameOver) {
            this.isComputerThinking = true;
            statusElement.textContent = "Computer is thinking...";
            
            setTimeout(() => {
                this.makeComputerMove();
            }, 1000); // Delay to simulate thinking
        }
    }
    
    updateGameModeDisplay() {
        const modeDisplay = document.getElementById('game-mode-display');
        if (modeDisplay) {
            modeDisplay.textContent = this.gameMode === 'friend' 
                ? 'Playing with a Friend' 
                : 'Playing with Computer';
            
            // Add visual indication of game mode
            modeDisplay.className = this.gameMode === 'friend' ? 'friend-mode' : 'computer-mode';
        }
    }
    
    updateCapturedPieces() {
        const whiteCaptured = document.getElementById('white-captured');
        const blackCaptured = document.getElementById('black-captured');
        
        // Clear current displays
        whiteCaptured.innerHTML = '';
        blackCaptured.innerHTML = '';
        
        // Group captured pieces by type
        const capturedWhite = this.capturedPieces.filter(piece => piece.color === 'white');
        const capturedBlack = this.capturedPieces.filter(piece => piece.color === 'black');
        
        // Display captures (in a real implementation, we'd use piece icons)
        whiteCaptured.innerHTML = capturedWhite.map(p => p.type).join(', ');
        blackCaptured.innerHTML = capturedBlack.map(p => p.type).join(', ');
    }
    
    checkGameOver() {
        // Check for kings
        const whiteKingExists = this.board.pieces.some(p => p.type === 'king' && p.color === 'white');
        const blackKingExists = this.board.pieces.some(p => p.type === 'king' && p.color === 'black');
        
        if (!whiteKingExists) {
            this.endGame('Black wins! White king is captured.');
        } else if (!blackKingExists) {
            this.endGame('White wins! Black king is captured.');
        }
        
        // TODO: Check for checkmate, stalemate, etc.
    }
    
    endGame(message) {
        this.gameOver = true;
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.style.color = '#e74c3c'; // Red for emphasis
    }
    
    resetGame() {
        // Remove all pieces from the scene
        for (const piece of this.board.pieces) {
            if (piece.mesh) {
                this.scene.remove(piece.mesh);
            }
        }
        
        // Reset game state
        this.currentPlayer = 'white';
        this.selectedPiece = null;
        this.capturedPieces = [];
        this.gameOver = false;
        this.isComputerThinking = false;
        
        // Reset the board
        this.board.pieces = [];
        this.board.resetHighlights();
        
        // Reinitialize pieces
        this.board.initializePieces();
        
        // Update UI
        const statusElement = document.getElementById('status');
        statusElement.textContent = "White's turn";
        statusElement.style.color = ''; // Reset color
        
        this.updateCapturedPieces();
    }
    
    cleanupResources() {
        console.log('Cleaning up game resources...');
        
        // Stop animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Remove event listeners
        if (this.renderer && this.renderer.domElement) {
            this.renderer.domElement.removeEventListener('click', this.onMouseClick.bind(this));
        }
        window.removeEventListener('resize', this.onWindowResize.bind(this));
        
        // Clear all GSAP animations
        if (window.gsap) {
            gsap.killTweensOf([".board-square", ".chess-piece"]);
        }
        
        // Clear board state
        if (this.board) {
            // Remove highlights and animations
            this.board.resetHighlights();
            this.board.clearPathHighlights();
            
            // Remove all pieces from the scene
            if (this.board.pieces) {
                for (const piece of this.board.pieces) {
                    if (piece.mesh) {
                        // Kill any animations on the piece
                        if (window.gsap) gsap.killTweensOf(piece.mesh);
                        // Remove from scene
                        this.scene.remove(piece.mesh);
                        // Dispose geometries and materials
                        if (piece.mesh.geometry) piece.mesh.geometry.dispose();
                        if (piece.mesh.material) {
                            if (Array.isArray(piece.mesh.material)) {
                                piece.mesh.material.forEach(m => m.dispose());
                            } else {
                                piece.mesh.material.dispose();
                            }
                        }
                    }
                }
            }
            
            // Remove board group from scene
            if (this.board.boardGroup) {
                this.scene.remove(this.board.boardGroup);
            }
        }
        
        // Dispose of geometries and materials
        if (this.scene) {
            while (this.scene.children.length > 0) {
                const object = this.scene.children[0];
                this.disposeObject(object);
                this.scene.remove(object);
            }
        }
        
        // Dispose of renderer
        if (this.renderer) {
            this.renderer.dispose();
            const chessBoard = document.getElementById('chess-board');
            if (chessBoard && this.renderer.domElement && chessBoard.contains(this.renderer.domElement)) {
                chessBoard.removeChild(this.renderer.domElement);
            }
        }
        
        // Reset game state
        this.currentPlayer = 'white';
        this.selectedPiece = null;
        this.capturedPieces = [];
        this.gameOver = false;
        this.isComputerThinking = false;
        
        // Clear references
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this.board = null;
        this.renderer = null;
        
        console.log('Game resources cleaned up successfully');
    }
    
    // Helper method to recursively dispose of 3D objects
    disposeObject(object) {
        if (!object) return;
        
        // Dispose all animations
        if (window.gsap) gsap.killTweensOf(object);
        
        // Dispose geometry
        if (object.geometry) object.geometry.dispose();
        
        // Dispose material(s)
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(material => {
                    if (material.map) material.map.dispose();
                    material.dispose();
                });
            } else {
                if (object.material.map) object.material.map.dispose();
                object.material.dispose();
            }
        }
        
        // Recursively dispose children
        if (object.children && object.children.length > 0) {
            // Create a copy of children array since we're modifying it during iteration
            const children = [...object.children];
            children.forEach(child => {
                this.disposeObject(child);
                object.remove(child);
            });
        }
    }
    
    backToMenu() {
        console.log('Going back to menu...');
        
        // Hide game container and show selection screen
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('game-selection').style.display = 'flex';
        
        // Clean up resources
        this.cleanupResources();
        
        // Make sure the UI is reset for a new game
        const modeDisplay = document.getElementById('game-mode-display');
        if (modeDisplay) {
            modeDisplay.textContent = 'Select a game mode';
            modeDisplay.className = '';
        }
        
        // Remove the global reference to this game instance
        window.chessGame = null;
    }
    
    // AI methods for computer opponent
    makeComputerMove() {
        // Only proceed if we're in computer mode and it's computer's turn
        if (this.gameOver || this.currentPlayer !== this.computerColor || this.gameMode !== 'computer') {
            this.isComputerThinking = false;
            return;
        }
        
        try {
            // Get all valid moves for computer pieces
            const computerPieces = this.board.pieces.filter(piece => piece.color === this.computerColor);
            if (computerPieces.length === 0) {
                this.isComputerThinking = false;
                return;
            }
            
            // Store all possible moves
            const possibleMoves = [];
            
            // Gather all valid moves for all computer pieces
            for (const piece of computerPieces) {
                for (let x = 0; x < 8; x++) {
                    for (let y = 0; y < 8; y++) {
                        const targetPosition = { x, y };
                        if (piece.position.x === x && piece.position.y === y) continue;
                        
                        if (piece.isValidMove(targetPosition, this.board)) {
                            // Calculate move score based on simple heuristics
                            const moveScore = this.evaluateMove(piece, targetPosition);
                            possibleMoves.push({
                                piece: piece,
                                targetPosition: targetPosition,
                                score: moveScore
                            });
                        }
                    }
                }
            }
            
            // If there are valid moves, make the best one
            if (possibleMoves.length > 0) {
                // Sort moves by score (highest first)
                possibleMoves.sort((a, b) => b.score - a.score);
                
                // Add some randomness - don't always choose the best move
                const moveIndex = Math.random() < 0.7 ? 0 : Math.floor(Math.random() * Math.min(3, possibleMoves.length));
                const selectedMove = possibleMoves[moveIndex];
                
                // Apply the move
                this.performComputerMove(selectedMove.piece, selectedMove.targetPosition);
            } else {
                console.log('No valid moves found for computer');
                // Check if this is a stalemate/checkmate scenario
                this.checkGameOver();
            }
        } catch (error) {
            console.error('Error in computer move:', error);
        }
        
        this.isComputerThinking = false;
    }
    
    performComputerMove(piece, targetPosition) {
        // Check if there's a piece to capture
        const capturedPiece = this.board.getPieceAt(targetPosition);
        if (capturedPiece) {
            this.board.removePiece(capturedPiece);
            this.capturedPieces.push(capturedPiece);
        }
        
        // Move the computer's piece
        this.board.movePiece(piece, targetPosition);
        
        // Switch turns back to the player
        this.currentPlayer = 'white';
        this.updateStatus();
    }
    
    evaluateMove(piece, targetPosition) {
        let score = 0;
        
        // Basic piece values
        const pieceValues = {
            'pawn': 1,
            'knight': 3,
            'bishop': 3,
            'rook': 5,
            'queen': 9,
            'king': 100
        };
        
        // Check if move captures an opponent's piece
        const capturedPiece = this.board.getPieceAt(targetPosition);
        if (capturedPiece) {
            // Capturing pieces is good - higher value pieces are better captures
            score += pieceValues[capturedPiece.type] * 10;
        }
        
        // Center control is valuable (especially for knights and bishops)
        const distanceToCenter = Math.abs(targetPosition.x - 3.5) + Math.abs(targetPosition.y - 3.5);
        score -= distanceToCenter; // Closer to center is better
        
        // Knights are more valuable in the center
        if (piece.type === 'knight') {
            score -= distanceToCenter * 0.5;
        }
        
        // Pawns get bonus for advancing
        if (piece.type === 'pawn') {
            // Black pawns want to go down the board (decreasing y)
            if (piece.color === 'black') {
                score += (7 - targetPosition.y) * 0.5;
            }
        }
        
        // Add some randomness to make the AI less predictable
        score += Math.random() * 0.5;
        
        return score;
    }
}