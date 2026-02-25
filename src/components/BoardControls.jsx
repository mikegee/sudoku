import PropTypes from 'prop-types';
import { DIGITS } from '../game/constants';

function BoardControls({
  canUndo,
  onUndo,
  onStartNewPuzzle,
  onAnalyzeNextMove,
  highlightNumber,
  onToggleHighlightNumber,
}) {
  return (
    <div className="controls">
      <button onClick={onStartNewPuzzle} type="button">
        New Puzzle
      </button>
      <button onClick={onUndo} disabled={!canUndo} type="button">
        ↶ Undo
      </button>
      <button onClick={onAnalyzeNextMove} type="button">
        Analyze Next Move
      </button>
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
    </div>
  );
}

BoardControls.propTypes = {
  canUndo: PropTypes.bool.isRequired,
  onUndo: PropTypes.func.isRequired,
  onStartNewPuzzle: PropTypes.func.isRequired,
  onAnalyzeNextMove: PropTypes.func.isRequired,
  highlightNumber: PropTypes.number,
  onToggleHighlightNumber: PropTypes.func.isRequired,
};

export default BoardControls;
