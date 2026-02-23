import PropTypes from 'prop-types';
import { DIGITS } from '../game/constants';

function BoardControls({
  canUndo,
  onUndo,
  canStartNewPuzzle,
  onStartNewPuzzle,
  highlightNumber,
  onToggleHighlightNumber,
  message,
}) {
  return (
    <div className="controls">
      <button onClick={onUndo} disabled={!canUndo} type="button">
        ↶ Undo
      </button>
      {canStartNewPuzzle && (
        <button onClick={onStartNewPuzzle} type="button">
          New Puzzle
        </button>
      )}
      <div className="number-filter">
        {DIGITS.map((num) => (
          <button
            key={num}
            className={`digit-button${highlightNumber === num ? ' active' : ''}`}
            onClick={() => onToggleHighlightNumber(num)}
            type="button"
          >
            {num}
          </button>
        ))}
      </div>
      {message && <div className="status-message error">{message}</div>}
    </div>
  );
}

BoardControls.propTypes = {
  canUndo: PropTypes.bool.isRequired,
  onUndo: PropTypes.func.isRequired,
  canStartNewPuzzle: PropTypes.bool.isRequired,
  onStartNewPuzzle: PropTypes.func.isRequired,
  highlightNumber: PropTypes.number,
  onToggleHighlightNumber: PropTypes.func.isRequired,
  message: PropTypes.string,
};

export default BoardControls;
