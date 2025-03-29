class ChessPiece {
    constructor(type, color, position) {
        this.type = type;        // pawn, rook, knight, bishop, queen, king
        this.color = color;      // white or black
        this.position = position; // {x: 0-7, y: 0-7}
        this.hasMoved = false;   // useful for castling and pawn's first move
        this.mesh = null;        // Three.js mesh
        this.selected = false;   // is the piece currently selected
        this.modelLoaded = false; // Flag to track if the model is loaded
        this.canBeCaptured = false; // Flag to track if this piece can be captured
        this.particleSystem = null; // For special effects on capturable pieces
        
        // Add en passant tracking
        this.movedTwoSquares = false; // Track if pawn just moved two squares (for en passant)
    }
    
    // Load 3D model for the piece
    async loadModel(scene) {
        try {
            // Create a group to hold the piece model
            this.mesh = new THREE.Group();
            
            // Use primitive geometry instead of loading 3D models
            this.loadPrimitiveGeometry(scene);
            
            // Position the mesh on the board
            const boardPosition = this.getBoardPosition();
            this.mesh.position.set(boardPosition.x, boardPosition.y, boardPosition.z);
            
            // Add to the scene
            scene.add(this.mesh);
            
            return this.mesh;
        } catch (error) {
            console.error(`Error loading model for ${this.color} ${this.type}:`, error);
            return this.mesh;
        }
    }
    
    // Load OBJ model
    async loadObjModel(modelPath, scene) {
        return new Promise((resolve, reject) => {
            // Check if OBJLoader is available
            if (typeof THREE.OBJLoader === 'undefined') {
                // If OBJLoader is not available, load it
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js';
                script.onload = () => this.performObjLoad(modelPath, scene, resolve, reject);
                script.onerror = () => {
                    console.error("Failed to load OBJLoader");
                    this.loadPrimitiveGeometry(scene);
                    resolve();
                };
                document.head.appendChild(script);
            } else {
                this.performObjLoad(modelPath, scene, resolve, reject);
            }
        });
    }
    
    // Actually perform OBJ loading
    performObjLoad(modelPath, scene, resolve, reject) {
        const loader = new THREE.OBJLoader();
        loader.load(
            modelPath,
            (object) => {
                // Apply material based on piece color
                object.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: this.color === 'white' ? 0xffffff : 0x222222,
                            metalness: 0.5,
                            roughness: 0.2
                        });
                    }
                });
                
                // Scale and position the model appropriately
                const scale = this.getModelScale();
                object.scale.set(scale, scale, scale);
                
                // Add to the piece mesh group
                this.mesh.add(object);
                this.modelLoaded = true;
                resolve();
            },
            (xhr) => {
                console.log(`${this.type} ${(xhr.loaded / xhr.total) * 100}% loaded`);
            },
            (error) => {
                console.error('Error loading OBJ model:', error);
                reject(error);
            }
        );
    }
    
    // Load GLTF/GLB model
    async loadGltfModel(modelPath, scene) {
        return new Promise((resolve, reject) => {
            // Check if GLTFLoader is available
            if (typeof THREE.GLTFLoader === 'undefined') {
                // If GLTFLoader is not available, load it
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
                script.onload = () => this.performGltfLoad(modelPath, scene, resolve, reject);
                script.onerror = () => {
                    console.error("Failed to load GLTFLoader");
                    this.loadPrimitiveGeometry(scene);
                    resolve();
                };
                document.head.appendChild(script);
            } else {
                this.performGltfLoad(modelPath, scene, resolve, reject);
            }
        });
    }
    
    // Actually perform GLTF loading
    performGltfLoad(modelPath, scene, resolve, reject) {
        const loader = new THREE.GLTFLoader();
        loader.load(
            modelPath,
            (gltf) => {
                const model = gltf.scene;
                
                // Apply material based on piece color
                model.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: this.color === 'white' ? 0xffffff : 0x222222,
                            metalness: 0.5,
                            roughness: 0.2
                        });
                    }
                });
                
                // Scale and position the model appropriately
                const scale = this.getModelScale();
                model.scale.set(scale, scale, scale);
                
                // Add to the piece mesh group
                this.mesh.add(model);
                this.modelLoaded = true;
                resolve();
            },
            (xhr) => {
                console.log(`${this.type} ${(xhr.loaded / xhr.total) * 100}% loaded`);
            },
            (error) => {
                console.error('Error loading GLTF model:', error);
                reject(error);
            }
        );
    }
    
    // Fallback to primitive geometry if model loading fails
    loadPrimitiveGeometry(scene) {
        console.log(`Creating geometric shape for ${this.color} ${this.type}`);
        
        // Use simpler THREE.BufferGeometry approach for all pieces
        let geometry;
        let material = new THREE.MeshStandardMaterial({
            color: this.color === 'white' ? 0xf0f0f0 : 0x121212, // Made black pieces darker
            metalness: 0.3,
            roughness: 0.4,
        });
        
        // Create appropriate geometry based on piece type
        switch(this.type) {
            case 'pawn':
                geometry = new THREE.CylinderBufferGeometry(0.25, 0.35, 0.8, 16);
                break;
                
            case 'rook':
                geometry = new THREE.BoxBufferGeometry(0.6, 1, 0.6);
                break;
                
            case 'knight':
                geometry = new THREE.CylinderBufferGeometry(0.3, 0.4, 0.9, 16);
                break;
                
            case 'bishop':
                geometry = new THREE.ConeBufferGeometry(0.4, 1.2, 16);
                break;
                
            case 'queen':
                geometry = new THREE.CylinderBufferGeometry(0.3, 0.5, 1.2, 16);
                break;
                
            case 'king':
                geometry = new THREE.CylinderBufferGeometry(0.3, 0.5, 1.4);
                break;
                
            default:
                geometry = new THREE.BoxBufferGeometry(0.5, 0.5, 0.5);
        }
        
        // Create mesh with the geometry and material
        const pieceMesh = new THREE.Mesh(geometry, material);
        
        // Add details for non-pawn pieces
        if (this.type !== 'pawn') {
            // Add small decoration on top
            let topGeometry;
            let topMesh;
            
            switch(this.type) {
                case 'rook':
                    // Add small battlements on top
                    topGeometry = new THREE.BoxBufferGeometry(0.8, 0.2, 0.8);
                    topMesh = new THREE.Mesh(topGeometry, material);
                    topMesh.position.y = 0.6;
                    pieceMesh.add(topMesh);
                    break;
                    
                case 'knight':
                    // Add head shape
                    topGeometry = new THREE.BoxBufferGeometry(0.4, 0.3, 0.7);
                    topMesh = new THREE.Mesh(topGeometry, material);
                    topMesh.position.set(0, 0.5, 0.2);
                    topMesh.rotation.x = Math.PI / 6; // Angle the head
                    pieceMesh.add(topMesh);
                    break;
                    
                case 'bishop':
                    // Add pointed top
                    topGeometry = new THREE.ConeBufferGeometry(0.2, 0.5, 16);
                    topMesh = new THREE.Mesh(topGeometry, material);
                    topMesh.position.y = 0.85;
                    pieceMesh.add(topMesh);
                    break;
                    
                case 'queen':
                    // Add crown
                    topGeometry = new THREE.SphereBufferGeometry(0.2, 16, 16);
                    topMesh = new THREE.Mesh(topGeometry, material);
                    topMesh.position.y = 0.8;
                    pieceMesh.add(topMesh);
                    break;
                    
                case 'king':
                    // Add cross
                    const verticalGeometry = new THREE.BoxBufferGeometry(0.1, 0.5, 0.1);
                    const verticalMesh = new THREE.Mesh(verticalGeometry, material);
                    verticalMesh.position.y = 1;
                    pieceMesh.add(verticalMesh);
                    
                    const horizontalGeometry = new THREE.BoxBufferGeometry(0.4, 0.1, 0.1);
                    const horizontalMesh = new THREE.Mesh(horizontalGeometry, material);
                    horizontalMesh.position.y = 0.9;
                    pieceMesh.add(horizontalMesh);
                    break;
            }
        }
        
        // Add to the main mesh group
        this.mesh.add(pieceMesh);
        
        // Mark as loaded
        this.modelLoaded = true;
    }
    
    // Get the path to the 3D model file
    getModelPath() {
        // Using online models from a CDN
        // For a real app, you'd host these files or use local files
        const baseUrl = "https://raw.githubusercontent.com/senx/warpstudio-templates/master/chess/models";
        
        switch(this.type) {
            case 'pawn':
                return `${baseUrl}/pawn.obj`;
            case 'rook':
                return `${baseUrl}/rook.obj`;
            case 'knight':
                return `${baseUrl}/knight.obj`;
            case 'bishop':
                return `${baseUrl}/bishop.obj`;
            case 'queen':
                return `${baseUrl}/queen.obj`;
            case 'king':
                return `${baseUrl}/king.obj`;
            default:
                return `${baseUrl}/pawn.obj`;
        }
    }
    
    // Get the appropriate scale for each model type
    getModelScale() {
        // Adjust scale based on piece type
        switch(this.type) {
            case 'pawn':
                return 0.2;
            case 'rook':
                return 0.2;
            case 'knight':
                return 0.2;
            case 'bishop':
                return 0.2;
            case 'queen':
                return 0.2;
            case 'king':
                return 0.2;
            default:
                return 0.2;
        }
    }
    
    // Get primitive geometry as a fallback - enhanced for better looking pieces
    getPrimitiveGeometry() {
        switch(this.type) {
            case 'pawn':
                return new THREE.CylinderGeometry(0.25, 0.35, 0.8, 16);
            
            case 'rook': {
                // Create a more complex rook shape
                const group = new THREE.Group();
                
                // Base
                const base = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 16);
                const baseMesh = new THREE.Mesh(base);
                group.add(baseMesh);
                
                // Top
                const top = new THREE.BoxGeometry(0.6, 0.4, 0.6);
                const topMesh = new THREE.Mesh(top);
                topMesh.position.y = 0.4;
                group.add(topMesh);
                
                // Battlements (the crenellations on top of the rook)
                for(let x = -1; x <= 1; x += 2) {
                    for(let z = -1; z <= 1; z += 2) {
                        const battlement = new THREE.BoxGeometry(0.15, 0.2, 0.15);
                        const battlementMesh = new THREE.Mesh(battlement);
                        battlementMesh.position.set(x * 0.2, 0.7, z * 0.2);
                        group.add(battlementMesh);
                    }
                }
                
                return group;
            }
            
            case 'knight': {
                // Create a more recognizable knight shape
                const group = new THREE.Group();
                
                // Base
                const base = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
                const baseMesh = new THREE.Mesh(base);
                group.add(baseMesh);
                
                // Body
                const body = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16);
                const bodyMesh = new THREE.Mesh(body);
                bodyMesh.position.y = 0.35;
                group.add(bodyMesh);
                
                // Head (angled to represent the knight's distinctive shape)
                const head = new THREE.BoxGeometry(0.3, 0.5, 0.6);
                const headMesh = new THREE.Mesh(head);
                headMesh.position.set(0, 0.7, 0.1);
                headMesh.rotation.x = Math.PI / 6; // Angle the head
                group.add(headMesh);
                
                return group;
            }
            
            case 'bishop': {
                // Create a more bishop-like shape with pointed top
                const group = new THREE.Group();
                
                // Base
                const base = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
                const baseMesh = new THREE.Mesh(base);
                group.add(baseMesh);
                
                // Body
                const body = new THREE.CylinderGeometry(0.3, 0.35, 0.5, 16);
                const bodyMesh = new THREE.Mesh(body);
                bodyMesh.position.y = 0.4;
                group.add(bodyMesh);
                
                // Top (cone shape for bishop's mitre)
                const top = new THREE.ConeGeometry(0.25, 0.6, 16);
                const topMesh = new THREE.Mesh(top);
                topMesh.position.y = 0.9;
                group.add(topMesh);
                
                return group;
            }
            
            case 'queen': {
                // Create a more queen-like shape with crown
                const group = new THREE.Group();
                
                // Base
                const base = new THREE.CylinderGeometry(0.4, 0.45, 0.3, 16);
                const baseMesh = new THREE.Mesh(base);
                group.add(baseMesh);
                
                // Body
                const body = new THREE.CylinderGeometry(0.35, 0.4, 0.6, 16);
                const bodyMesh = new THREE.Mesh(body);
                bodyMesh.position.y = 0.45;
                group.add(bodyMesh);
                
                // Crown base
                const crownBase = new THREE.CylinderGeometry(0.45, 0.35, 0.2, 16);
                const crownBaseMesh = new THREE.Mesh(crownBase);
                crownBaseMesh.position.y = 0.85;
                group.add(crownBaseMesh);
                
                // Crown points
                for(let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2;
                    const point = new THREE.ConeGeometry(0.08, 0.25, 8);
                    const pointMesh = new THREE.Mesh(point);
                    const radius = 0.25;
                    pointMesh.position.set(
                        radius * Math.cos(angle),
                        1.05,
                        radius * Math.sin(angle)
                    );
                    group.add(pointMesh);
                }
                
                return group;
            }
            
            case 'king': {
                // Create a more king-like shape with cross
                const group = new THREE.Group();
                
                // Base
                const base = new THREE.CylinderGeometry(0.45, 0.5, 0.3, 16);
                const baseMesh = new THREE.Mesh(base);
                group.add(baseMesh);
                
                // Body
                const body = new THREE.CylinderGeometry(0.4, 0.45, 0.7, 16);
                const bodyMesh = new THREE.Mesh(body);
                bodyMesh.position.y = 0.5;
                group.add(bodyMesh);
                
                // Crown base
                const crownBase = new THREE.CylinderGeometry(0.5, 0.4, 0.2, 16);
                const crownBaseMesh = new THREE.Mesh(crownBase);
                crownBaseMesh.position.y = 0.95;
                group.add(crownBaseMesh);
                
                // Cross vertical
                const crossVert = new THREE.BoxGeometry(0.1, 0.5, 0.1);
                const crossVertMesh = new THREE.Mesh(crossVert);
                crossVertMesh.position.y = 1.3;
                group.add(crossVertMesh);
                
                // Cross horizontal
                const crossHoriz = new THREE.BoxGeometry(0.35, 0.1, 0.1);
                const crossHorizMesh = new THREE.Mesh(crossHoriz);
                crossHorizMesh.position.y = 1.2;
                group.add(crossHorizMesh);
                
                return group;
            }
            
            default:
                return new THREE.BoxGeometry(0.5, 0.5, 0.5);
        }
    }
    
    // Convert chess board position (0-7, 0-7) to 3D coordinates
    getBoardPosition() {
        // Board is positioned from (-3.5, 0, -3.5) to (3.5, 0, 3.5)
        const x = this.position.x - 3.5;
        const z = this.position.y - 3.5; // y in chess coordinates is z in 3D space
        const y = 0.5; // Height above the board
        
        return { x, y, z };
    }
    
    // Update the 3D position when the chess position changes
    updatePosition() {
        if (!this.mesh) return;
        
        const boardPosition = this.getBoardPosition();
        // Animate movement
        gsap.to(this.mesh.position, {
            x: boardPosition.x,
            z: boardPosition.z,
            duration: 0.5,
            ease: "power2.out"
        });
    }
    
    // Check if move is valid according to chess rules
    isValidMove(newPosition, board) {
        // First check if the position is on the board
        if (newPosition.x < 0 || newPosition.x > 7 || newPosition.y < 0 || newPosition.y > 7) {
            return false;
        }

        // Check if the target position contains a piece of the same color
        const targetPiece = board.getPieceAt(newPosition);
        if (targetPiece && targetPiece.color === this.color) {
            return false; // Can't capture own piece
        }

        // Implementation depends on piece type
        switch(this.type) {
            case 'pawn':
                return this.isValidPawnMove(newPosition, board);
            case 'rook':
                return this.isValidRookMove(newPosition, board);
            case 'knight':
                return this.isValidKnightMove(newPosition, board);
            case 'bishop':
                return this.isValidBishopMove(newPosition, board);
            case 'queen':
                return this.isValidQueenMove(newPosition, board);
            case 'king':
                return this.isValidKingMove(newPosition, board);
            default:
                return false;
        }
    }
    
    isValidPawnMove(newPosition, board) {
        const dx = newPosition.x - this.position.x;
        const dy = newPosition.y - this.position.y;
        
        // Direction depends on color
        // White pawns move up the board (decreasing y: 7→0)
        // Black pawns move down the board (increasing y: 0→7)
        const direction = this.color === 'white' ? -1 : 1;
        
        // Target piece at new position
        const targetPiece = board.getPieceAt(newPosition);
        
        // Regular move: 1 square forward
        if (dx === 0 && dy === direction) {
            return !targetPiece; // Must be empty
        }
        
        // First move: option to move 2 squares
        if (dx === 0 && dy === 2 * direction && !this.hasMoved) {
            const intermediatePos = {x: this.position.x, y: this.position.y + direction};
            return !board.getPieceAt(intermediatePos) && !targetPiece;
        }
        
        // Normal capture: diagonal move
        if (Math.abs(dx) === 1 && dy === direction) {
            if (targetPiece && targetPiece.color !== this.color) {
                return true; // Normal diagonal capture
            }
            
            // En passant capture - check if this move matches the lastEnPassantPosition
            if (board.lastEnPassantPosition && 
                newPosition.x === board.lastEnPassantPosition.x && 
                newPosition.y === board.lastEnPassantPosition.y) {
                
                // En passant is a special move where the pawn moves diagonally to an empty square
                // The captured pawn is on the same rank as the capturing pawn but on the target file
                return !targetPiece; // Square must be empty for en passant
            }
        }
        
        return false;
    }
    
    isValidRookMove(newPosition, board) {
        const dx = newPosition.x - this.position.x;
        const dy = newPosition.y - this.position.y;
        
        // Rook can only move horizontally or vertically
        if (dx !== 0 && dy !== 0) {
            return false;
        }
        
        // Check for pieces in the path
        if (dx === 0) {
            // Vertical movement
            const step = dy > 0 ? 1 : -1;
            for (let y = this.position.y + step; y !== newPosition.y; y += step) {
                if (board.getPieceAt({x: this.position.x, y})) {
                    return false; // Path is blocked
                }
            }
        } else {
            // Horizontal movement
            const step = dx > 0 ? 1 : -1;
            for (let x = this.position.x + step; x !== newPosition.x; x += step) {
                if (board.getPieceAt({x, y: this.position.y})) {
                    return false; // Path is blocked
                }
            }
        }
        
        return true;
    }
    
    isValidKnightMove(newPosition, board) {
        const dx = Math.abs(newPosition.x - this.position.x);
        const dy = Math.abs(newPosition.y - this.position.y);
        
        // Knight moves in an L-shape: 2 squares in one dimension and 1 in the other
        return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
    }
    
    isValidBishopMove(newPosition, board) {
        const dx = newPosition.x - this.position.x;
        const dy = newPosition.y - this.position.y;
        
        // Bishop can only move diagonally
        if (Math.abs(dx) !== Math.abs(dy)) {
            return false;
        }
        
        // Check for pieces in the path
        const stepX = dx > 0 ? 1 : -1;
        const stepY = dy > 0 ? 1 : -1;
        
        let x = this.position.x + stepX;
        let y = this.position.y + stepY;
        
        while (x !== newPosition.x && y !== newPosition.y) {
            if (board.getPieceAt({x, y})) {
                return false; // Path is blocked
            }
            x += stepX;
            y += stepY;
        }
        
        return true;
    }
    
    isValidQueenMove(newPosition, board) {
        // Queen combines rook and bishop moves
        // It can move horizontally, vertically, or diagonally
        const dx = newPosition.x - this.position.x;
        const dy = newPosition.y - this.position.y;
        
        // Moving like a rook (horizontally or vertically)
        if (dx === 0 || dy === 0) {
            return this.isValidRookMove(newPosition, board);
        }
        
        // Moving like a bishop (diagonally)
        if (Math.abs(dx) === Math.abs(dy)) {
            return this.isValidBishopMove(newPosition, board);
        }
        
        return false;
    }
    
    isValidKingMove(newPosition, board) {
        const dx = Math.abs(newPosition.x - this.position.x);
        const dy = Math.abs(newPosition.y - this.position.y);
        
        // King moves one square in any direction
        if (dx <= 1 && dy <= 1) {
            return true;
        }
        
        // Check for castling
        if (!this.hasMoved && dy === 0 && Math.abs(dx) === 2) {
            // Determine which rook to use (kingside or queenside)
            const rookX = dx > 0 ? 7 : 0;
            const rookY = this.position.y;
            
            // Find the rook
            const rook = board.pieces.find(
                piece => piece.type === 'rook' && 
                         piece.color === this.color && 
                         piece.position.x === rookX && 
                         piece.position.y === rookY &&
                         !piece.hasMoved
            );
            
            if (!rook) {
                return false; // No valid rook for castling
            }
            
            // Check if path between king and rook is clear
            const pathStart = Math.min(this.position.x, rookX) + 1;
            const pathEnd = Math.max(this.position.x, rookX);
            
            for (let x = pathStart; x < pathEnd; x++) {
                if (board.getPieceAt({x, y: this.position.y})) {
                    return false; // Path is not clear
                }
            }
            
            // TODO: Check if king is in check or if path passes through check
            // This would require implementing check detection
            
            return true;
        }
        
        return false;
    }
    
    // Highlight the piece when selected
    highlight() {
        if (!this.mesh) return;
        
        this.selected = true;
        // Apply highlight to all child meshes
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
                child.material.emissive = new THREE.Color(0x00ff00); // Bright green to match board highlights
                child.material.emissiveIntensity = 0.7; // Increased intensity
                
                // Add subtle animation for selected piece
                if (!child.userData.selectionAnimation) {
                    child.userData.selectionAnimation = true;
                    child.userData.originalY = child.position.y;
                    
                    // Create hover effect for the selected piece
                    gsap.to(child.position, {
                        y: child.position.y + 0.1, // Slight hover
                        duration: 0.8,
                        repeat: -1,
                        yoyo: true,
                        ease: "sine.inOut"
                    });
                    
                    // Create glowing pulse effect
                    gsap.to(child.material, {
                        emissiveIntensity: 0.4,
                        duration: 0.8, 
                        repeat: -1,
                        yoyo: true,
                        ease: "sine.inOut"
                    });
                }
            }
        });
    }
    
    // Highlight piece as a capture target
    highlightAsTarget() {
        if (!this.mesh) return;
        
        // Set flag for being targetable
        this.canBeCaptured = true;
        
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
                // Store original position for animation
                if (child.userData.originalY === undefined) {
                    child.userData.originalY = child.position.y;
                }
                
                // Keep original piece color, just increase emissive intensity for highlight
                // Don't change the material color to green
                child.material.emissiveIntensity = 1.2;
                
                // Add pulse animation to make it more noticeable
                if (!child.userData.pulseAnimation) {
                    child.userData.pulseAnimation = true;
                    
                    // Pulsing glow effect
                    gsap.to(child.material, {
                        emissiveIntensity: 0.6,
                        duration: 0.8,
                        repeat: -1,
                        yoyo: true,
                        ease: "sine.inOut"
                    });
                    
                    // Subtle hover animation
                    gsap.to(child.position, {
                        y: child.userData.originalY + 0.15, // Lift slightly
                        duration: 1.2,
                        repeat: -1,
                        yoyo: true,
                        ease: "sine.inOut"
                    });
                    
                    // Optional slight rotation for even more visibility
                    gsap.to(this.mesh.rotation, {
                        y: this.mesh.rotation.y + 0.2,
                        duration: 1.5,
                        repeat: -1,
                        yoyo: true,
                        ease: "sine.inOut"
                    });
                }
            }
        });
    }
    
    // Create a glowing ring around capturable pieces
    createTargetRing() {
        // Remove existing particle system if any
        if (this.particleSystem) {
            this.mesh.remove(this.particleSystem);
            this.particleSystem = null;
        }
        
        // Create a ring geometry
        const ringGeometry = new THREE.RingGeometry(0.6, 0.7, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: this.color === 'white' ? 0xffcc00 : 0xff0000, // Yellow for white pieces, red for black
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2; // Lay flat
        ring.position.y = 0.05; // Slightly above the board
        
        // Add the ring to the mesh
        this.mesh.add(ring);
        
        // Store reference to remove later
        this.particleSystem = ring;
        
        // Animate the ring
        gsap.to(ring.scale, {
            x: 1.2,
            y: 1.2,
            z: 1.2,
            duration: 1,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
        
        gsap.to(ringMaterial, {
            opacity: 0.3,
            duration: 1.2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }
    
    // Remove all highlights from the piece
    unhighlight() {
        if (!this.mesh) return;
        
        // Reset capture target flag
        this.canBeCaptured = false;
        
        // Remove particle system if it exists
        if (this.particleSystem) {
            // Kill any GSAP animations on the particle system
            gsap.killTweensOf(this.particleSystem.scale);
            gsap.killTweensOf(this.particleSystem.material);
            
            // Remove from mesh
            this.mesh.remove(this.particleSystem);
            this.particleSystem = null;
        }
        
        // Clear all animations and visual effects
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
                // Reset emissive properties
                child.material.emissive = new THREE.Color(0x000000);
                child.material.emissiveIntensity = 0;
                
                // Kill any GSAP animations on this object
                gsap.killTweensOf(child.material);
                gsap.killTweensOf(child.position);
                
                // Restore original position if it was stored
                if (child.userData.originalY !== undefined) {
                    gsap.to(child.position, {
                        y: child.userData.originalY,
                        duration: 0.3,
                        ease: "power2.out"
                    });
                }
            }
        });
        
        // Reset any rotation animations on the entire piece
        gsap.killTweensOf(this.mesh.rotation);
        gsap.to(this.mesh.rotation, {
            y: this.mesh.rotation.y % (Math.PI * 2), // Normalize rotation
            duration: 0.3,
            ease: "power2.out"
        });
        
        // Clear possible states
        this.isSelected = false;
        this.isActive = false;
    }
}