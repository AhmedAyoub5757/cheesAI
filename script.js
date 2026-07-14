const boardElement = document.getElementById('board');
const turnIndicator = document.getElementById('turn-indicator');
const resetBtn = document.getElementById('reset-btn');

// --- GAME CONFIGURATION ---
const BOARD_SIZE = 10; 
const PIECE_ROWS = 3;  

let gameState = {
    board: [], 
    turn: 'white', 
    selectedPiece: null, 
    validMoves: [] 
};

initGame();
resetBtn.addEventListener('click', initGame);

function initGame() {
    gameState.board = createInitialBoard();
    gameState.turn = 'white';
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    turnIndicator.textContent = "Your Turn (White)";
    
    boardElement.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;
    boardElement.style.gridTemplateRows = `repeat(${BOARD_SIZE}, 1fr)`;
    
    renderBoard();
}

function createInitialBoard() {
    let board = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        let row = [];
        for (let c = 0; c < BOARD_SIZE; c++) {
            if ((r + c) % 2 === 1) {
                if (r < PIECE_ROWS) {
                    row.push(-1); // Black piece
                } else if (r >= BOARD_SIZE - PIECE_ROWS) {
                    row.push(1);  // White piece
                } else {
                    row.push(0);  
                }
            } else {
                row.push(null); 
            }
        }
        board.push(row);
    }
    return board;
}

function renderBoard() {
    boardElement.innerHTML = '';
    
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.dataset.row = r;
            square.dataset.col = c;

            if ((r + c) % 2 === 1) {
                square.classList.add('dark');
                
                const pieceValue = gameState.board[r][c];
                if (pieceValue !== null && pieceValue !== 0) {
                    const piece = document.createElement('div');
                    piece.classList.add('piece');
                    
                    // Assign colors and King crowns
                    if (Math.abs(pieceValue) === 1) {
                        piece.classList.add(pieceValue > 0 ? 'white' : 'black');
                    } else if (Math.abs(pieceValue) === 2) {
                        piece.classList.add(pieceValue > 0 ? 'white' : 'black');
                        piece.classList.add('king');
                    }
                    
                    if (gameState.selectedPiece && gameState.selectedPiece.r === r && gameState.selectedPiece.c === c) {
                        piece.classList.add('selected');
                    }
                    
                    square.appendChild(piece);
                }

                const isHint = gameState.validMoves.some(m => m.r === r && m.c === c);
                if (isHint) {
                    square.classList.add('highlight');
                }

                square.addEventListener('click', () => handleSquareClick(r, c));
            } else {
                square.classList.add('light');
            }

            boardElement.appendChild(square);
        }
    }
}

function handleSquareClick(r, c) {
    if (gameState.turn !== 'white') return;

    const clickedValue = gameState.board[r][c];

    // Select Player's own piece (positive numbers 1 and 2 are White)
    if (clickedValue > 0) {
        gameState.selectedPiece = { r, c };
        gameState.validMoves = getLegalMoves(r, c, gameState.board);
        renderBoard();
        return;
    }

    const destinationMove = gameState.validMoves.find(m => m.r === r && m.c === c);
    if (destinationMove) {
        executeMove(gameState.selectedPiece, destinationMove);
        return;
    }

    gameState.selectedPiece = null;
    gameState.validMoves = [];
    renderBoard();
}

