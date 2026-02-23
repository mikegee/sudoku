import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
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

const TOTAL_CELLS = BOARD_SIDE * BOARD_SIDE;
const CLEAR_MARKS_KEY = 'c';
const MARK_SHORTCUTS = {
  b: 'blue',
  g: 'green',
};
const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const createEmptyCellMarks = () => Array(TOTAL_CELLS).fill(null);

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

const moveSelection = (currentIndex, key) => {
  const row = Math.floor(currentIndex / BOARD_SIDE);
  const col = currentIndex % BOARD_SIDE;

  if (key === 'ArrowUp' && row > 0) {
    return currentIndex - BOARD_SIDE;
  }
  if (key === 'ArrowDown' && row < BOARD_SIDE - 1) {
    return currentIndex + BOARD_SIDE;
  }
  if (key === 'ArrowLeft' && col > 0) {
    return currentIndex - 1;
  }
  if (key === 'ArrowRight' && col < BOARD_SIDE - 1) {
    return currentIndex + 1;
  }

  return currentIndex;
};

function SudokuBoard() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);
  const [highlightNumber, setHighlightNumber] = useState(null);
  const [selectedCellIndex, setSelectedCellIndex] = useState(0);
  const [cellMarks, setCellMarks] = useState(createEmptyCellMarks);
  const selectedCellIndexRef = useRef(0);
  const autoFillDelayMs = useMemo(() => readAutoFillDelayFromQuery(), []);

  const { board, candidates, givenCells, invalidCells, pendingAutoFill, isComplete, message, messageType, history } =
    state;

  useEffect(() => {
    if (!pendingAutoFill) {
      return undefined;
    }

    const timerId = setTimeout(() => {
      dispatch(autoFillStepAction());
    }, autoFillDelayMs);

    return () => clearTimeout(timerId);
  }, [autoFillDelayMs, pendingAutoFill]);

  const resetAnnotations = useCallback(() => {
    setHighlightNumber(null);
    setSelectedCellIndex(0);
    selectedCellIndexRef.current = 0;
    setCellMarks(createEmptyCellMarks());
  }, []);

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

  const handleStartNewPuzzle = useCallback(() => {
    if (!isComplete) {
      const shouldStartNewPuzzle = window.confirm(
        'Start a new puzzle? Your current progress will be lost.',
      );
      if (!shouldStartNewPuzzle) {
        return;
      }
    }

    dispatch(newGameAction());
    resetAnnotations();
  }, [isComplete, resetAnnotations]);

  const handleToggleHighlightNumber = useCallback((num) => {
    setHighlightNumber((current) => (current === num ? null : num));
  }, []);

  const applyMarkToSelectedCell = useCallback(
    (markColor) => {
      setCellMarks((currentMarks) => {
        const nextMarks = [...currentMarks];
        nextMarks[selectedCellIndexRef.current] = markColor;
        return nextMarks;
      });
    },
    [],
  );

  const handleGlobalKeyDown = useCallback(
    (event) => {
      const normalizedKey = event.key.toLowerCase();

      if (normalizedKey === CLEAR_MARKS_KEY) {
        event.preventDefault();
        setCellMarks(createEmptyCellMarks());
        return;
      }

      const markColor = MARK_SHORTCUTS[normalizedKey];
      if (markColor) {
        event.preventDefault();
        applyMarkToSelectedCell(markColor);
        return;
      }

      if (!ARROW_KEYS.has(event.key)) {
        return;
      }

      event.preventDefault();
      setSelectedCellIndex((currentIndex) => {
        const nextIndex = moveSelection(currentIndex, event.key);
        selectedCellIndexRef.current = nextIndex;
        return nextIndex;
      });
    },
    [applyMarkToSelectedCell],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  return (
    <>
      <div className="board-message-area">
        {message && <div className={`status-message status-${messageType ?? 'error'}`}>{message}</div>}
      </div>

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
              isSelected={index === selectedCellIndex}
              markColor={cellMarks[index]}
              highlightNumber={highlightNumber}
              onSetCellValue={handleSetCellValue}
              onToggleCandidate={handleToggleCandidate}
            />
          ))}
        </div>

        <BoardControls
          canUndo={history.length > 1}
          onUndo={handleUndo}
          onStartNewPuzzle={handleStartNewPuzzle}
          highlightNumber={highlightNumber}
          onToggleHighlightNumber={handleToggleHighlightNumber}
        />
      </div>
    </>
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
