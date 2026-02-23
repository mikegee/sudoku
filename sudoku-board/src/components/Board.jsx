import React, { useState } from 'react';
import Cell from './Cell';

function Board() {
  const [board, setBoard] = useState(generateEmptyBoard());

  function generateEmptyBoard() {
    return Array.from({ length: 9 }, () => Array(9).fill(null));
  }

  const handleCellClick = (row, col) => {
    // Logic to handle cell click and number input can be added here
  };

  return (
    <div className="board">
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="board-row">
          {row.map((cell, colIndex) => (
            <Cell
              key={colIndex}
              value={cell}
              onClick={() => handleCellClick(rowIndex, colIndex)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Board;