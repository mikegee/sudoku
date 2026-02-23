import { describe, expect, it } from 'vitest';
import {
  autoFillStepAction,
  newGameAction,
  setCellValueAction,
  toggleCandidateAction,
  undoAction,
} from './actions';
import { CELL_COUNT, DIGITS, EMPTY_VALUE } from './constants';
import { createSnapshot } from './engine';
import { toIndex } from './grid';
import { gameReducer } from './state';

const SOLVED_GRID =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

const cloneCandidates = (candidates) => candidates.map((candidateSet) => new Set(candidateSet));

const createEmptyState = (overrides = {}) => {
  const board = overrides.board ? [...overrides.board] : Array(CELL_COUNT).fill(EMPTY_VALUE);
  const candidates = overrides.candidates
    ? cloneCandidates(overrides.candidates)
    : Array(CELL_COUNT)
        .fill(null)
        .map(() => new Set(DIGITS));
  const givenCells = overrides.givenCells ? [...overrides.givenCells] : Array(CELL_COUNT).fill(false);
  const invalidCells = overrides.invalidCells ? [...overrides.invalidCells] : Array(CELL_COUNT).fill(false);
  const message = overrides.message ?? null;
  const messageType = overrides.messageType ?? null;
  const pendingAutoFill = overrides.pendingAutoFill ?? null;
  const history = overrides.history ?? [createSnapshot(board, candidates, invalidCells)];

  return {
    board,
    candidates,
    givenCells,
    invalidCells,
    pendingAutoFill,
    isComplete: false,
    message,
    messageType,
    history,
  };
};