// Check moves for any board state (helps AI evaluate options)
function getLegalMoves(r, c, board) {
    const moves = [];
    const piece = board[r][c];
    if (piece === 0 || piece === null) return [];

    const isKing = Math.abs(piece) === 2;
    // Standard direction: White goes up (-1), Black goes down (+1)
    const directions = [];
    if (piece > 0) { // White
        directions.push(-1);
        if (isKing) directions.push(1); // Kings also move backward
    } else { // Black
        directions.push(1);
        if (isKing) directions.push(-1); 
    }

    directions.forEach(dir => {
        const targetRow = r + dir;
        const targetCols = [c - 1, c + 1];

        targetCols.forEach(targetCol => {
            if (targetRow >= 0 && targetRow < BOARD_SIZE && targetCol >= 0 && targetCol < BOARD_SIZE) {
                const adjacentSpace = board[targetRow][targetCol];
                
                if (adjacentSpace === 0) {
                    moves.push({ r: targetRow, c: targetCol, isJump: false });
                } 
                // Opponent checker found? (different sign)
                else if (adjacentSpace !== null && (adjacentSpace * piece < 0)) {
                    const jumpRow = targetRow + dir;
                    const jumpCol = targetCol + (targetCol - c);
                    
                    if (jumpRow >= 0 && jumpRow < BOARD_SIZE && jumpCol >= 0 && jumpCol < BOARD_SIZE) {
                        if (board[jumpRow][jumpCol] === 0) {
                            moves.push({ 
                                r: jumpRow, 
                                c: jumpCol, 
                                isJump: true, 
                                captured: { r: targetRow, c: targetCol } 
                            });
                        }
                    }
                }
            }
        });
    });

    return moves;
}

function executeMove(from, to) {
    let piece = gameState.board[from.r][from.c];
    
    // King Promotion check
    if (piece === 1 && to.r === 0) {
        piece = 2; // White crowned
    } else if (piece === -1 && to.r === BOARD_SIZE - 1) {
        piece = -2; // Black crowned
    }

    gameState.board[to.r][to.c] = piece;
    gameState.board[from.r][from.c] = 0;

    if (to.isJump && to.captured) {
        gameState.board[to.captured.r][to.captured.c] = 0;
    }

    gameState.selectedPiece = null;
    gameState.validMoves = [];
    
    // Check win condition
    if (checkGameOver()) return;

    gameState.turn = 'black';
    turnIndicator.textContent = "AI is thinking...";
    renderBoard();

    setTimeout(makeAIMove, 800);
}

// Tactical AI Logic
function makeAIMove() {
    let jumpMoves = [];
    let normalMoves = [];

    // Find all possible AI moves
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (gameState.board[r][c] < 0) { // Black piece
                const moves = getLegalMoves(r, c, gameState.board);
                moves.forEach(m => {
                    const moveDetails = { from: { r, c }, to: m };
                    if (m.isJump) {
                        jumpMoves.push(moveDetails);
                    } else {
                        normalMoves.push(moveDetails);
                    }
                });
            }
        }
    }

    // AI Turn Decisions
    let chosenMove = null;
    if (jumpMoves.length > 0) {
        // 1. Force/Prioritize capturing the player's piece!
        chosenMove = jumpMoves[Math.floor(Math.random() * jumpMoves.length)];
    } else if (normalMoves.length > 0) {
        // 2. Otherwise, make a random safe move
        chosenMove = normalMoves[Math.floor(Math.random() * normalMoves.length)];
    }

    if (chosenMove) {
        executeAIMove(chosenMove.from, chosenMove.to);
    } else {
        // AI has no moves left
        announceWinner("You Win! AI is blocked.");
    }
}

function executeAIMove(from, to) {
    let piece = gameState.board[from.r][from.c];
    
    if (piece === -1 && to.r === BOARD_SIZE - 1) {
        piece = -2; // Promoted to AI King
    }

    gameState.board[to.r][to.c] = piece;
    gameState.board[from.r][from.c] = 0;

    if (to.isJump && to.captured) {
        gameState.board[to.captured.r][to.captured.c] = 0;
    }

    if (checkGameOver()) return;

    gameState.turn = 'white';
    turnIndicator.textContent = "Your Turn (White)";
    renderBoard();
}

function checkGameOver() {
    let whiteCount = 0;
    let blackCount = 0;

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (gameState.board[r][c] > 0) whiteCount++;
            if (gameState.board[r][c] < 0) blackCount++;
        }
    }

    if (whiteCount === 0) {
        announceWinner("AI (Black) Wins!");
        return true;
    }
    if (blackCount === 0) {
        announceWinner("You (White) Win!");
        return true;
    }
    return false;
}

function announceWinner(msg) {
    turnIndicator.textContent = msg;
    gameState.turn = 'gameover';
}