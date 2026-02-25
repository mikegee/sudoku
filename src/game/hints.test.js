import { describe, expect, it } from 'vitest';
import { CELL_COUNT, DIGITS, EMPTY_VALUE } from './constants';
import { toIndex } from './grid';
import { findNextHint, formatHintMessage, HINT_DIFFICULTY } from './hints';

const createCandidates = () =>
  Array(CELL_COUNT)
    .fill(null)
    .map(() => new Set(DIGITS));

describe('hints', () => {
  it('finds an easy naked-single hint', () => {
    const board = Array(CELL_COUNT).fill(EMPTY_VALUE);
    const candidates = createCandidates();
    const index = toIndex(0, 0);
    candidates[index] = new Set([7]);

    const hint = findNextHint(board, candidates);

    expect(hint).toEqual({
      difficulty: HINT_DIFFICULTY.EASY,
      technique: 'Naked Single',
    });
  });

  it('finds an easy hidden-single hint in a row', () => {
    const board = Array(CELL_COUNT).fill(EMPTY_VALUE);
    const candidates = createCandidates();

    for (let col = 0; col < 9; col++) {
      const index = toIndex(0, col);
      candidates[index] = col === 4 ? new Set([1, 9]) : new Set([1, 2, 3, 4, 5, 6, 7, 8]);
    }

    const hint = findNextHint(board, candidates);

    expect(hint).toEqual({
      difficulty: HINT_DIFFICULTY.EASY,
      technique: 'Hidden Single (Row)',
    });
  });

  it('finds an easy hidden-single hint in a column', () => {
    const board = Array(CELL_COUNT).fill(EMPTY_VALUE);
    const candidates = createCandidates();

    for (let row = 0; row < 9; row++) {
      const index = toIndex(row, 2);
      candidates[index] = row === 6 ? new Set([2, 4]) : new Set([1, 2, 3, 5, 6, 7, 8, 9]);
    }

    const hint = findNextHint(board, candidates);

    expect(hint).toEqual({
      difficulty: HINT_DIFFICULTY.EASY,
      technique: 'Hidden Single (Column)',
    });
  });

  it('finds an easy hidden-single hint in a box', () => {
    const board = Array(CELL_COUNT).fill(EMPTY_VALUE);
    const candidates = createCandidates();

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const index = toIndex(row, col);
        candidates[index] = row === 1 && col === 1 ? new Set([4, 7]) : new Set([1, 2, 3, 4, 5, 6, 8, 9]);
      }
    }

    const hint = findNextHint(board, candidates);

    expect(hint).toEqual({
      difficulty: HINT_DIFFICULTY.EASY,
      technique: 'Hidden Single (Box)',
    });
  });

  it('ignores naked singles that violate Sudoku rules', () => {
    const board = Array(CELL_COUNT).fill(EMPTY_VALUE);
    const candidates = createCandidates();
    board[toIndex(0, 0)] = 5;
    candidates[toIndex(0, 1)] = new Set([5]);

    const hint = findNextHint(board, candidates);

    expect(hint).toBeNull();
  });

  it('returns null when no supported hint exists', () => {
    const board = Array(CELL_COUNT).fill(EMPTY_VALUE);
    const candidates = createCandidates();

    const hint = findNextHint(board, candidates);

    expect(hint).toBeNull();
  });

  it('formats hint text for the UI message area', () => {
    const message = formatHintMessage({
      difficulty: HINT_DIFFICULTY.EASY,
      technique: 'Naked Single',
    });

    expect(message).toBe('Next move: Easy (Naked Single).');
  });
});
