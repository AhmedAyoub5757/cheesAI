const boardElement = document.getElementById('board');
const turnIndicator = document.getElementById('turn-indicator');
const resetBtn = document.getElementById('reset-btn');
const modalResetBtn = document.getElementById('modal-reset-btn');

// Score elements
const whiteScoreElem = document.getElementById('white-score');
const blackScoreElem = document.getElementById('black-score');

// Modal elements
const winModal = document.getElementById('win-modal');
const winTitle = document.getElementById('win-title');
const winMessage = document.getElementById('win-message');

// --- GAME CONFIGURATION ---
const BOARD_SIZE = 8; 
const PIECE_ROWS = 3;  

let gameState = {
    board: [], 
    turn: 'white', 
    selectedPiece: null, 
    validMoves: [] 
};

initGame();

resetBtn.addEventListener('click', initGame);
modalResetBtn.addEventListener('click', () => {
    winModal.classList.remove('active');
    initGame();
});

function initGame() {
    gameState.board = createInitialBoard();
    gameState.turn = 'white';
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    
    turnIndicator.textContent = "Your Turn";
    winModal.classList.remove('active');
    
    boardElement.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, 1fr)`;
    boardElement.style.gridTemplateRows = `repeat(${BOARD_SIZE}, 1fr)`;
    
    updateScoresAndDisplay();
    renderBoard();
}

function createInitialBoard() {
    let board = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        let row = [];
        for (let c = 0; c < BOARD_SIZE; c++) {
            if ((r + c) % 2 === 1) {
                if (r < PIECE_ROWS) {
                    row.push(-1); 
                } else if (r >= BOARD_SIZE - PIECE_ROWS) {
                    row.push(1);  
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

function getLegalMoves(r, c, board) {
    const moves = [];
    const piece = board[r][c];
    if (piece === 0 || piece === null) return [];

    const isKing = Math.abs(piece) === 2;
    const directions = [];
    if (piece > 0) { 
        directions.push(-1);
        if (isKing) directions.push(1); 
    } else { 
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
    
    if (piece === 1 && to.r === 0) piece = 2; 
    if (piece === -1 && to.r === BOARD_SIZE - 1) piece = -2; 

    gameState.board[to.r][to.c] = piece;
    gameState.board[from.r][from.c] = 0;

    if (to.isJump && to.captured) {
        gameState.board[to.captured.r][to.captured.c] = 0;
    }

    gameState.selectedPiece = null;
    gameState.validMoves = [];
    
    if (checkGameOver()) return;

    gameState.turn = 'black';
    turnIndicator.textContent = "AI Thinking...";
    updateScoresAndDisplay();
    renderBoard();

    setTimeout(makeAIMove, 800);
}

function makeAIMove() {
    let jumpMoves = [];
    let normalMoves = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (gameState.board[r][c] < 0) { 
                const moves = getLegalMoves(r, c, gameState.board);
                moves.forEach(m => {
                    const moveDetails = { from: { r, c }, to: m };
                    if (m.isJump) jumpMoves.push(moveDetails);
                    else normalMoves.push(moveDetails);
                });
            }
        }
    }

    let chosenMove = null;
    if (jumpMoves.length > 0) {
        chosenMove = jumpMoves[Math.floor(Math.random() * jumpMoves.length)];
    } else if (normalMoves.length > 0) {
        chosenMove = normalMoves[Math.floor(Math.random() * normalMoves.length)];
    }

    if (chosenMove) {
        let piece = gameState.board[chosenMove.from.r][chosenMove.from.c];
        if (piece === -1 && chosenMove.to.r === BOARD_SIZE - 1) piece = -2; 

        gameState.board[chosenMove.to.r][chosenMove.to.c] = piece;
        gameState.board[chosenMove.from.r][chosenMove.from.c] = 0;

        if (chosenMove.to.isJump && chosenMove.to.captured) {
            gameState.board[chosenMove.to.captured.r][chosenMove.to.captured.c] = 0;
        }

        if (checkGameOver()) return;

        gameState.turn = 'white';
        turnIndicator.textContent = "Your Turn";
        updateScoresAndDisplay();
        renderBoard();
    } else {
        announceWinner("white", "AI is out of options. Splendid game!");
    }
}

// Scans board to calculate live piece counts and handles live headers
function updateScoresAndDisplay() {
    let white = 0;
    let black = 0;

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (gameState.board[r][c] > 0) white++;
            if (gameState.board[r][c] < 0) black++;
        }
    }

    whiteScoreElem.textContent = white;
    blackScoreElem.textContent = black;
}

function checkGameOver() {
    let white = 0;
    let black = 0;

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (gameState.board[r][c] > 0) white++;
            if (gameState.board[r][c] < 0) black++;
        }
    }

    if (white === 0) {
        announceWinner("black", "The AI cleared your tokens. Better luck next time!");
        return true;
    }
    if (black === 0) {
        announceWinner("white", "You captured all enemy tokens cleanly!");
        return true;
    }
    return false;
}

// Opens up the beautiful Win Overlay window
function announceWinner(winner, message) {
    gameState.turn = 'gameover';
    updateScoresAndDisplay();
    renderBoard();

    if (winner === 'white') {
        winTitle.textContent = "🏆 Victory!";
        winTitle.style.color = "#2ecc71";
        winMessage.textContent = message;
    } else {
        winTitle.textContent = "💥 Game Over";
        winTitle.style.color = "#e74c3c";
        winMessage.textContent = message;
    }

    winModal.classList.add('active');
}