class Board {
    constructor(scene) {
        this.scene = scene;
        this.boardGroup = new THREE.Group();
        this.squares = [];  // 2D array of board squares
        this.pieces = [];   // Array of all chess pieces
        this.validMoveSquares = []; // Track valid move positions
        
        // Create materials first
        this.createMaterials();
        
        // Create the board
        this.createBoard();
        
        // Add board to scene
        scene.add(this.boardGroup);
    }
    
    // Create the chess board with alternating colors
    createBoard() {
        // Create the base
        const baseGeometry = new THREE.BoxGeometry(9, 0.2, 9);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x5d4037,  // Dark brown
            roughness: 0.8
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = -0.1;  // Slightly below the squares
        this.boardGroup.add(base);
        
        // Create the border
        const borderGeometry = new THREE.BoxGeometry(10, 0.4, 10);
        const borderMaterial = new THREE.MeshStandardMaterial({
            color: 0x3e2723,  // Darker brown
            roughness: 0.9
        });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.y = -0.2;  // Below the base
        this.boardGroup.add(border);
        
        // Create the squares (8x8)
        this.squares = new Array(8).fill().map(() => new Array(8));
        
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                // Alternating colors: light for (even x + even y) or (odd x + odd y), dark otherwise
                const isLight = (x + y) % 2 === 0;
                const color = isLight ? 0xf5f5f5 : 0x222222;  // Light gray or much darker gray (changed from 0x757575)
                
                const geometry = new THREE.BoxGeometry(1, 0.1, 1);
                const material = new THREE.MeshStandardMaterial({
                    color: color,
                    roughness: 0.5
                });
                
                const square = new THREE.Mesh(geometry, material);
                
                // Position from (-3.5, 0, -3.5) to (3.5, 0, 3.5)
                square.position.set(
                    x - 3.5,
                    0,
                    y - 3.5
                );
                
                this.squares[x][y] = {
                    mesh: square,
                    position: { x, y },
                    isLight: isLight
                };
                
                this.boardGroup.add(square);
            }
        }
        
        // Add row numbers (1-8) and column letters (a-h)
        this.addBoardCoordinates();
    }
    
    // Add column letters (a-h) and row numbers (1-8) to the board
    addBoardCoordinates() {
        // Use simple meshes initially
        this.createCoordinatesWithShapes();
        
        // Try to load the font for better-looking text
        try {
            const fontLoader = new THREE.FontLoader();
            
            // Load a font for the coordinates
            fontLoader.load(
                'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_regular.typeface.json',
                (font) => {
                    // Remove the previous simple shapes
                    this.boardGroup.children.forEach(child => {
                        if (child.userData && child.userData.isCoordinate) {
                            this.boardGroup.remove(child);
                        }
                    });
                    
                    // Create better-looking text coordinates
                    this.createCoordinatesWithFont(font);
                },
                // onProgress callback
                (xhr) => {
                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                },
                // onError callback
                (err) => {
                    console.error('Failed to load font:', err);
                    // Font loading failed, keep the simple shapes
                }
            );
        } catch (error) {
            console.error('Error during font loading setup:', error);
        }
    }
    
    // Create board coordinates with simple shapes if font isn't available
    createCoordinatesWithShapes() {
        // Define colors for coordinates
        const lightCoordinateColor = 0xD4AF37; // Gold color for coordinates on dark squares
        const darkCoordinateColor = 0x8B4513;  // SaddleBrown for coordinates on light squares
        
        // Column letters (a-h) at the bottom and top of the board
        for (let x = 0; x < 8; x++) {
            const isLightSquare = x % 2 === 0;
            const letterMaterial = new THREE.MeshStandardMaterial({ 
                color: isLightSquare ? darkCoordinateColor : lightCoordinateColor,
                metalness: 0.5,
                roughness: 0.4,
                emissive: 0x222222,
                emissiveIntensity: 0.2
            });
            
            const labelGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.3);
            const label = new THREE.Mesh(labelGeometry, letterMaterial);
            
            // Mark this as a coordinate for potential cleanup
            label.userData.isCoordinate = true;
            
            // Position at bottom row - raised slightly for better visibility
            label.position.set(x - 3.5, 0.1, -4.3);
            this.boardGroup.add(label);
            
            // Position at top row
            const labelTop = label.clone();
            labelTop.userData.isCoordinate = true;
            labelTop.position.set(x - 3.5, 0.1, 4.3);
            this.boardGroup.add(labelTop);
        }
        
        // Row numbers (1-8) at the left and right of the board
        for (let y = 0; y < 8; y++) {
            const isLightSquare = y % 2 !== 0;
            const numberMaterial = new THREE.MeshStandardMaterial({ 
                color: isLightSquare ? darkCoordinateColor : lightCoordinateColor,
                metalness: 0.5,
                roughness: 0.4,
                emissive: 0x222222,
                emissiveIntensity: 0.2
            });
            
            const labelGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.3);
            const label = new THREE.Mesh(labelGeometry, numberMaterial);
            
            // Mark this as a coordinate for potential cleanup
            label.userData.isCoordinate = true;
            
            // Position at left column - moved slightly outward for better visibility
            label.position.set(-4.3, 0.1, y - 3.5);
            this.boardGroup.add(label);
            
            // Position at right column
            const labelRight = label.clone();
            labelRight.userData.isCoordinate = true;
            labelRight.position.set(4.3, 0.1, y - 3.5);
            this.boardGroup.add(labelRight);
        }
    }
    
    // Create board coordinates with proper text using loaded font
    createCoordinatesWithFont(font) {
        // Define colors for coordinates
        const lightCoordinateColor = 0xD4AF37; // Gold color for coordinates on dark squares
        const darkCoordinateColor = 0x8B4513;  // SaddleBrown for coordinates on light squares
        
        // Column letters (a-h) at the bottom and top of the board
        for (let x = 0; x < 8; x++) {
            const letter = String.fromCharCode(97 + x); // 97 is ASCII 'a'
            const isLightSquare = x % 2 === 0;
            
            // Create text geometry for the letter
            const textOptions = {
                font: font,
                size: 0.4,
                height: 0.05,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.01,
                bevelSize: 0.01,
                bevelOffset: 0,
                bevelSegments: 3
            };
            
            const textGeometry = new THREE.TextGeometry(letter, textOptions);
            textGeometry.computeBoundingBox();
            
            // Calculate width for proper centering
            const width = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
            
            // Create material with appropriate color based on square color
            const letterMaterial = new THREE.MeshStandardMaterial({
                color: isLightSquare ? darkCoordinateColor : lightCoordinateColor,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x222222,
                emissiveIntensity: 0.2
            });
            
            // Create text mesh for bottom row
            const textMesh = new THREE.Mesh(textGeometry, letterMaterial);
            textMesh.userData.isCoordinate = true;
            
            // Position at bottom row with centering - moved outward and raised
            textMesh.position.set(x - 3.5 - width/2, 0.1, -4.3);
            textMesh.rotation.x = -Math.PI / 2; // Flat on the board, facing up
            this.boardGroup.add(textMesh);
            
            // Create another for the top row
            const textMeshTop = textMesh.clone();
            textMeshTop.userData.isCoordinate = true;
            textMeshTop.position.set(x - 3.5 - width/2, 0.1, 4.3);
            this.boardGroup.add(textMeshTop);
        }
        
        // Row numbers (1-8) at the left and right of the board
        for (let y = 0; y < 8; y++) {
            // Chess notation: 1-8 from bottom to top
            const number = (y + 1).toString();
            const isLightSquare = y % 2 !== 0;
            
            // Create text geometry for the number
            const textOptions = {
                font: font,
                size: 0.4,
                height: 0.05,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.01,
                bevelSize: 0.01,
                bevelOffset: 0,
                bevelSegments: 3
            };
            
            const textGeometry = new THREE.TextGeometry(number, textOptions);
            textGeometry.computeBoundingBox();
            
            // Calculate width for proper centering
            const width = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
            
            // Create material with appropriate color based on square color
            const numberMaterial = new THREE.MeshStandardMaterial({
                color: isLightSquare ? darkCoordinateColor : lightCoordinateColor,
                metalness: 0.7,
                roughness: 0.3,
                emissive: 0x222222,
                emissiveIntensity: 0.2
            });
            
            // Create text mesh for left side
            const textMesh = new THREE.Mesh(textGeometry, numberMaterial);
            textMesh.userData.isCoordinate = true;
            
            // Position at left column with centering
            textMesh.position.set(-4.3 - width/2, 0.1, y - 3.5);
            textMesh.rotation.x = -Math.PI / 2; // Flat on the board, facing up
            this.boardGroup.add(textMesh);
            
            // Create another for the right side
            const textMeshRight = textMesh.clone();
            textMeshRight.userData.isCoordinate = true;
            textMeshRight.position.set(4.3 - width/2, 0.1, y - 3.5);
            this.boardGroup.add(textMeshRight);
        }
        
        // Add additional lighting to make coordinates stand out
        const coordLight = new THREE.PointLight(0xffffff, 0.5);
        coordLight.position.set(0, 2, 0);
        coordLight.userData.isCoordinate = true;
        this.boardGroup.add(coordLight);
    }
    
    // Initialize the pieces in their starting positions
    initializePieces() {
        this.pieces = [];
        
        // Create pawns
        for (let x = 0; x < 8; x++) {
            this.addPiece('pawn', 'white', { x, y: 1 });
            this.addPiece('pawn', 'black', { x, y: 6 });
        }
        
        // Create rooks
        this.addPiece('rook', 'white', { x: 0, y: 0 });
        this.addPiece('rook', 'white', { x: 7, y: 0 });
        this.addPiece('rook', 'black', { x: 0, y: 7 });
        this.addPiece('rook', 'black', { x: 7, y: 7 });
        
        // Create knights
        this.addPiece('knight', 'white', { x: 1, y: 0 });
        this.addPiece('knight', 'white', { x: 6, y: 0 });
        this.addPiece('knight', 'black', { x: 1, y: 7 });
        this.addPiece('knight', 'black', { x: 6, y: 7 });
        
        // Create bishops
        this.addPiece('bishop', 'white', { x: 2, y: 0 });
        this.addPiece('bishop', 'white', { x: 5, y: 0 });
        this.addPiece('bishop', 'black', { x: 2, y: 7 });
        this.addPiece('bishop', 'black', { x: 5, y: 7 });
        
        // Create queens
        this.addPiece('queen', 'white', { x: 3, y: 0 });
        this.addPiece('queen', 'black', { x: 3, y: 7 });
        
        // Create kings
        this.addPiece('king', 'white', { x: 4, y: 0 });
        this.addPiece('king', 'black', { x: 4, y: 7 });
    }
    
    // Add a new chess piece to the board
    async addPiece(type, color, position) {
        const piece = new ChessPiece(type, color, position);
        await piece.loadModel(this.scene);
        this.pieces.push(piece);
        return piece;
    }
    
    // Get a piece at a specific position
    getPieceAt(position) {
        return this.pieces.find(piece => 
            piece.position.x === position.x && 
            piece.position.y === position.y
        );
    }
    
    // Remove a piece from the board
    removePiece(piece) {
        const index = this.pieces.indexOf(piece);
        if (index !== -1) {
            if (piece.mesh) {
                this.scene.remove(piece.mesh);
            }
            this.pieces.splice(index, 1);
        }
    }
    
    // Highlight valid moves for the selected piece
    highlightValidMoves(piece) {
        // Clear any existing highlights
        this.clearHighlights();
        
        if (!piece) return;
        
        // Loop through all board positions and check if move is valid
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                const newPos = { x, y };
                
                if (piece.isValidMove(newPos, this)) {
                    const targetPiece = this.getPieceAt(newPos);
                    const squareIndex = y * 8 + x;
                    
                    if (targetPiece) {
                        // Highlight the piece that can be captured
                        targetPiece.highlightAsTarget();
                        
                        // Also highlight the square beneath the target piece 
                        // with the captureHighlightMaterial
                        if (this.squares[squareIndex]) {
                            const square = this.squares[squareIndex];
                            square.userData.originalMaterial = square.material;
                            square.material = this.captureHighlightMaterial;
                            
                            // Add a subtle animation to make the highlight more noticeable
                            if (!square.userData.pulseAnimation) {
                                square.userData.pulseAnimation = true;
                                square.userData.originalY = square.position.y;
                                
                                // Create a subtle hover animation on the square
                                gsap.to(square.position, {
                                    y: 0.05, // Move slightly above the board
                                    duration: 0.8,
                                    repeat: -1,
                                    yoyo: true,
                                    ease: "sine.inOut"
                                });
                            }
                        }
                    } else {
                        // Highlight empty square as valid move
                        if (this.squares[squareIndex]) {
                            const square = this.squares[squareIndex];
                            square.userData.originalMaterial = square.material;
                            square.material = this.highlightMaterial;
                            
                            // Add subtle pulse animation to valid move squares
                            if (!square.userData.pulseAnimation) {
                                square.userData.pulseAnimation = true;
                                
                                // Create a subtle opacity pulse for empty valid move squares
                                gsap.to(square.material, {
                                    opacity: 0.6,
                                    duration: 0.8,
                                    repeat: -1,
                                    yoyo: true,
                                    ease: "sine.inOut"
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Reset all square highlights
    resetHighlights() {
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                const square = this.squares[x][y];
                
                // Reset to original color if stored
                if (square.mesh.userData.originalColor) {
                    square.mesh.material.color.copy(square.mesh.userData.originalColor);
                } else {
                    // Otherwise use the default light/dark colors
                    const color = square.isLight ? 0xf5f5f5 : 0x222222;  // Updated much darker black square color
                    square.mesh.material.color.set(color);
                }
                
                // Reset emissive properties
                square.mesh.material.emissive.set(0x000000);
                square.mesh.material.emissiveIntensity = 0;
            }
        }
    }
    
    // Move a piece to a new position
    movePiece(piece, newPosition) {
        piece.position = { ...newPosition };
        piece.hasMoved = true;
        piece.updatePosition();
    }
    
    // Handle square click event
    handleSquareClick(x, y, game) {
        const clickedPosition = { x, y };
        const clickedPiece = this.getPieceAt(clickedPosition);
        
        // If a piece is already selected
        if (game.selectedPiece) {
            // If clicking on the same piece, deselect it
            if (clickedPiece === game.selectedPiece) {
                game.selectedPiece.unhighlight();
                game.selectedPiece = null;
                this.resetHighlights();
                return;
            }
            
            // If clicking on a valid move position
            if (game.selectedPiece.isValidMove(clickedPosition, this)) {
                // If there's a piece at the target, capture it
                if (clickedPiece) {
                    if (clickedPiece.color !== game.selectedPiece.color) {
                        this.removePiece(clickedPiece);
                        game.capturedPieces.push(clickedPiece);
                    } else {
                        // Can't capture own piece
                        return;
                    }
                }
                
                // Move the selected piece
                this.movePiece(game.selectedPiece, clickedPosition);
                
                // Deselect the piece
                game.selectedPiece.unhighlight();
                game.selectedPiece = null;
                this.resetHighlights();
                
                // Switch turns
                game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';
                game.updateStatus();
                
                return;
            }
        }
        
        // If clicking on a new piece of the current player's color
        if (clickedPiece && clickedPiece.color === game.currentPlayer) {
            // Deselect previous piece if any
            if (game.selectedPiece) {
                game.selectedPiece.unhighlight();
                this.resetHighlights();
            }
            
            // Select the new piece
            game.selectedPiece = clickedPiece;
            clickedPiece.highlight();
            
            // Show valid moves
            this.highlightValidMoves(clickedPiece);
        }
    }
    
    // Create materials for the board squares
    createMaterials() {
        // White square material
        this.whiteMaterial = new THREE.MeshStandardMaterial({
            color: 0xf0f0f0,
            metalness: 0.1,
            roughness: 0.8
        });
        
        // Black square material (darker for better contrast)
        this.blackMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222, // Darker black for better contrast
            metalness: 0.1,
            roughness: 0.8
        });
        
        // Highlight material for valid moves - changed to green
        this.highlightMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00, // Bright green for better visibility
            metalness: 0.1,
            roughness: 0.5,
            transparent: true,
            opacity: 0.8,
            emissive: 0x00aa00, // Green glow effect
            emissiveIntensity: 0.5
        });
        
        // Highlight material for captures - also changed to green
        this.captureHighlightMaterial = new THREE.MeshStandardMaterial({
            color: 0x00cc00, // Dark green base for capture squares
            metalness: 0.2,
            roughness: 0.5,
            transparent: true,
            opacity: 0.8,
            emissive: 0x00aa00, // Green glow
            emissiveIntensity: 0.6
        });
    }

    // Remove all highlights from the board
    removeHighlights() {
        // Reset square highlights
        for (let x = 0; x < 8; x++) {
            for (let y = 0; y < 8; y++) {
                const square = this.squares[x][y];
                if (square && square.mesh) {
                    // Reset to original material based on square color
                    square.mesh.material = square.isLight ? this.whiteMaterial : this.blackMaterial;
                }
            }
        }
        
        // Reset any highlighted pieces (capturable pieces)
        this.pieces.forEach(piece => {
            if (piece.canBeCaptured) {
                piece.unhighlight();
            }
        });
        
        // Clear valid move tracking
        this.validMoveSquares = [];
    }
}