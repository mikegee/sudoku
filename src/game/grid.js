import { BOARD_SIDE } from './constants';

const BOX_SIDE = 3;

export const toIndex = (row, col) => row * BOARD_SIDE + col;
export const toRow = (index) => Math.floor(index / BOARD_SIDE);
export const toCol = (index) => index % BOARD_SIDE;

export const getCellsInRow = (row) => {
  const cells = [];
  for (let col = 0; col < BOARD_SIDE; col++) {
    cells.push(toIndex(row, col));
  }
  return cells;
};

export const getCellsInColumn = (col) => {
  const cells = [];
  for (let row = 0; row < BOARD_SIDE; row++) {
    cells.push(toIndex(row, col));
  }
  return cells;
};

export const getCellsInBox = (row, col) => {
  const cells = [];
  const boxRowStart = Math.floor(row / BOX_SIDE) * BOX_SIDE;
  const boxColStart = Math.floor(col / BOX_SIDE) * BOX_SIDE;

  for (let boxRow = boxRowStart; boxRow < boxRowStart + BOX_SIDE; boxRow++) {
    for (let boxCol = boxColStart; boxCol < boxColStart + BOX_SIDE; boxCol++) {
      cells.push(toIndex(boxRow, boxCol));
    }
  }

  return cells;
};

export const getPeerAndSelfCells = (row, col) =>
  [...new Set([...getCellsInRow(row), ...getCellsInColumn(col), ...getCellsInBox(row, col)])];
