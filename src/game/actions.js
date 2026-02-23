export const GAME_ACTIONS = {
  CELL_VALUE_CHANGE: 'cell-value-change',
  CANDIDATE_TOGGLE: 'candidate-toggle',
  AUTO_FILL_STEP: 'auto-fill-step',
  NEW_GAME: 'new-game',
  UNDO: 'undo',
};

export const setCellValueAction = (
  row,
  col,
  value,
  restoredCandidates = null,
  mergeWithPrevious = false,
) => ({
  type: GAME_ACTIONS.CELL_VALUE_CHANGE,
  payload: { row, col, value, restoredCandidates, mergeWithPrevious },
});

export const toggleCandidateAction = (row, col, num) => ({
  type: GAME_ACTIONS.CANDIDATE_TOGGLE,
  payload: { row, col, num },
});

export const autoFillStepAction = () => ({
  type: GAME_ACTIONS.AUTO_FILL_STEP,
});

export const newGameAction = () => ({
  type: GAME_ACTIONS.NEW_GAME,
});

export const undoAction = () => ({
  type: GAME_ACTIONS.UNDO,
});
