import { BOARD_SIDE, DIGITS, EMPTY_VALUE } from './constants';
import { isValidPlacement } from './engine';
import { getCellsInBox, getCellsInColumn, getCellsInRow } from './grid';

export const HINT_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  VERY_HARD: 'very hard',
};

const HINT_TECHNIQUES = {
  NAKED_SINGLE: 'Naked Single',
  HIDDEN_SINGLE_ROW: 'Hidden Single (Row)',
  HIDDEN_SINGLE_COLUMN: 'Hidden Single (Column)',
  HIDDEN_SINGLE_BOX: 'Hidden Single (Box)',
};
const BOX_SIDE = 3;
const ROW_UNITS = Array.from({ length: BOARD_SIDE }, (_, row) => getCellsInRow(row));
const COLUMN_UNITS = Array.from({ length: BOARD_SIDE }, (_, col) => getCellsInColumn(col));
const BOX_UNITS = [];
for (let boxRowStart = 0; boxRowStart < BOARD_SIDE; boxRowStart += BOX_SIDE) {
  for (let boxColStart = 0; boxColStart < BOARD_SIDE; boxColStart += BOX_SIDE) {
    BOX_UNITS.push(getCellsInBox(boxRowStart, boxColStart));
  }
}

const formatDifficultyLabel = (difficulty) =>
  difficulty
    .split(' ')
    .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(' ');

const createHint = (technique) => ({
  difficulty: HINT_DIFFICULTY.EASY,
  technique,
});

const findNakedSingleHint = (board, candidates) => {
  for (let index = 0; index < board.length; index++) {
    if (board[index] !== EMPTY_VALUE || candidates[index].size !== 1) {
      continue;
    }

    const [value] = candidates[index];
    if (!isValidPlacement(board, index, value)) {
      continue;
    }

    return createHint(HINT_TECHNIQUES.NAKED_SINGLE);
  }

  return null;
};

const findHiddenSingleInUnits = (board, candidates, units, technique) => {
  for (const unit of units) {
    const valueCounts = new Map(DIGITS.map((digit) => [digit, 0]));

    for (const index of unit) {
      if (board[index] !== EMPTY_VALUE) {
        continue;
      }

      for (const value of candidates[index]) {
        if (!isValidPlacement(board, index, value)) {
          continue;
        }

        valueCounts.set(value, valueCounts.get(value) + 1);
      }
    }

    for (const value of DIGITS) {
      if (valueCounts.get(value) === 1) {
        return createHint(technique);
      }
    }
  }

  return null;
};

const findHiddenSingleHint = (board, candidates) =>
  findHiddenSingleInUnits(board, candidates, ROW_UNITS, HINT_TECHNIQUES.HIDDEN_SINGLE_ROW) ??
  findHiddenSingleInUnits(board, candidates, COLUMN_UNITS, HINT_TECHNIQUES.HIDDEN_SINGLE_COLUMN) ??
  findHiddenSingleInUnits(board, candidates, BOX_UNITS, HINT_TECHNIQUES.HIDDEN_SINGLE_BOX);

const HINT_STRATEGIES = [findNakedSingleHint, findHiddenSingleHint];

export const findNextHint = (board, candidates) => {
  for (const findHint of HINT_STRATEGIES) {
    const hint = findHint(board, candidates);
    if (hint) {
      return hint;
    }
  }

  return null;
};

export const formatHintMessage = (hint) =>
  `Next move: ${formatDifficultyLabel(hint.difficulty)} (${hint.technique}).`;
