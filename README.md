# 3D Chess Game
A 3D chess game built with Three.js, featuring AI-powered gameplay and interactive animations. Play against a friend or challenge the computer in this visually immersive chess experience.

## Features
- **3D Chessboard**: Fully interactive chessboard rendered using Three.js.
- **AI Opponent**: Play against an AI with configurable difficulty.
- **Multiplayer Mode**: Play with a friend locally.
- **Undo Moves**: Undo your last move for strategic adjustments.
- **Game Modes**: Choose between playing with a friend or against the computer.
- **Animations**: Smooth animations for piece movements and visual effects for check/checkmate.
- **Responsive Design**: Works on various screen sizes.

## Installation
1. Clone the repository:
     git@github.com:ashirvad-bst/chess3D.git

## Technologies Used
- **Three.js**: For rendering the 3D chessboard and pieces.
- **GSAP**: For animations.
- **HTML/CSS/JavaScript**: Core web technologies for the game logic and UI.

  ## File Structure
index.html
css/
    style.css
js/
    Board.js
    ChessPiece.js
    Game.js
    main.js

- `index.html`: Entry point for the game.
- `css/style.css`: Styles for the game UI.
- `js/Board.js`: Logic for the chessboard.
- `js/ChessPiece.js`: Logic for individual chess pieces.
- `js/Game.js`: Main game logic, including AI and game state management.
- `js/main.js`: Initialization and event handling.

  ## How It Works
1. **Game Initialization**: The game initializes a 3D scene using Three.js and sets up the chessboard and pieces.
2. **Player Interaction**: Players can click on pieces to select and move them.
3. **AI Logic**: The AI evaluates possible moves and selects the best one based on heuristics.
4. **Game Rules**: The game enforces chess rules, including check, checkmate, and stalemate.
5. **Animations**: Smooth animations are applied to piece movements and special effects.

## Acknowledgments
- [Three.js](https://threejs.org/) for the 3D rendering library.
- [GSAP](https://greensock.com/gsap/) for animations.
- Chess enthusiasts for inspiring this project.

## Future Enhancements
- Add online multiplayer functionality.
- Implement difficulty levels for the AI.
- Add sound effects for moves and captures.
  
