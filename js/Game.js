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
        
        // Check detection properties
        this.whiteKingInCheck = false;
        this.blackKingInCheck = false;
        
        // Move history for undo functionality
        this.moveHistory = [];
        
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
        
        // Undo button
        document.getElementById('undo-button').addEventListener('click', this.undoLastMove.bind(this));
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
        
        // Check if any king is in check
        this.whiteKingInCheck = this.isKingInCheck('white');
        this.blackKingInCheck = this.isKingInCheck('black');
        
        // Remove previous check highlights
        this.removeCheckHighlight('white');
        this.removeCheckHighlight('black');
        
        // If white king is in check, highlight it
        if (this.whiteKingInCheck) {
            this.highlightKingInCheck('white');
        }
        
        // If black king is in check, highlight it
        if (this.blackKingInCheck) {
            this.highlightKingInCheck('black');
        }
        
        // If it's computer's turn, show thinking message
        if (this.gameMode === 'computer' && this.currentPlayer === this.computerColor && !this.gameOver) {
            if (this.isComputerThinking) {
                statusElement.textContent = "Computer is thinking...";
                return;
            }
        }
        
        // Check for checkmate
        if (this.currentPlayer === 'white' && this.isInCheckmate('white')) {
            this.endGame('Checkmate! Black wins!');
            return;
        } else if (this.currentPlayer === 'black' && this.isInCheckmate('black')) {
            this.endGame('Checkmate! White wins!');
            return;
        }
        
        // Check for stalemate
        if (this.isInStalemate(this.currentPlayer)) {
            this.endGame('Stalemate! The game is a draw.');
            return;
        }
        
        // Update status message
        if (this.currentPlayer === 'white' && this.whiteKingInCheck) {
            statusElement.textContent = "White's King is in CHECK!";
            statusElement.style.color = '#e74c3c'; // Red for check
        } else if (this.currentPlayer === 'black' && this.blackKingInCheck) {
            statusElement.textContent = "Black's King is in CHECK!";
            statusElement.style.color = '#e74c3c'; // Red for check
        } else {
            statusElement.textContent = `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)}'s turn`;
            statusElement.style.color = ''; // Reset color
        }
        
        // Update captured pieces display
        this.updateCapturedPieces();
        
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
            
            // Show/hide undo button based on game mode
            const undoButton = document.getElementById('undo-button');
            if (undoButton) {
                undoButton.style.display = this.gameMode === 'friend' ? 'inline-block' : 'none';
            }
        }
    }
    
    // Check if a king is in check
    isKingInCheck(kingColor) {
        // Find the king
        const king = this.board.pieces.find(piece => 
            piece.type === 'king' && piece.color === kingColor
        );
        
        if (!king) return false; // No king found (shouldn't happen in a normal game)
        
        // Get all opponent pieces
        const opponentColor = kingColor === 'white' ? 'black' : 'white';
        const opponentPieces = this.board.pieces.filter(piece => piece.color === opponentColor);
        
        // Check if any opponent piece can capture the king
        for (const piece of opponentPieces) {
            if (piece.isValidMove(king.position, this.board)) {
                if (this.debugMode) {
                    console.log(`${kingColor} king in check by ${opponentColor} ${piece.type} at ${piece.position.x},${piece.position.y}`);
                }
                return true;
            }
        }
        
        return false;
    }
    
    // Check if a move would leave the player's king in check (illegal move)
    wouldMoveLeaveKingInCheck(piece, newPosition) {
        // Remember original position and any piece at the target position
        const originalPosition = { ...piece.position };
        const targetPiece = this.board.getPieceAt(newPosition);
        let capturedPieceTemp = null;
        let enPassantCapturedPiece = null;
        
        try {
            // Check for en passant capture
            if (piece.type === 'pawn' && 
                originalPosition.x !== newPosition.x && 
                !targetPiece &&
                this.board.lastEnPassantPosition && 
                newPosition.x === this.board.lastEnPassantPosition.x && 
                newPosition.y === this.board.lastEnPassantPosition.y) {
                
                // The captured pawn position in en passant
                const capturedPawnPosition = {
                    x: newPosition.x,
                    y: originalPosition.y
                };
                
                // Get the pawn being captured by en passant
                enPassantCapturedPiece = this.board.getPieceAt(capturedPawnPosition);
                
                if (enPassantCapturedPiece) {
                    // Remove the captured pawn temporarily
                    const capturedIndex = this.board.pieces.indexOf(enPassantCapturedPiece);
                    if (capturedIndex !== -1) {
                        this.board.pieces.splice(capturedIndex, 1);
                    }
                }
            }
            
            // If there's a piece at the target position, remove it temporarily
            if (targetPiece) {
                const targetIndex = this.board.pieces.indexOf(targetPiece);
                if (targetIndex !== -1) {
                    capturedPieceTemp = this.board.pieces.splice(targetIndex, 1)[0];
                }
            }
            
            // Temporarily move the piece
            piece.position = { ...newPosition };
            
            // Check if king is in check after the move
            const inCheck = this.isKingInCheck(piece.color);
            
            // Restore the piece to its original position
            piece.position = originalPosition;
            
            // If we temporarily captured a piece, put it back
            if (capturedPieceTemp) {
                this.board.pieces.push(capturedPieceTemp);
            }
            
            // If we temporarily removed an en passant pawn, put it back
            if (enPassantCapturedPiece) {
                this.board.pieces.push(enPassantCapturedPiece);
            }
            
            return inCheck;
        } catch (error) {
            // Ensure cleanup in case of error
            piece.position = originalPosition;
            if (capturedPieceTemp) {
                this.board.pieces.push(capturedPieceTemp);
            }
            if (enPassantCapturedPiece) {
                this.board.pieces.push(enPassantCapturedPiece);
            }
            console.error('Error checking for check:', error);
            return false; // Default to allowing the move in case of an error
        }
    }
    
    // Highlight the king when in check
    highlightKingInCheck(kingColor) {
        // Find the king
        const king = this.board.pieces.find(piece => 
            piece.type === 'king' && piece.color === kingColor
        );
        
        if (king && king.mesh) {
            // Apply special highlight to indicate check
            king.mesh.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material) {
                    // Store original material settings if not already stored
                    if (!child.userData.originalEmissive) {
                        child.userData.originalEmissive = child.material.emissive.clone();
                        child.userData.originalEmissiveIntensity = child.material.emissiveIntensity;
                    }
                    
                    // Apply red highlight for check
                    child.material.emissive = new THREE.Color(0xff0000); // Red glow
                    child.material.emissiveIntensity = 0.8; // Strong glow
                    
                    // Add pulsing animation
                    gsap.to(child.material, {
                        emissiveIntensity: 0.4,
                        duration: 0.6,
                        repeat: -1,
                        yoyo: true,
                        ease: "sine.inOut"
                    });
                    
                    // Optional: Subtle scale animation to make the king "pulse"
                    gsap.to(child.scale, {
                        x: child.scale.x * 1.1,
                        y: child.scale.y * 1.1,
                        z: child.scale.z * 1.1,
                        duration: 0.6,
                        repeat: -1,
                        yoyo: true,
                        ease: "sine.inOut"
                    });
                }
            });
            
            // Update status display to show check
            const statusElement = document.getElementById('status');
            if (statusElement) {
                statusElement.textContent = `${kingColor.charAt(0).toUpperCase() + kingColor.slice(1)} is in CHECK!`;
                statusElement.style.color = '#e74c3c'; // Red
            }
        }
    }
    
    // Remove check highlighting
    removeCheckHighlight(kingColor) {
        // Find the king
        const king = this.board.pieces.find(piece => 
            piece.type === 'king' && piece.color === kingColor
        );
        
        if (king && king.mesh) {
            // Restore original material settings
            king.mesh.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material) {
                    // Kill any animations on this object
                    gsap.killTweensOf(child.material);
                    gsap.killTweensOf(child.scale);
                    
                    // Restore original emissive settings if they were saved
                    if (child.userData.originalEmissive) {
                        child.material.emissive = child.userData.originalEmissive;
                        child.material.emissiveIntensity = child.userData.originalEmissiveIntensity;
                        
                        // Clear the saved values
                        delete child.userData.originalEmissive;
                        delete child.userData.originalEmissiveIntensity;
                    } else {
                        // Default reset
                        child.material.emissive = new THREE.Color(0x000000);
                        child.material.emissiveIntensity = 0;
                    }
                    
                    // Reset scale if it was animated
                    gsap.to(child.scale, {
                        x: 1,
                        y: 1,
                        z: 1,
                        duration: 0.3,
                        ease: "power2.out"
                    });
                }
            });
        }
    }
    
    // Check if player is in checkmate
    isInCheckmate(kingColor) {
        // First check if the king is in check
        if (!this.isKingInCheck(kingColor)) {
            return false; // Not in check, so definitely not checkmate
        }
        
        // Try to find any legal move for any piece of kingColor that gets out of check
        const pieces = this.board.pieces.filter(piece => piece.color === kingColor);
        
        for (const piece of pieces) {
            // Try every possible move for this piece
            for (let x = 0; x < 8; x++) {
                for (let y = 0; y < 8; y++) {
                    const newPos = { x, y };
                    
                    // Skip if it's the same position
                    if (piece.position.x === x && piece.position.y === y) continue;
                    
                    // If this is a valid move according to chess rules
                    if (piece.isValidMove(newPos, this.board)) {
                        // And this move doesn't leave the king in check
                        if (!this.wouldMoveLeaveKingInCheck(piece, newPos)) {
                            return false; // Found a legal move, not checkmate
                        }
                    }
                }
            }
        }
        
        // If we get here, no legal moves were found while in check - it's checkmate
        return true;
    }
    
    // Check if it's a stalemate (not in check but no legal moves)
    isInStalemate(kingColor) {
        // First check if the king is in check
        if (this.isKingInCheck(kingColor)) {
            return false; // In check, so not stalemate
        }
        
        // Try to find any legal move for any piece of kingColor
        const pieces = this.board.pieces.filter(piece => piece.color === kingColor);
        
        for (const piece of pieces) {
            // Try every possible move for this piece
            for (let x = 0; x < 8; x++) {
                for (let y = 0; y < 8; y++) {
                    const newPos = { x, y };
                    
                    // Skip if it's the same position
                    if (piece.position.x === x && piece.position.y === y) continue;
                    
                    // If this is a valid move according to chess rules
                    if (piece.isValidMove(newPos, this.board)) {
                        // And this move doesn't leave the king in check
                        if (!this.wouldMoveLeaveKingInCheck(piece, newPos)) {
                            return false; // Found a legal move, not stalemate
                        }
                    }
                }
            }
        }
        
        // If we get here, no legal moves were found while not in check - it's stalemate
        return true;
    }
    
    checkGameOver() {
        // First check for insufficient material (K vs K, K vs KB, K vs KN)
        if (this.hasInsufficientMaterial()) {
            this.endGame("Draw by insufficient material");
            return;
        }
        
        // Then check stalemate first since a player not in check might have no moves
        if (this.isInStalemate(this.currentPlayer)) {
            this.endGame("Stalemate! The game is a draw");
            return;
        }
        
        // Check for checkmate - ensure it applies whether playing against computer or friend
        if (this.isInCheckmate(this.currentPlayer)) {
            const winner = this.currentPlayer === 'white' ? 'Black' : 'White';
            this.endGame(`Checkmate! ${winner} wins`);
            return;
        }
        
        // Update check status for UI - do this for both human and computer players
        const whiteInCheck = this.isKingInCheck('white');
        const blackInCheck = this.isKingInCheck('black');
        
        // Remove any previous check highlights
        this.removeCheckHighlight('white');
        this.removeCheckHighlight('black');
        
        // Apply new check highlights if needed
        if (whiteInCheck) {
            this.highlightKingInCheck('white');
        }
        
        if (blackInCheck) {
            this.highlightKingInCheck('black');
        }
        
        // If playing against computer and it's computer's turn, make the computer move
        // But only if the game isn't over
        if (this.gameMode === 'computer' && this.currentPlayer === this.computerColor && !this.gameOver) {
            // Wait a moment before computer makes its move
            this.isComputerThinking = true;
            setTimeout(() => {
                if (!this.gameOver) { // Double-check that the game hasn't ended
                    this.makeComputerMove();
                } else {
                    this.isComputerThinking = false;
                }
            }, 1000);
        }
    }
    
    // Check for insufficient material
    hasInsufficientMaterial() {
        // Count pieces and their types
        const pieces = this.board.pieces;
        
        // Classic draw scenarios:
        // 1. K vs K
        // 2. K vs K+B
        // 3. K vs K+N
        
        // First check total piece count - if > 3, can't be insufficient material
        if (pieces.length > 4) return false;
        
        // Count pieces by type
        let whitePieces = [];
        let blackPieces = [];
        
        pieces.forEach(piece => {
            if (piece.color === 'white') {
                whitePieces.push(piece.type);
            } else {
                blackPieces.push(piece.type);
            }
        });
        
        // Filter out kings (every side has one)
        whitePieces = whitePieces.filter(type => type !== 'king');
        blackPieces = blackPieces.filter(type => type !== 'king');
        
        // King vs King
        if (whitePieces.length === 0 && blackPieces.length === 0) {
            return true;
        }
        
        // King + Knight vs King or King + Bishop vs King
        if ((whitePieces.length === 1 && blackPieces.length === 0) ||
            (whitePieces.length === 0 && blackPieces.length === 1)) {
            
            const singlePiece = whitePieces.length === 1 ? whitePieces[0] : blackPieces[0];
            
            if (singlePiece === 'knight' || singlePiece === 'bishop') {
                return true;
            }
        }
        
        // King + Bishop vs King + Bishop (bishops on same color)
        if (whitePieces.length === 1 && blackPieces.length === 1 && 
            whitePieces[0] === 'bishop' && blackPieces[0] === 'bishop') {
            
            // Find the bishops
            const whiteBishop = pieces.find(p => p.type === 'bishop' && p.color === 'white');
            const blackBishop = pieces.find(p => p.type === 'bishop' && p.color === 'black');
            
            // Check if bishops are on same color squares
            const whiteBishopOnLight = (whiteBishop.position.x + whiteBishop.position.y) % 2 === 0;
            const blackBishopOnLight = (blackBishop.position.x + blackBishop.position.y) % 2 === 0;
            
            if (whiteBishopOnLight === blackBishopOnLight) {
                return true;
            }
        }
        
        return false;
    }
    
    // End the game
    endGame(message) {
        // Only proceed if game isn't already over
        if (this.gameOver) return;
        
        this.gameOver = true;
        
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = message;
            // Set color based on result
            if (message.includes('Checkmate')) {
                statusElement.style.color = '#e74c3c'; // Red
            } else if (message.includes('Stalemate') || message.includes('Draw')) {
                statusElement.style.color = '#3498db'; // Blue
            }
        }
        
        // Show game over message as overlay as well
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            const overlay = document.createElement('div');
            overlay.className = 'game-over-overlay';
            overlay.innerHTML = `
                <div class="game-over-message">
                    <h2>Game Over</h2>
                    <p>${message}</p>
                    <button id="play-again">Play Again</button>
                    <button id="back-to-menu">Back to Menu</button>
                </div>
            `;
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `;
            
            const messageDiv = overlay.querySelector('.game-over-message');
            messageDiv.style.cssText = `
                background-color: rgba(255, 255, 255, 0.9);
                padding: 2rem;
                border-radius: 8px;
                text-align: center;
                max-width: 80%;
            `;
            
            gameContainer.appendChild(overlay);
            
            // Set up event listeners for buttons
            document.getElementById('play-again').addEventListener('click', () => {
                this.resetGame();
                gameContainer.removeChild(overlay);
            });
            
            document.getElementById('back-to-menu').addEventListener('click', () => {
                this.backToMenu();
                gameContainer.removeChild(overlay);
            });
        }
    }
    
    // Check if a move would leave the player's king in check (illegal move)
    wouldMoveLeaveKingInCheck(piece, newPosition) {
        // Store original position and any potentially captured piece
        const originalPosition = {...piece.position};
        const capturedPiece = this.board.getPieceAt(newPosition);
        
        // Temporarily move the piece
        const originalHasMoved = piece.hasMoved;
        piece.position = {...newPosition};
        
        // If there was a piece at the new position, temporarily remove it from the board
        // (but keep it in memory to restore later)
        let capturedPieceIndex = -1;
        if (capturedPiece) {
            capturedPieceIndex = this.board.pieces.indexOf(capturedPiece);
            if (capturedPieceIndex !== -1) {
                this.board.pieces.splice(capturedPieceIndex, 1);
            }
        }
        
        // Check if the player's king is in check after this move
        const kingInCheck = this.isKingInCheck(piece.color);
        
        // Restore the original state
        piece.position = originalPosition;
        piece.hasMoved = originalHasMoved;
        
        // Restore any captured piece
        if (capturedPiece && capturedPieceIndex !== -1) {
            this.board.pieces.splice(capturedPieceIndex, 0, capturedPiece);
        }
        
        return kingInCheck;
    }
    
    // Highlight the king when in check
    highlightKingInCheck(kingColor) {
        const king = this.board.pieces.find(p => p.type === 'king' && p.color === kingColor);
        if (!king) return;
        
        // Apply a special visual effect to indicate check
        if (king.mesh) {
            // Create a red pulsing effect around the king
            king.mesh.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material) {
                    // Use red for check indication
                    child.material.emissive = new THREE.Color(0xff0000);
                    child.material.emissiveIntensity = 1.0;
                    
                    // Add pulsing animation
                    if (!child.userData.checkAnimation) {
                        child.userData.checkAnimation = true;
                        
                        // Pulsing glow effect
                        gsap.to(child.material, {
                            emissiveIntensity: 0.5,
                            duration: 0.6,
                            repeat: -1,
                            yoyo: true,
                            ease: "sine.inOut"
                        });
                    }
                }
            });
            
            // Add a danger indicator above the king
            if (!king.mesh.userData.checkIndicator) {
                // Create a red exclamation point using basic geometries instead of TextGeometry
                const group = new THREE.Group();
                
                // Create the exclamation point dot (bottom part)
                const dotGeometry = new THREE.SphereGeometry(0.1, 8, 8);
                const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                const dot = new THREE.Mesh(dotGeometry, dotMaterial);
                dot.position.y = 1.6;
                group.add(dot);
                
                // Create the exclamation point line (top part)
                const lineGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
                const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                const line = new THREE.Mesh(lineGeometry, lineMaterial);
                line.position.y = 2.0;
                group.add(line);
                
                // Add a pulsing animation to the indicator
                gsap.to(group.scale, {
                    x: 1.2, y: 1.2, z: 1.2,
                    duration: 0.6,
                    repeat: -1,
                    yoyo: true,
                    ease: "sine.inOut"
                });
                
                // Store reference to remove later
                king.mesh.userData.checkIndicator = group;
                king.mesh.add(group);
            }
        }
        
        // Update UI to show check status
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = `${kingColor.charAt(0).toUpperCase() + kingColor.slice(1)} King in CHECK! ${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)}'s turn`;
            statusElement.style.color = '#ff0000'; // Red to indicate danger
        }
    }
    
    // Remove check highlighting
    removeCheckHighlight(kingColor) {
        const king = this.board.pieces.find(p => p.type === 'king' && p.color === kingColor);
        if (!king || !king.mesh) return;
        
        // Remove the check visual effects
        king.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material && child.userData.checkAnimation) {
                // Stop animations
                gsap.killTweensOf(child.material);
                
                // Reset material properties
                child.material.emissive = new THREE.Color(0x000000);
                child.material.emissiveIntensity = 0;
                child.userData.checkAnimation = false;
            }
        });
        
        // Remove the check indicator if it exists
        if (king.mesh.userData.checkIndicator) {
            king.mesh.remove(king.mesh.userData.checkIndicator);
            if (king.mesh.userData.checkIndicator.geometry) {
                king.mesh.userData.checkIndicator.geometry.dispose();
            }
            if (king.mesh.userData.checkIndicator.material) {
                king.mesh.userData.checkIndicator.material.dispose();
            }
            king.mesh.userData.checkIndicator = null;
        }
        
        // Reset UI status color if not in check anymore
        const statusElement = document.getElementById('status');
        if (statusElement && statusElement.style.color === 'rgb(255, 0, 0)') {
            statusElement.style.color = '';
        }
    }
    
    // Check if player is in checkmate
    isInCheckmate(kingColor) {
        // First check if king is in check
        if (!this.isKingInCheck(kingColor)) {
            return false; // Can't be checkmate if not in check
        }
        
        // Get all pieces of the current player
        const playerPieces = this.board.pieces.filter(p => p.color === kingColor);
        
        // Try every possible move for each piece to see if check can be escaped
        for (const piece of playerPieces) {
            for (let x = 0; x < 8; x++) {
                for (let y = 0; y < 8; y++) {
                    const newPosition = { x, y };
                    
                    // Skip the current position
                    if (piece.position.x === x && piece.position.y === y) continue;
                    
                    // Check if this is a valid move according to piece movement rules
                    if (piece.isValidMove(newPosition, this.board)) {
                        // Check if this move would get the king out of check
                        if (!this.wouldMoveLeaveKingInCheck(piece, newPosition)) {
                            return false; // Found a move that escapes check
                        }
                    }
                }
            }
        }
        
        // If we reach here, no move escapes check - it's checkmate
        return true;
    }
    
    // Check if it's a stalemate (not in check but no legal moves)
    isInStalemate(kingColor) {
        // If king is in check, it's not stalemate
        if (this.isKingInCheck(kingColor)) {
            return false;
        }
        
        // Get all pieces of the current player
        const playerPieces = this.board.pieces.filter(p => p.color === kingColor);
        
        // Try every possible move for each piece to see if there are any legal moves
        for (const piece of playerPieces) {
            for (let x = 0; x < 8; x++) {
                for (let y = 0; y < 8; y++) {
                    const newPosition = { x, y };
                    
                    // Skip the current position
                    if (piece.position.x === x && piece.position.y === y) continue;
                    
                    // Check if this is a valid move according to piece movement rules
                    if (piece.isValidMove(newPosition, this.board)) {
                        // Check if this move wouldn't leave king in check
                        if (!this.wouldMoveLeaveKingInCheck(piece, newPosition)) {
                            return false; // Found a legal move
                        }
                    }
                }
            }
        }
        
        // If we reach here, no legal moves - it's stalemate
        return true;
    }
    
    checkGameOver() {
        // Check for kings
        const whiteKingExists = this.board.pieces.some(p => p.type === 'king' && p.color === 'white');
        const blackKingExists = this.board.pieces.some(p => p.type === 'king' && p.color === 'black');
        
        if (!whiteKingExists) {
            this.endGame('Black wins! White king is captured.');
            return true;
        } else if (!blackKingExists) {
            this.endGame('White wins! Black king is captured.');
            return true;
        }
        
        // Check for checkmate
        if (this.isInCheckmate('white')) {
            this.endGame('Checkmate! Black wins!');
            return true;
        } else if (this.isInCheckmate('black')) {
            this.endGame('Checkmate! White wins!');
            return true;
        }
        
        // Check for stalemate
        if (this.isInStalemate(this.currentPlayer)) {
            this.endGame('Stalemate! The game is a draw.');
            return true;
        }
        
        return false;
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
        this.moveHistory = [];
        
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
            
            // Check if computer's king is in check
            const inCheck = this.isKingInCheck(this.computerColor);
            
            // Gather all valid moves for all computer pieces
            for (const piece of computerPieces) {
                for (let x = 0; x < 8; x++) {
                    for (let y = 0; y < 8; y++) {
                        const targetPosition = { x, y };
                        if (piece.position.x === x && piece.position.y === y) continue;
                        
                        if (piece.isValidMove(targetPosition, this.board)) {
                            // Check if this move would leave the king in check
                            if (!this.wouldMoveLeaveKingInCheck(piece, targetPosition)) {
                                // Legal move that doesn't leave king in check - add it to possible moves
                                // Calculate move score based on enhanced heuristics
                                const moveScore = this.evaluateMove(piece, targetPosition, inCheck);
                                possibleMoves.push({
                                    piece: piece,
                                    targetPosition: targetPosition,
                                    score: moveScore
                                });
                            }
                        }
                    }
                }
            }
            
            // If there are valid moves, make the best one
            if (possibleMoves.length > 0) {
                // Sort moves by score (highest first)
                possibleMoves.sort((a, b) => b.score - a.score);
                
                // Log top moves for debugging (in real game, this could be shown in UI)
                if (this.debugMode) {
                    const topMoves = possibleMoves.slice(0, 3);
                    console.log('Computer top moves:', topMoves.map(m => ({
                        piece: `${m.piece.color} ${m.piece.type}`,
                        from: `${m.piece.position.x},${m.piece.position.y}`,
                        to: `${m.targetPosition.x},${m.targetPosition.y}`,
                        score: m.score.toFixed(2)
                    })));
                }
                
                // Add some randomness - don't always choose the best move
                // But more likely to choose better moves when in check
                const moveIndex = inCheck ? 
                    (Math.random() < 0.9 ? 0 : Math.floor(Math.random() * Math.min(2, possibleMoves.length))) :
                    (Math.random() < 0.7 ? 0 : Math.floor(Math.random() * Math.min(3, possibleMoves.length)));
                    
                const selectedMove = possibleMoves[moveIndex];
                
                // Store original position for move history
                const originalPosition = { ...selectedMove.piece.position };
                let capturedPiece = this.board.getPieceAt(selectedMove.targetPosition);
                
                // Record the move before making it
                this.recordMove(selectedMove.piece, originalPosition, selectedMove.targetPosition, capturedPiece);
                
                // Apply the move
                this.performComputerMove(selectedMove.piece, selectedMove.targetPosition);
            } else {
                console.log('No valid moves found for computer');
                // Check if this is a stalemate/checkmate scenario
                this.checkGameOver();
                this.isComputerThinking = false;
                return;
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
        
        // Check for game over conditions after computer's move
        this.checkGameOver();
    }
    
    evaluateMove(piece, targetPosition, inCheck) {
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
        
        // If in check, prioritize king safety
        if (inCheck && piece.type === 'king') {
            // Moving the king when in check is usually good
            score += 15;
            
            // Check if this move gets the king closer to the edge (safer)
            const edgeDistance = Math.min(
                targetPosition.x,
                targetPosition.y,
                7 - targetPosition.x,
                7 - targetPosition.y
            );
            if (edgeDistance === 0) {
                score -= 3; // Avoid the absolute edge
            } else {
                score += 1.5 / edgeDistance; // Prefer positions closer to edge, but not on it
            }
        }
        
        // If in check, prioritize moves that block or capture the checking piece
        if (inCheck && piece.type !== 'king') {
            // Simulate the move
            const originalPos = {...piece.position};
            piece.position = {...targetPosition};
            
            // If moving this piece would get out of check, it's very valuable
            const stillInCheck = this.isKingInCheck(piece.color);
            if (!stillInCheck) {
                score += 20; // Big bonus for getting out of check
            }
            
            // Restore position
            piece.position = originalPos;
        }
        
        // Avoid moving pieces that protect the king when in danger
        if (!inCheck && piece.type !== 'king') {
            // Simulate removing this piece
            const originalPos = {...piece.position};
            piece.position = {x: -1, y: -1}; // Move off-board temporarily
            
            // Check if removing this piece would put king in check
            const wouldExposeKing = this.isKingInCheck(piece.color);
            if (wouldExposeKing) {
                score -= 15; // Big penalty for exposing king
            }
            
            // Restore position
            piece.position = originalPos;
        }
        
        // Center control is valuable (especially for knights and bishops)
        const distanceToCenter = Math.abs(targetPosition.x - 3.5) + Math.abs(targetPosition.y - 3.5);
        score -= distanceToCenter; // Closer to center is better
        
        // Knights are more valuable in the center
        if (piece.type === 'knight') {
            score -= distanceToCenter * 0.5;
        }
        
        // Bishops like diagonals - check if they have open diagonals
        if (piece.type === 'bishop') {
            // Count available diagonal squares from target position
            let availableMoves = 0;
            const directions = [[-1,-1], [-1,1], [1,-1], [1,1]]; // Diagonal directions
            
            for (const [dx, dy] of directions) {
                let x = targetPosition.x + dx;
                let y = targetPosition.y + dy;
                
                while (x >= 0 && x < 8 && y >= 0 && y < 8) {
                    availableMoves++;
                    // Stop if there's a piece in the way
                    if (this.board.getPieceAt({x, y})) {
                        break;
                    }
                    x += dx;
                    y += dy;
                }
            }
            
            score += availableMoves * 0.2; // Bonus for bishop mobility
        }
        
        // Queens prefer positions with good mobility
        if (piece.type === 'queen') {
            // Check if the target position is protected
            const isProtected = this.isPieceProtected(targetPosition, piece.color);
            if (!isProtected) {
                score -= 5; // Penalty for moving queen to unprotected square
            }
        }
        
        // Pawns get bonus for advancing
        if (piece.type === 'pawn') {
            // Black pawns want to go down the board (increasing y)
            if (piece.color === 'black') {
                score += (targetPosition.y) * 0.5;
                
                // Bonus for pawns approaching promotion (last two ranks)
                if (targetPosition.y >= 6) {
                    score += 5;
                }
            }
            
            // Check if pawn move threatens opponent pieces
            const directions = piece.color === 'black' ? [[1, 1], [-1, 1]] : [[1, -1], [-1, -1]];
            for (const [dx, dy] of directions) {
                const x = targetPosition.x + dx;
                const y = targetPosition.y + dy;
                
                if (x >= 0 && x < 8 && y >= 0 && y < 8) {
                    const threatTarget = this.board.getPieceAt({x, y});
                    if (threatTarget && threatTarget.color !== piece.color) {
                        score += pieceValues[threatTarget.type] * 0.5; // Half value for threatening
                    }
                }
            }
        }
        
        // Kings should avoid the center in early/mid game
        if (piece.type === 'king' && !this.isEndgame()) {
            score += distanceToCenter * 0.5; // Further from center is better for king safety
        }
        
        // Add some randomness to make the AI less predictable
        score += Math.random() * 0.5;
        
        return score;
    }
    
    // Helper method to determine if we're in endgame
    isEndgame() {
        // Consider it endgame if both sides have <= 12 points of material
        // or if either side has no queen
        const whitePieces = this.board.pieces.filter(p => p.color === 'white');
        const blackPieces = this.board.pieces.filter(p => p.color === 'black');
        
        const pieceValues = {'pawn': 1, 'knight': 3, 'bishop': 3, 'rook': 5, 'queen': 9};
        
        const whiteMaterial = whitePieces.reduce((sum, p) => sum + (pieceValues[p.type] || 0), 0);
        const blackMaterial = blackPieces.reduce((sum, p) => sum + (pieceValues[p.type] || 0), 0);
        
        const whiteHasQueen = whitePieces.some(p => p.type === 'queen');
        const blackHasQueen = blackPieces.some(p => p.type === 'queen');
        
        return (whiteMaterial <= 12 && blackMaterial <= 12) || !whiteHasQueen || !blackHasQueen;
    }
    
    // Check if a square is protected by any piece of the given color
    isPieceProtected(position, pieceColor) {
        const protectingPieces = this.board.pieces.filter(p => p.color === pieceColor);
        
        for (const protector of protectingPieces) {
            // Skip position check if it's the piece itself
            if (protector.position.x === position.x && protector.position.y === position.y) {
                continue;
            }
            
            // Check if this piece can move to the given position
            // This is a simplification - in real chess, pawns protect differently than they move
            if (protector.isValidMove(position, this.board)) {
                return true;
            }
        }
        
        return false;
    }
    
    // Record a move to the history
    recordMove(piece, fromPosition, toPosition, capturedPiece = null) {
        this.moveHistory.push({
            piece: {
                type: piece.type,
                color: piece.color,
                hasMoved: piece.hasMoved,
                position: { ...fromPosition }
            },
            fromPosition: { ...fromPosition },
            toPosition: { ...toPosition },
            capturedPiece: capturedPiece ? {
                type: capturedPiece.type,
                color: capturedPiece.color,
                position: { ...capturedPiece.position },
                hasMoved: capturedPiece.hasMoved
            } : null,
            previousPlayer: this.currentPlayer,
            enPassantPosition: this.board.lastEnPassantPosition ? { ...this.board.lastEnPassantPosition } : null
        });
    }
    
    // Undo the last move
    undoLastMove() {
        if (this.gameOver) {
            // If game was over, resume play
            this.gameOver = false;
        }
        
        // If it's the computer's turn, undo both the player's and computer's last moves
        if (this.gameMode === 'computer' && this.currentPlayer === this.computerColor) {
            this.undoSingleMove(); // Undo computer's move
            this.undoSingleMove(); // Undo player's move
            return;
        }
        
        // For two-player mode, just undo the last move
        this.undoSingleMove();
    }
    
    // Undo a single move from history
    undoSingleMove() {
        if (this.moveHistory.length === 0) {
            console.log("No moves to undo");
            return;
        }
        
        // Get the last move from history
        const lastMove = this.moveHistory.pop();
        
        // Find the piece that moved
        const movedPiece = this.board.getPieceAt(lastMove.toPosition);
        
        if (!movedPiece) {
            console.error("Could not find piece to undo move");
            return;
        }
        
        // Reset the piece's state
        movedPiece.hasMoved = lastMove.piece.hasMoved;
        
        // Move the piece back to its original position
        this.board.movePiece(movedPiece, lastMove.fromPosition);
        
        // If a piece was captured, restore it
        if (lastMove.capturedPiece) {
            // Create and add back the captured piece
            this.board.addPiece(
                lastMove.capturedPiece.type,
                lastMove.capturedPiece.color,
                lastMove.capturedPiece.position
            ).then(restoredPiece => {
                if (restoredPiece) {
                    restoredPiece.hasMoved = lastMove.capturedPiece.hasMoved;
                    
                    // Remove the piece from captured pieces list
                    const capturedIndex = this.capturedPieces.findIndex(
                        p => p.type === lastMove.capturedPiece.type && 
                             p.color === lastMove.capturedPiece.color
                    );
                    
                    if (capturedIndex !== -1) {
                        this.capturedPieces.splice(capturedIndex, 1);
                    }
                    
                    // Update display
                    this.updateCapturedPieces();
                }
            });
        }
        
        // Restore en passant state if present
        this.board.lastEnPassantPosition = lastMove.enPassantPosition;
        
        // Switch back to previous player
        this.currentPlayer = lastMove.previousPlayer;
        
        // Update the game display
        this.updateStatus();
        
        // Reset selections
        if (this.selectedPiece) {
            this.selectedPiece.unhighlight();
            this.selectedPiece = null;
        }
        
        this.board.resetHighlights();
        console.log("Move undone successfully");
    }
}