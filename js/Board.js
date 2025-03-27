class Board {
    constructor(scene) {
        this.scene = scene;
        this.boardGroup = new THREE.Group();
        this.squares = [];  // 2D array of board squares
        this.pieces = [];   // Array of all chess pieces
        this.validMoveSquares = []; // Track valid move positions
        this.pathCubes = []; // Track path highlight meshes
        
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
        // Highlight the path before moving
        this.highlightPath(piece.position, newPosition);
        
        // Update the piece position
        piece.position = { ...newPosition };
        piece.hasMoved = true;
        
        // Animate the movement
        piece.updatePosition();
        
        // Clear the path highlight after a delay
        setTimeout(() => {
            this.clearPathHighlights();
        }, 2000);
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

        // Create path highlight materials - from dark to light green
        this.pathMaterials = [];
        const pathSteps = 10;
        for (let i = 0; i < pathSteps; i++) {
            // Calculate gradient color from dark green to light green
            const ratio = i / (pathSteps - 1);
            
            // Improved color transition from dark to light green
            const darkGreen = { r: 0, g: 60, b: 0 };    // Very dark green
            const lightGreen = { r: 100, g: 255, b: 100 }; // Light green
            
            // Interpolate between dark and light green
            const r = Math.floor(darkGreen.r + ratio * (lightGreen.r - darkGreen.r));
            const g = Math.floor(darkGreen.g + ratio * (lightGreen.g - darkGreen.g));
            const b = Math.floor(darkGreen.b + ratio * (lightGreen.b - darkGreen.b));
            
            const color = (r << 16) | (g << 8) | b;
            
            this.pathMaterials.push(new THREE.MeshStandardMaterial({
                color: color,
                metalness: 0.3,
                roughness: 0.4,
                transparent: true,
                opacity: 0.7 + (ratio * 0.3),
                emissive: color,
                emissiveIntensity: 0.3 + (ratio * 0.4)
            }));
        }
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

        // Remove path highlight cubes
        this.clearPathHighlights();
    }

    // Clear the path highlights
    clearPathHighlights() {
        while (this.pathCubes.length > 0) {
            const cube = this.pathCubes.pop();
            this.boardGroup.remove(cube);
            if (cube.geometry) cube.geometry.dispose();
            if (cube.material) cube.material.dispose();
        }
    }

    // Calculate a path between two points on the board
    calculatePath(startPos, endPos) {
        const path = [];
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        
        // Determine the number of steps based on the distance
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        
        if (steps === 0) return path; // No path if same position
        
        // Calculate intermediate points along the path
        for (let i = 1; i <= steps; i++) {
            const ratio = i / steps;
            const x = Math.round(startPos.x + dx * ratio);
            const y = Math.round(startPos.y + dy * ratio);
            
            // Add point to path if not the start or end positions
            if (x !== startPos.x || y !== startPos.y) {
                if (x >= 0 && x < 8 && y >= 0 && y < 8) {
                    path.push({ x, y });
                }
            }
        }
        
        return path;
    }

    // Highlight the path from start to end position
    highlightPath(startPos, endPos) {
        // Clear any existing path highlights
        this.clearPathHighlights();
        
        // Calculate the path
        const path = this.calculatePath(startPos, endPos);
        
        // No need to highlight if no path
        if (path.length === 0) return;
        
        // Create highlight objects along the path
        path.forEach((pos, index) => {
            // Calculate material index based on position in path
            // This ensures we use the full range of the gradient
            const materialIndex = Math.floor((index / path.length) * (this.pathMaterials.length - 1));
            const material = this.pathMaterials[materialIndex];
            
            // Create a more visually appealing path marker
            const geometry = new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16);
            const cube = new THREE.Mesh(geometry, material);
            
            // Position the cube above the board square
            cube.position.set(
                pos.x - 3.5, 
                0.05, // Just above the board
                pos.y - 3.5
            );
            
            // Add to scene and track
            this.boardGroup.add(cube);
            this.pathCubes.push(cube);
            
            // Add animation to make the highlight more noticeable
            gsap.to(cube.position, {
                y: 0.2 + (index * 0.03), // Higher for points farther along the path
                duration: 0.5,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                delay: 0.05 * index // Staggered animation
            });
            
            // Add scale animation to create a pulsing effect
            gsap.to(cube.scale, {
                x: 1.3,
                z: 1.3,
                duration: 0.7,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                delay: 0.05 * index // Staggered animation
            });
        });
        
        // Add a trail effect that connects the path
        this.addPathTrail(startPos, path, endPos);
    }
    
    // Add a connected trail along the path to create a more fluid visual
    addPathTrail(startPos, path, endPos) {
        const allPoints = [startPos, ...path, endPos];
        
        // Create a smooth curve connecting all points
        const curvePoints = allPoints.map(p => new THREE.Vector3(p.x - 3.5, 0.05, p.y - 3.5));
        const curve = new THREE.CatmullRomCurve3(curvePoints);
        
        // Create tube geometry along the curve
        const tubeGeometry = new THREE.TubeGeometry(curve, allPoints.length * 3, 0.08, 8, false);
        
        // Create a gradient shader material for the trail
        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        const fragmentShader = `
            uniform vec3 colorStart;
            uniform vec3 colorEnd;
            varying vec2 vUv;
            
            void main() {
                // Linear interpolation between start and end colors based on UV
                gl_FragColor = vec4(mix(colorStart, colorEnd, vUv.x), 0.5);
            }
        `;
        
        // Create shader material with dark to light green gradient
        const trailMaterial = new THREE.ShaderMaterial({
            uniforms: {
                colorStart: { value: new THREE.Color(0x003300) }, // Dark green
                colorEnd: { value: new THREE.Color(0x66ff66) }    // Light green
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        const tube = new THREE.Mesh(tubeGeometry, trailMaterial);
        
        this.boardGroup.add(tube);
        this.pathCubes.push(tube);
        
        // Add subtle glow animation to the trail
        gsap.to(tube.material, {
            opacity: 0.3,
            duration: 1.2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
        
        // Add start and end markers with special effects
        this.addPathEndpoints(startPos, endPos);
    }
    
    // Add special markers at the start and end of the path
    addPathEndpoints(startPos, endPos) {
        // Start marker - dark green
        const startGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const startMaterial = new THREE.MeshStandardMaterial({
            color: 0x003300,
            emissive: 0x002200,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.7
        });
        
        const startMarker = new THREE.Mesh(startGeometry, startMaterial);
        startMarker.position.set(startPos.x - 3.5, 0.1, startPos.y - 3.5);
        this.boardGroup.add(startMarker);
        this.pathCubes.push(startMarker);
        
        // End marker - light green
        const endGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const endMaterial = new THREE.MeshStandardMaterial({
            color: 0x66ff66,
            emissive: 0x33cc33,
            emissiveIntensity: 0.7,
            transparent: true,
            opacity: 0.8
        });
        
        const endMarker = new THREE.Mesh(endGeometry, endMaterial);
        endMarker.position.set(endPos.x - 3.5, 0.1, endPos.y - 3.5);
        this.boardGroup.add(endMarker);
        this.pathCubes.push(endMarker);
        
        // Add pulsing animation to both markers
        gsap.to(startMarker.scale, {
            x: 1.3, y: 1.3, z: 1.3,
            duration: 0.8,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
        
        gsap.to(endMarker.scale, {
            x: 1.3, y: 1.3, z: 1.3,
            duration: 0.8,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: 0.4
        });
    }
}