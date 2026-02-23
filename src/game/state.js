import { GAME_ACTIONS } from './actions';
import { CELL_COUNT, EMPTY_VALUE } from './constants';
import {
  cloneCandidates,
  cloneInvalidCells,
  createInitialCandidates,
  createSnapshot,
  isValidPlacement,
  seedCandidatesFromBoard,
  setCellValueAndUpdateCandidates,
} from './engine';
import { toCol, toIndex, toRow } from './grid';
import { getInitialGivens } from './puzzle';

const COMPLETION_MESSAGE = 'Puzzle complete! Nice work.';
const MESSAGE_TYPES = {
  ERROR: 'error',
  SUCCESS: 'success',
};
const GIVEN_CELL_EDIT_MESSAGE = 'That is a puzzle cell and cannot be changed.';

const formatAutoFillInvalidMessage = (index, value) =>
  `Auto-fill placed ${value} in row ${toRow(index) + 1}, col ${toCol(index) + 1} but it violates Sudoku rules.`;

const formatManualInvalidMessage = (value) =>
  `Cannot place ${value} there because it violates Sudoku rules.`;
const formatNoCandidatesMessage = (index) =>
  `No candidates remain for row ${toRow(index) + 1}, col ${toCol(index) + 1}. Undo your last move.`;

const findNextForcedSingle = (board, candidates) => {
  for (let index = 0; index < CELL_COUNT; index++) {
    if (board[index] !== EMPTY_VALUE || candidates[index].size !== 1) {
      continue;
    }

    const [value] = candidates[index];
    return { index, value };
  }

  return null;
};

const findFirstExhaustedCell = (board, candidates) => {
  for (let index = 0; index < CELL_COUNT; index++) {
    if (board[index] === EMPTY_VALUE && candidates[index].size === 0) {
      return index;
    }
  }

  return null;
};

const deriveAutoFillState = (board, candidates, explicitMessage = null, explicitMessageType = null) => {
  if (explicitMessage) {
    return {
      pendingAutoFill: null,
      statusMessage: explicitMessage,
      statusMessageType: explicitMessageType ?? MESSAGE_TYPES.ERROR,
    };
  }

  const exhaustedIndex = findFirstExhaustedCell(board, candidates);
  if (exhaustedIndex !== null) {
    return {
      pendingAutoFill: null,
      statusMessage: formatNoCandidatesMessage(exhaustedIndex),
      statusMessageType: MESSAGE_TYPES.ERROR,
    };
  }

  return {
    pendingAutoFill: findNextForcedSingle(board, candidates),
    statusMessage: null,
    statusMessageType: null,
  };
};

const isPuzzleComplete = (board, invalidCells) => {
  if (board.some((value) => value === EMPTY_VALUE)) {
    return false;
  }

  if (invalidCells.some(Boolean)) {
    return false;
  }

  for (let index = 0; index < CELL_COUNT; index++) {
    if (!isValidPlacement(board, index, board[index])) {
      return false;
    }
  }

  return true;
};

const resolveStatus = (board, invalidCells, explicitMessage = null, explicitMessageType = null) => {
  const isComplete = isPuzzleComplete(board, invalidCells);
  if (explicitMessage) {
    return {
      isComplete,
      message: explicitMessage,
      messageType: explicitMessageType ?? MESSAGE_TYPES.ERROR,
    };
  }

  if (isComplete) {
    return {
      isComplete,
      message: COMPLETION_MESSAGE,
      messageType: MESSAGE_TYPES.SUCCESS,
    };
  }

  return {
    isComplete,
    message: null,
    messageType: null,
  };
};

const createBoardFromGivens = (givens) => {
  const board = Array(CELL_COUNT).fill(EMPTY_VALUE);

  for (const { row, col, value } of givens) {
    board[toIndex(row, col)] = value;
  }

  return board;
};

const createGivenCellsFromGivens = (givens) => {
  const givenCells = Array(CELL_COUNT).fill(false);

  for (const { row, col } of givens) {
    givenCells[toIndex(row, col)] = true;
  }

  return givenCells;
};

const appendHistorySnapshot = (history, board, candidates, invalidCells, { replaceLast = false } = {}) => {
  const snapshot = createSnapshot(board, candidates, invalidCells);

  if (replaceLast && history.length > 1) {
    return [...history.slice(0, -1), snapshot];
  }

  return [...history, snapshot];
};

const buildStateFromSnapshot = (state, snapshot, history, message = null, messageType = null) => ({
  board: [...snapshot.board],
  candidates: cloneCandidates(snapshot.candidates),
  givenCells: state.givenCells,
  invalidCells: cloneInvalidCells(snapshot.invalidCells),
  pendingAutoFill: null,
  ...resolveStatus(snapshot.board, snapshot.invalidCells, message, messageType),
  history,
});

const buildNextState = (
  state,
  board,
  candidates,
  invalidCells,
  { message = null, messageType = null, replaceLastHistoryEntry = false } = {},
) => {
  const { pendingAutoFill, statusMessage, statusMessageType } = deriveAutoFillState(
    board,
    candidates,
    message,
    messageType,
  );

  return {
    board,
    candidates,
    givenCells: state.givenCells,
    invalidCells,
    pendingAutoFill,
    ...resolveStatus(board, invalidCells, statusMessage, statusMessageType),
    history: appendHistorySnapshot(state.history, board, candidates, invalidCells, {
      replaceLast: replaceLastHistoryEntry,
    }),
  };
};

const createMutableCopies = (state) => ({
  board: [...state.board],
  candidates: cloneCandidates(state.candidates),
  invalidCells: cloneInvalidCells(state.invalidCells),
});

