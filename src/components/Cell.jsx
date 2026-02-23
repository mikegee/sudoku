import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { DIGITS } from '../game/constants';

const DOUBLE_CLICK_WINDOW_MS = 500;
const EMPTY_CLICK = { num: null, time: null };
const EMPTY_PENDING_TOGGLE = { num: null, time: null, timerId: null };

const isWithinDoubleClickWindow = (time, now) =>
  time !== null && now - time < DOUBLE_CLICK_WINDOW_MS;

const buildCellClassName = ({
  isFilled,
  isGiven,
  isInvalid,
  isHighlighted,
  isSelected,
  markColor,
}) => {
  const classes = ['cell'];

  if (isFilled) {
    classes.push('filled', isGiven ? 'filled-given' : 'filled-user');
  }
  if (isHighlighted) {
    classes.push('highlighted');
  }
  if (isInvalid) {
    classes.push('invalid');
  }
  if (isSelected) {
    classes.push('selected');
  }
  if (markColor) {
    classes.push(`mark-${markColor}`);
  }

  return classes.join(' ');
};

const buildCandidateClassName = (isActive) => `candidate${isActive ? ' active' : ''}`;

function Cell({
  value,
  row,
  col,
  candidates,
  isGiven,
  isInvalid,
  isSelected,
  markColor,
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

  const commitPendingToggle = useCallback(
    (pendingNum) => {
      onToggleCandidate(row, col, pendingNum);
    },
    [col, onToggleCandidate, row],
  );

  const clearPendingToggle = useCallback(
    ({ applyToggle = false } = {}) => {
      const pending = pendingToggleRef.current;
      if (!pending.timerId) {
        return;
      }

      clearTimeout(pending.timerId);
      if (applyToggle) {
        commitPendingToggle(pending.num);
      }

      pendingToggleRef.current = { ...EMPTY_PENDING_TOGGLE };
    },
    [commitPendingToggle],
  );

  const schedulePendingRiskyToggle = useCallback(
    (num, clickTime) => {
      const timerId = setTimeout(() => {
        commitPendingToggle(num);
        pendingToggleRef.current = { ...EMPTY_PENDING_TOGGLE };
      }, DOUBLE_CLICK_WINDOW_MS);

      pendingToggleRef.current = { num, time: clickTime, timerId };
    },
    [commitPendingToggle],
  );

  const fillCellFromCandidate = useCallback(
    (num, { mergeWithPrevious }) => {
      setSavedCandidates(new Set(candidates));
      onSetCellValue(row, col, num, null, mergeWithPrevious);
      resetLastClick();
    },
    [candidates, col, onSetCellValue, resetLastClick, row],
  );

  const handleCandidateClick = useCallback(
    (num) => {
      if (isFilled) {
        return;
      }

      const now = Date.now();
      const pending = pendingToggleRef.current;

      if (pending.timerId) {
        const isPendingDoubleClick =
          pending.num === num && isWithinDoubleClickWindow(pending.time, now);

        if (isPendingDoubleClick) {
          clearPendingToggle();
          fillCellFromCandidate(num, { mergeWithPrevious: false });
          return;
        }

        // Resolve the older delayed single-click before handling a new intent.
        clearPendingToggle({ applyToggle: true });
        return;
      }

      if (candidates.has(num) && candidates.size === 2) {
        schedulePendingRiskyToggle(num, now);
        return;
      }

      const lastClick = lastClickRef.current;
      const isDoubleClick =
        lastClick.num === num && isWithinDoubleClickWindow(lastClick.time, now);

      if (isDoubleClick) {
        fillCellFromCandidate(num, { mergeWithPrevious: true });
        return;
      }

      onToggleCandidate(row, col, num);
      lastClickRef.current = { num, time: now };
    },
    [
      candidates,
      clearPendingToggle,
      col,
      fillCellFromCandidate,
      isFilled,
      onToggleCandidate,
      row,
      schedulePendingRiskyToggle,
    ],
  );

  const handleFilledCellClick = useCallback(() => {
    if (!isFilled || !savedCandidates) {
      return;
    }

    onSetCellValue(row, col, 0, savedCandidates, false);
    setSavedCandidates(null);
  }, [col, isFilled, onSetCellValue, row, savedCandidates]);

  useEffect(() => () => clearPendingToggle(), [clearPendingToggle]);

  useEffect(() => {
    if (isFilled) {
      clearPendingToggle();
    }
  }, [clearPendingToggle, isFilled]);

  const cellClassName = buildCellClassName({
    isFilled,
    isGiven,
    isInvalid,
    isHighlighted,
    isSelected,
    markColor,
  });

  return (
    <div className={cellClassName} onClick={handleFilledCellClick}>
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
  isSelected: PropTypes.bool.isRequired,
  markColor: PropTypes.oneOf(['blue', 'green', null]),
  highlightNumber: PropTypes.number,
  onSetCellValue: PropTypes.func.isRequired,
  onToggleCandidate: PropTypes.func.isRequired,
};

export default Cell;
