import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { DIGITS } from '../game/constants';

const DOUBLE_CLICK_WINDOW_MS = 500;
const EMPTY_CLICK = { num: null, time: null };
const EMPTY_PENDING_TOGGLE = { num: null, time: null, timerId: null };

const isRecentClick = (time, now) => time !== null && now - time < DOUBLE_CLICK_WINDOW_MS;

const buildCellClassName = ({ isFilled, isGiven, isInvalid, isHighlighted }) =>
  `cell${isFilled ? ` filled ${isGiven ? 'filled-given' : 'filled-user'}` : ''}${
    isHighlighted ? ' highlighted' : ''
  }${isInvalid ? ' invalid' : ''}`;

const buildCandidateClassName = (isActive) => `candidate${isActive ? ' active' : ''}`;

function Cell({
  value,
  row,
  col,
  candidates,
  isGiven,
  isInvalid,
  highlightNumber,
  onSetCellValue,
  onToggleCandidate,
}) {
  const [savedCandidates, setSavedCandidates] = useState(null);
  const lastClickRef = useRef({ ...EMPTY_CLICK });
  const pendingToggleRef = useRef({ ...EMPTY_PENDING_TOGGLE });

  const isFilled = value > 0;
  const isHighlighted = highlightNumber !== null && !isFilled && candidates.has(highlightNumber);

  const resetLastClick = useCallback(() => {
    lastClickRef.current = { ...EMPTY_CLICK };
  }, []);

  const clearPendingToggle = useCallback(
    ({ applyToggle = false } = {}) => {
      const pending = pendingToggleRef.current;
      if (!pending.timerId) {
        return;
      }

      clearTimeout(pending.timerId);
      if (applyToggle) {
        onToggleCandidate(row, col, pending.num);
      }

      pendingToggleRef.current = { ...EMPTY_PENDING_TOGGLE };
    },
    [col, onToggleCandidate, row],
  );

  const scheduleRiskyToggle = useCallback(
    (num, clickTime) => {
      const timerId = setTimeout(() => {
        onToggleCandidate(row, col, num);
        pendingToggleRef.current = { ...EMPTY_PENDING_TOGGLE };
      }, DOUBLE_CLICK_WINDOW_MS);

      pendingToggleRef.current = { num, time: clickTime, timerId };
    },
    [col, onToggleCandidate, row],
  );

  const fillFromCandidate = useCallback(
    (num, { mergeWithPrevious }) => {
      setSavedCandidates(new Set(candidates));
      onSetCellValue(row, col, num, null, mergeWithPrevious);
      resetLastClick();
    },
    [candidates, col, onSetCellValue, resetLastClick, row],
  );

  useEffect(() => () => clearPendingToggle(), [clearPendingToggle]);

  useEffect(() => {
    if (isFilled) {
      clearPendingToggle();
    }
  }, [clearPendingToggle, isFilled]);

  const handleCandidateClick = useCallback(
    (num) => {
      if (isFilled) {
        return;
      }

      const now = Date.now();
      const pending = pendingToggleRef.current;

      if (pending.timerId) {
        const sameDigitSecondClick = pending.num === num && isRecentClick(pending.time, now);
        if (sameDigitSecondClick) {
          clearPendingToggle();
          fillFromCandidate(num, { mergeWithPrevious: false });
          return;
        }

        // Resolve the pending delayed single-click before handling a new intent.
        clearPendingToggle({ applyToggle: true });
        return;
      }

      const isRiskySingleClick = candidates.has(num) && candidates.size === 2;
      if (isRiskySingleClick) {
        scheduleRiskyToggle(num, now);
        return;
      }

      const lastClick = lastClickRef.current;
      const isDoubleClick = lastClick.num === num && isRecentClick(lastClick.time, now);
      if (isDoubleClick) {
        fillFromCandidate(num, { mergeWithPrevious: true });
        return;
      }

      onToggleCandidate(row, col, num);
      lastClickRef.current = { num, time: now };
    },
    [candidates, clearPendingToggle, col, fillFromCandidate, isFilled, onToggleCandidate, row, scheduleRiskyToggle],
  );

  const handleFilledCellClick = useCallback(() => {
    if (!isFilled || !savedCandidates) {
      return;
    }

    onSetCellValue(row, col, 0, savedCandidates, false);
    setSavedCandidates(null);
  }, [col, isFilled, onSetCellValue, row, savedCandidates]);

  return (
    <div className={buildCellClassName({ isFilled, isGiven, isInvalid, isHighlighted })} onClick={handleFilledCellClick}>
      {isFilled ? (
        <div className="cell-value">{value}</div>
      ) : (
        <div className="candidates">
          {DIGITS.map((num) => (
            <div
              key={num}
              className={buildCandidateClassName(candidates.has(num))}
              onClick={() => handleCandidateClick(num)}
            >
              {num}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

Cell.propTypes = {
  value: PropTypes.number.isRequired,
  row: PropTypes.number.isRequired,
  col: PropTypes.number.isRequired,
  candidates: PropTypes.instanceOf(Set).isRequired,
  isGiven: PropTypes.bool.isRequired,
  isInvalid: PropTypes.bool.isRequired,
  highlightNumber: PropTypes.number,
  onSetCellValue: PropTypes.func.isRequired,
  onToggleCandidate: PropTypes.func.isRequired,
};

export default Cell;