export const createInitialGameState = ({ forceNewDefault = false } = {}) => {
  const givens = getInitialGivens({ forceNewDefault });
  const board = createBoardFromGivens(givens);
  const candidates = createInitialCandidates();
  const givenCells = createGivenCellsFromGivens(givens);
  const invalidCells = Array(CELL_COUNT).fill(false);

  seedCandidatesFromBoard(board, candidates);
  const { pendingAutoFill, statusMessage, statusMessageType } = deriveAutoFillState(board, candidates);

  return {
    board,
    candidates,
    givenCells,
    invalidCells,
    pendingAutoFill,
    ...resolveStatus(board, invalidCells, statusMessage, statusMessageType),
    history: [createSnapshot(board, candidates, invalidCells)],
  };
};

const rejectInvalidManualFill = (state, value, replaceLastHistoryEntry) => {
  if (!replaceLastHistoryEntry || state.history.length <= 1) {
    return {
      ...state,
      message: formatManualInvalidMessage(value),
      messageType: MESSAGE_TYPES.ERROR,
    };
  }

  const historyBeforeAttempt = state.history.slice(0, -1);
  const snapshotBeforeAttempt = historyBeforeAttempt[historyBeforeAttempt.length - 1];
  return buildStateFromSnapshot(
    state,
    snapshotBeforeAttempt,
    historyBeforeAttempt,
    formatManualInvalidMessage(value),
    MESSAGE_TYPES.ERROR,
  );
};

const reduceCellValueChange = (state, payload) => {
  const {
    row,
    col,
    value,
    restoredCandidates = null,
    mergeWithPrevious = false,
  } = payload;
  const index = toIndex(row, col);
  const replaceLastHistoryEntry = mergeWithPrevious;

  if (state.givenCells[index]) {
    return { ...state, message: GIVEN_CELL_EDIT_MESSAGE, messageType: MESSAGE_TYPES.ERROR };
  }

  if (value > EMPTY_VALUE && !isValidPlacement(state.board, index, value)) {
    return rejectInvalidManualFill(state, value, replaceLastHistoryEntry);
  }

  const next = createMutableCopies(state);
  next.board[index] = value;
  next.invalidCells[index] = false;

  if (value > EMPTY_VALUE) {
    setCellValueAndUpdateCandidates(next.board, next.candidates, index, value);
    return buildNextState(state, next.board, next.candidates, next.invalidCells, {
      replaceLastHistoryEntry,
    });
  }

  if (restoredCandidates) {
    next.candidates[index] = new Set(restoredCandidates);
  }

  return buildNextState(state, next.board, next.candidates, next.invalidCells, {
    replaceLastHistoryEntry,
  });
};

const reduceCandidateToggle = (state, { row, col, num }) => {
  const index = toIndex(row, col);
  if (state.board[index] !== EMPTY_VALUE || state.givenCells[index]) {
    return state;
  }

  const next = createMutableCopies(state);
  if (next.candidates[index].has(num)) {
    next.candidates[index].delete(num);
  } else {
    next.candidates[index].add(num);
  }

  return buildNextState(state, next.board, next.candidates, next.invalidCells);
};

const reduceAutoFillStep = (state) => {
  const pending = state.pendingAutoFill;
  if (!pending) {
    return state;
  }

  const { index, value } = pending;
  const currentCellStillMatchesPending =
    state.board[index] === EMPTY_VALUE &&
    state.candidates[index].size === 1 &&
    state.candidates[index].has(value);

  if (!currentCellStillMatchesPending) {
    const { pendingAutoFill, statusMessage, statusMessageType } = deriveAutoFillState(
      state.board,
      state.candidates,
      state.message,
      state.messageType,
    );
    return {
      ...state,
      pendingAutoFill,
      ...resolveStatus(state.board, state.invalidCells, statusMessage, statusMessageType),
    };
  }

  const next = createMutableCopies(state);

  if (!isValidPlacement(next.board, index, value)) {
    next.board[index] = value;
    next.candidates[index] = new Set([value]);
    next.invalidCells[index] = true;

    return {
      ...buildNextState(state, next.board, next.candidates, next.invalidCells, {
        message: formatAutoFillInvalidMessage(index, value),
        messageType: MESSAGE_TYPES.ERROR,
        replaceLastHistoryEntry: true,
      }),
      pendingAutoFill: null,
    };
  }

  setCellValueAndUpdateCandidates(next.board, next.candidates, index, value);
  next.invalidCells[index] = false;
  return buildNextState(state, next.board, next.candidates, next.invalidCells, {
    replaceLastHistoryEntry: true,
  });
};

const reduceUndo = (state) => {
  if (state.history.length <= 1) {
    return state;
  }

  const history = state.history.slice(0, -1);
  const snapshot = history[history.length - 1];
  return buildStateFromSnapshot(state, snapshot, history, null);
};

const reduceNewGame = () => createInitialGameState({ forceNewDefault: true });

const reducers = {
  [GAME_ACTIONS.CELL_VALUE_CHANGE]: reduceCellValueChange,
  [GAME_ACTIONS.CANDIDATE_TOGGLE]: reduceCandidateToggle,
  [GAME_ACTIONS.AUTO_FILL_STEP]: reduceAutoFillStep,
  [GAME_ACTIONS.NEW_GAME]: reduceNewGame,
  [GAME_ACTIONS.UNDO]: reduceUndo,
};

export const gameReducer = (state, action) => {
  const reduceAction = reducers[action.type];
  return reduceAction ? reduceAction(state, action.payload) : state;
};
