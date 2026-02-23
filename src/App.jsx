import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import Cell from './components/Cell';
import BoardControls from './components/BoardControls';
import {
  autoFillStepAction,
  newGameAction,
  setCellValueAction,
  toggleCandidateAction,
  undoAction,
} from './game/actions';
import { AUTO_FILL_DELAY_MS, BOARD_SIDE } from './game/constants';
import { createInitialGameState, gameReducer } from './game/state';
import './App.css';

const readAutoFillDelayFromQuery = () => {
  if (typeof window === 'undefined') {
    return AUTO_FILL_DELAY_MS;
  }

  const rawValue = new URLSearchParams(window.location.search).get('autofillDelayMs');
  if (rawValue === null) {
    return AUTO_FILL_DELAY_MS;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue)) {
    return AUTO_FILL_DELAY_MS;
  }

  return Math.max(0, Math.floor(parsedValue));
};

function SudokuBoard() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);
  const [highlightNumber, setHighlightNumber] = useState(null);
  const autoFillDelayMs = useMemo(() => readAutoFillDelayFromQuery(), []);

  const { board, candidates, givenCells, invalidCells, pendingAutoFill, isComplete, message, history } = state;

  useEffect(() => {
    if (!pendingAutoFill) {
      return undefined;
    }

    const timerId = setTimeout(() => {
      dispatch(autoFillStepAction());
    }, autoFillDelayMs);
    return () => clearTimeout(timerId);
  }, [autoFillDelayMs, pendingAutoFill]);

  const handleSetCellValue = useCallback(
    (row, col, value, restoredCandidates = null, mergeWithPrevious = false) => {
      dispatch(setCellValueAction(row, col, value, restoredCandidates, mergeWithPrevious));
    },
    [],
  );

  const handleToggleCandidate = useCallback((row, col, num) => {
    dispatch(toggleCandidateAction(row, col, num));
  }, []);

  const handleUndo = useCallback(() => {
    dispatch(undoAction());
  }, []);

  const handleNewGame = useCallback(() => {
    dispatch(newGameAction());
    setHighlightNumber(null);
  }, []);

  const handleHighlightNumberClick = useCallback((num) => {
    setHighlightNumber((current) => (current === num ? null : num));
  }, []);

  return (
    <div className="board-container">
      <div className="board">
        {board.map((value, index) => (
          <Cell
            key={index}
            value={value}
            row={Math.floor(index / BOARD_SIDE)}
            col={index % BOARD_SIDE}
            candidates={candidates[index]}
            isGiven={givenCells[index]}
            isInvalid={invalidCells[index]}
            highlightNumber={highlightNumber}
            onSetCellValue={handleSetCellValue}
            onToggleCandidate={handleToggleCandidate}
          />
        ))}
      </div>
      <BoardControls
        canUndo={history.length > 1}
        onUndo={handleUndo}
        canStartNewPuzzle={isComplete}
        onStartNewPuzzle={handleNewGame}
        highlightNumber={highlightNumber}
        onToggleHighlightNumber={handleHighlightNumberClick}
        message={message}
      />
    </div>
  );
}

function App() {
  return (
    <div className="app-container">
      <SudokuBoard />
    </div>
  );
}

export default App;