describe('gameReducer', () => {
  it('applies valid fill and removes candidate from row, column, and box peers', () => {
    const state = createEmptyState();

    const nextState = gameReducer(state, setCellValueAction(0, 0, 5));

    expect(nextState.board[toIndex(0, 0)]).toBe(5);
    expect(nextState.candidates[toIndex(0, 0)]).toEqual(new Set([5]));
    expect(nextState.candidates[toIndex(0, 1)].has(5)).toBe(false);
    expect(nextState.candidates[toIndex(1, 0)].has(5)).toBe(false);
    expect(nextState.candidates[toIndex(1, 1)].has(5)).toBe(false);
    expect(nextState.history).toHaveLength(2);
  });

  it('rejects invalid manual fill and keeps board unchanged', () => {
    const board = Array(CELL_COUNT).fill(EMPTY_VALUE);
    board[toIndex(0, 0)] = 5;
    const state = createEmptyState({ board });

    const nextState = gameReducer(state, setCellValueAction(0, 1, 5));

    expect(nextState.board[toIndex(0, 1)]).toBe(EMPTY_VALUE);
    expect(nextState.message).toContain('Cannot place 5');
    expect(nextState.history).toHaveLength(1);
  });

  it('toggles candidates for editable cells', () => {
    const state = createEmptyState();
    const index = toIndex(0, 0);

    const step1 = gameReducer(state, toggleCandidateAction(0, 0, 1));
    expect(step1.candidates[index].has(1)).toBe(false);
    expect(step1.history).toHaveLength(2);

    const step2 = gameReducer(step1, toggleCandidateAction(0, 0, 1));
    expect(step2.candidates[index].has(1)).toBe(true);
    expect(step2.history).toHaveLength(3);
  });

  it('ignores candidate toggles on given or filled cells', () => {
    const givenCells = Array(CELL_COUNT).fill(false);
    givenCells[toIndex(0, 0)] = true;
    const givenState = createEmptyState({ givenCells });
    expect(gameReducer(givenState, toggleCandidateAction(0, 0, 1))).toBe(givenState);

    const board = Array(CELL_COUNT).fill(EMPTY_VALUE);
    board[toIndex(0, 0)] = 4;
    const filledState = createEmptyState({ board });
    expect(gameReducer(filledState, toggleCandidateAction(0, 0, 1))).toBe(filledState);
  });

  it('auto-fills forced single and queues next forced single', () => {
    const state = createEmptyState();
    state.candidates[toIndex(0, 0)] = new Set([1]);
    state.candidates[toIndex(0, 1)] = new Set([1, 2]);
    state.pendingAutoFill = { index: toIndex(0, 0), value: 1 };

    const nextState = gameReducer(state, autoFillStepAction());
    expect(nextState.board[toIndex(0, 0)]).toBe(1);
    expect(nextState.pendingAutoFill).toEqual({ index: toIndex(0, 1), value: 2 });

    const finalState = gameReducer(nextState, autoFillStepAction());
    expect(finalState.board[toIndex(0, 1)]).toBe(2);
    expect(finalState.pendingAutoFill).toBeNull();
  });

  it('keeps invalid auto-fill, marks the cell invalid, and shows a message', () => {
    const board = Array(CELL_COUNT).fill(EMPTY_VALUE);
    board[toIndex(0, 1)] = 1;
    const state = createEmptyState({ board });
    state.candidates[toIndex(0, 0)] = new Set([1]);
    state.pendingAutoFill = { index: toIndex(0, 0), value: 1 };

    const nextState = gameReducer(state, autoFillStepAction());

    expect(nextState.board[toIndex(0, 0)]).toBe(1);
    expect(nextState.invalidCells[toIndex(0, 0)]).toBe(true);
    expect(nextState.pendingAutoFill).toBeNull();
    expect(nextState.message).toContain('Auto-fill placed 1');
  });

  it('stops auto-fill and reports when a cell is left with no candidates', () => {
    const state = createEmptyState();

    // Two row peers both only allow 1, which creates an impossible board after first auto-fill.
    state.candidates[toIndex(0, 0)] = new Set([1]);
    state.candidates[toIndex(0, 1)] = new Set([1]);
    state.pendingAutoFill = { index: toIndex(0, 0), value: 1 };

    const nextState = gameReducer(state, autoFillStepAction());

    expect(nextState.board[toIndex(0, 0)]).toBe(1);
    expect(nextState.board[toIndex(0, 1)]).toBe(EMPTY_VALUE);
    expect(nextState.candidates[toIndex(0, 1)].size).toBe(0);
    expect(nextState.pendingAutoFill).toBeNull();
    expect(nextState.message).toContain('No candidates remain for row 1, col 2');
  });

  it('undo restores the previous snapshot', () => {
    const state = createEmptyState();
    const updatedState = gameReducer(state, toggleCandidateAction(0, 0, 1));
    const undoneState = gameReducer(updatedState, undoAction());

    expect(undoneState.candidates[toIndex(0, 0)].has(1)).toBe(true);
    expect(undoneState.history).toHaveLength(1);
  });

  it('merge-with-previous keeps double-click flow as a single undo step', () => {
    const state = createEmptyState();
    const toggled = gameReducer(state, toggleCandidateAction(0, 0, 1));
    const mergedFill = gameReducer(toggled, setCellValueAction(0, 0, 2, null, true));

    expect(mergedFill.history).toHaveLength(2);
    const undone = gameReducer(mergedFill, undoAction());

    expect(undone.board[toIndex(0, 0)]).toBe(EMPTY_VALUE);
    expect(undone.candidates[toIndex(0, 0)].has(1)).toBe(true);
    expect(undone.history).toHaveLength(1);
  });

  it('flags puzzle complete when final valid value is placed', () => {
    const board = SOLVED_GRID.split('').map(Number);
    board[toIndex(8, 8)] = EMPTY_VALUE;
    const state = createEmptyState({ board });

    const nextState = gameReducer(state, setCellValueAction(8, 8, 9));

    expect(nextState.isComplete).toBe(true);
    expect(nextState.message).toContain('Puzzle complete');
  });

  it('new game resets key runtime state', () => {
    const dirtyState = createEmptyState({
      message: 'some prior error',
      invalidCells: Array(CELL_COUNT).fill(true),
      history: [
        createSnapshot(
          Array(CELL_COUNT).fill(EMPTY_VALUE),
          Array(CELL_COUNT)
            .fill(null)
            .map(() => new Set(DIGITS)),
          Array(CELL_COUNT).fill(true),
        ),
        createSnapshot(
          Array(CELL_COUNT).fill(1),
          Array(CELL_COUNT)
            .fill(null)
            .map(() => new Set([1])),
          Array(CELL_COUNT).fill(true),
        ),
      ],
    });

    const nextState = gameReducer(dirtyState, newGameAction());

    expect(nextState.history).toHaveLength(1);
    expect(nextState.invalidCells.some(Boolean)).toBe(false);
    expect(nextState.givenCells.some(Boolean)).toBe(true);
    expect(nextState.message).not.toBe('some prior error');
  });
});
