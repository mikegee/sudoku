import { CELL_COUNT, DIGITS, EMPTY_VALUE } from './constants';
import { getPeerAndSelfCells, toCol, toRow } from './grid';

export const cloneCandidates = (candidates) => candidates.map((candidateSet) => new Set(candidateSet));
export const cloneInvalidCells = (invalidCells) => [...invalidCells];

export const createSnapshot = (board, candidates, invalidCells) => ({
  board: [...board],
  candidates: cloneCandidates(candidates),
  invalidCells: cloneInvalidCells(invalidCells),
});

const removeCandidateFromCells = (candidates, cellIndices, value) => {
  for (const cellIndex of cellIndices) {
    candidates[cellIndex].delete(value);
  }
};

export const setCellValueAndUpdateCandidates = (board, candidates, index, value) => {
  const row = toRow(index);
  const col = toCol(index);
  board[index] = value;
  removeCandidateFromCells(candidates, getPeerAndSelfCells(row, col), value);
  candidates[index] = new Set([value]);
};

export const isValidPlacement = (board, index, value) => {
  const row = toRow(index);
  const col = toCol(index);

  for (const peerIndex of getPeerAndSelfCells(row, col)) {
    if (peerIndex !== index && board[peerIndex] === value) {
      return false;
    }
  }

  return true;
};

export const applyForcedSingles = (board, candidates, invalidCells) => {
  let changed = true;

  while (changed) {
    changed = false;

    for (let index = 0; index < CELL_COUNT; index++) {
      if (board[index] !== EMPTY_VALUE || candidates[index].size !== 1) {
        continue;
      }

      const [value] = candidates[index];
      if (!isValidPlacement(board, index, value)) {
        board[index] = value;
        candidates[index] = new Set([value]);
        invalidCells[index] = true;
        return { invalidIndex: index, invalidValue: value };
      }

      setCellValueAndUpdateCandidates(board, candidates, index, value);
      invalidCells[index] = false;
      changed = true;
    }
  }

  return { invalidIndex: null, invalidValue: null };
};

export const createInitialCandidates = () =>
  Array(CELL_COUNT)
    .fill(null)
    .map(() => new Set(DIGITS));

export const seedCandidatesFromBoard = (board, candidates) => {
  for (let index = 0; index < CELL_COUNT; index++) {
    if (board[index] !== EMPTY_VALUE) {
      setCellValueAndUpdateCandidates(board, candidates, index, board[index]);
    }
  }
};
