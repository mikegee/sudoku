function generateSudokuBoard() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  fillBoard(board);
  return board;
}

function fillBoard(board) {
  // Simple backtracking algorithm to fill the board
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        const numbers = shuffleArray([...Array(9).keys()].map(n => n + 1));
        for (const num of numbers) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (fillBoard(board)) {
              return true;
            }
            board[row][col] = 0; // backtrack
          }
        }
        return false; // trigger backtrack
      }
    }
  }
  return true; // board is filled
}

function isValid(board, row, col, num) {
  // Check row
  if (board[row].includes(num)) return false;

  // Check column
  if (board.some(r => r[col] === num)) return false;

  // Check 3x3 box
  const boxRowStart = Math.floor(row / 3) * 3;
  const boxColStart = Math.floor(col / 3) * 3;
  for (let r = boxRowStart; r < boxRowStart + 3; r++) {
    for (let c = boxColStart; c < boxColStart + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }

  return true;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export { generateSudokuBoard, isValid };