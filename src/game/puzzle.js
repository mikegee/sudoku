import { BOARD_SIDE, DIGITS as ALL_DIGITS, EMPTY_VALUE } from './constants';

const GRID_SIDE = BOARD_SIDE;
const BOX_SIDE = 3;
const GRID_SIZE = GRID_SIDE * GRID_SIDE;
const TARGET_GIVENS = 32;
// Keep most cells unresolved after forced-singles so startup cascade stays small.
const MIN_EMPTY_AFTER_SINGLES = 38;
const MAX_GENERATION_ATTEMPTS = 30;

// Used only if generation fails for any reason.
const FALLBACK_GRID =
  '200080300060070084030500209000105408000000000402706000301007040720040060004010003';

const toRow = (index) => Math.floor(index / GRID_SIDE);
const toCol = (index) => index % GRID_SIDE;
const toIndex = (row, col) => row * GRID_SIDE + col;

const isValidGridString = (value) => /^[0-9]{81}$/.test(value);

const buildPeerLookup = () =>
  Array.from({ length: GRID_SIZE }, (_, index) => {
    const row = toRow(index);
    const col = toCol(index);
    const boxRowStart = Math.floor(row / BOX_SIDE) * BOX_SIDE;
    const boxColStart = Math.floor(col / BOX_SIDE) * BOX_SIDE;
    const peerSet = new Set();

    for (let i = 0; i < GRID_SIDE; i++) {
      peerSet.add(toIndex(row, i));
      peerSet.add(toIndex(i, col));
    }

    for (let boxRow = boxRowStart; boxRow < boxRowStart + BOX_SIDE; boxRow++) {
      for (let boxCol = boxColStart; boxCol < boxColStart + BOX_SIDE; boxCol++) {
        peerSet.add(toIndex(boxRow, boxCol));
      }
    }

    peerSet.delete(index);
    return [...peerSet];
  });

const PEERS = buildPeerLookup();

const shuffle = (values) => {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const isPlacementValid = (board, index, value) =>
  PEERS[index].every((peerIndex) => board[peerIndex] !== value);

const getCellCandidates = (board, index) => {
  if (board[index] !== EMPTY_VALUE) {
    return [];
  }

  const candidates = [];
  for (const value of ALL_DIGITS) {
    if (isPlacementValid(board, index, value)) {
      candidates.push(value);
    }
  }
  return candidates;
};

const findMostConstrainedEmptyCell = (board) => {
  let bestIndex = -1;
  let bestCandidates = [];

  for (let index = 0; index < GRID_SIZE; index++) {
    if (board[index] !== EMPTY_VALUE) {
      continue;
    }

    const candidates = getCellCandidates(board, index);
    if (candidates.length === 0) {
      return { index, candidates };
    }

    if (bestIndex === -1 || candidates.length < bestCandidates.length) {
      bestIndex = index;
      bestCandidates = candidates;
      if (bestCandidates.length === 1) {
        break;
      }
    }
  }

  if (bestIndex === -1) {
    return null;
  }

  return { index: bestIndex, candidates: bestCandidates };
};

const countSolutions = (board, limit = 2) => {
  let count = 0;

  const search = () => {
    if (count >= limit) {
      return;
    }

    const nextCell = findMostConstrainedEmptyCell(board);
    if (!nextCell) {
      count += 1;
      return;
    }

    const { index, candidates } = nextCell;
    if (candidates.length === 0) {
      return;
    }

    for (const value of candidates) {
      board[index] = value;
      search();
      board[index] = EMPTY_VALUE;

      if (count >= limit) {
        return;
      }
    }
  };

  search();
  return count;
};

const createBaseSolvedBoard = () => {
  const board = Array(GRID_SIZE).fill(EMPTY_VALUE);
  for (let row = 0; row < GRID_SIDE; row++) {
    for (let col = 0; col < GRID_SIDE; col++) {
      board[toIndex(row, col)] = ((row * 3 + Math.floor(row / 3) + col) % 9) + 1;
    }
  }
  return board;
};

const buildBandPreservingOrder = () => {
  const bandOrder = shuffle([0, 1, 2]);
  const order = [];

  for (const band of bandOrder) {
    const offsets = shuffle([0, 1, 2]);
    for (const offset of offsets) {
      order.push(band * BOX_SIDE + offset);
    }
  }

  return order;
};

const generateSolvedBoard = () => {
  const baseBoard = createBaseSolvedBoard();
  const digitMap = shuffle(ALL_DIGITS);
  const rowOrder = buildBandPreservingOrder();
  const colOrder = buildBandPreservingOrder();

  const solved = Array(GRID_SIZE).fill(EMPTY_VALUE);
  for (let row = 0; row < GRID_SIDE; row++) {
    for (let col = 0; col < GRID_SIDE; col++) {
      const baseValue = baseBoard[toIndex(rowOrder[row], colOrder[col])];
      solved[toIndex(row, col)] = digitMap[baseValue - 1];
    }
  }

  return solved;
};

const carvePuzzle = (solvedBoard, targetGivens) => {
  const puzzle = [...solvedBoard];
  const removalOrder = shuffle(Array.from({ length: GRID_SIZE }, (_, index) => index));
  let givens = GRID_SIZE;

  for (const index of removalOrder) {
    if (givens <= targetGivens) {
      break;
    }

    const keptValue = puzzle[index];
    puzzle[index] = EMPTY_VALUE;

    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[index] = keptValue;
      continue;
    }

    givens -= 1;
  }

  return puzzle;
};

const countEmptyAfterSinglesCascade = (board) => {
  const working = [...board];
  let changed = true;

  while (changed) {
    changed = false;

    for (let index = 0; index < GRID_SIZE; index++) {
      if (working[index] !== EMPTY_VALUE) {
        continue;
      }

      const candidates = getCellCandidates(working, index);
      if (candidates.length === 1) {
        working[index] = candidates[0];
        changed = true;
      }
    }
  }

  return working.filter((value) => value === EMPTY_VALUE).length;
};

const boardToGrid = (board) => board.join('');

const generateDefaultGrid = () => {
  let bestGrid = null;
  let bestEmptyAfterSingles = -1;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const solvedBoard = generateSolvedBoard();
    const puzzleBoard = carvePuzzle(solvedBoard, TARGET_GIVENS);
    const generatedGrid = boardToGrid(puzzleBoard);
    const emptyAfterSingles = countEmptyAfterSinglesCascade(puzzleBoard);

    if (emptyAfterSingles > bestEmptyAfterSingles) {
      bestEmptyAfterSingles = emptyAfterSingles;
      bestGrid = generatedGrid;
    }

    if (emptyAfterSingles >= MIN_EMPTY_AFTER_SINGLES) {
      return generatedGrid;
    }
  }

  return bestGrid ?? FALLBACK_GRID;
};

export const parseGridToGivens = (grid) => {
  if (!isValidGridString(grid)) {
    return null;
  }

  const givens = [];
  for (let index = 0; index < GRID_SIZE; index++) {
    const value = Number(grid[index]);
    if (value > EMPTY_VALUE) {
      givens.push({
        row: toRow(index),
        col: toCol(index),
        value,
      });
    }
  }

  return givens;
};

const parseGeneratedGridWithFallback = (grid) =>
  parseGridToGivens(grid) ?? parseGridToGivens(FALLBACK_GRID) ?? [];

const getGivensFromQuery = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const gridFromQuery = params.get('givens');
  return parseGridToGivens(gridFromQuery ?? '');
};

let cachedDefaultGivens = null;

const getDefaultGivens = () => {
  if (!cachedDefaultGivens) {
    cachedDefaultGivens = parseGeneratedGridWithFallback(generateDefaultGrid());
  }
  return cachedDefaultGivens;
};

const generateFreshDefaultGivens = () => parseGeneratedGridWithFallback(generateDefaultGrid());

export const getInitialGivens = ({ forceNewDefault = false } = {}) => {
  const queryGivens = getGivensFromQuery();
  if (queryGivens) {
    return queryGivens;
  }

  return forceNewDefault ? generateFreshDefaultGivens() : getDefaultGivens();
};
