import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';

const BOARD_CELL_COUNT = 81;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const getCells = (container) => Array.from(container.querySelectorAll('.cell'));
const getCandidates = (cell) => Array.from(cell.querySelectorAll('.candidate'));
const getCellValueElement = (cell) => cell.querySelector('.cell-value');
const hasClass = (element, className) => element.classList.contains(className);
const isEditable = (cell) => !getCellValueElement(cell);

const getActiveDigits = (cell) =>
  getCandidates(cell)
    .map((candidate, index) => ({ candidate, digit: index + 1 }))
    .filter(({ candidate }) => hasClass(candidate, 'active'));

const expectPeerNoLongerHasDigit = (peerCell, digit) => {
  if (getCellValueElement(peerCell)) {
    return;
  }

  expect(hasClass(getCandidates(peerCell)[digit - 1], 'active')).toBe(false);
};

const expectFilled = async (cell) => {
  await waitFor(() => {
    const valueElement = getCellValueElement(cell);
    expect(valueElement).toBeTruthy();
    expect(valueElement.textContent).toMatch(/^[1-9]$/);
  });
};

const expectFilledWith = async (cell, expectedDigit) => {
  await waitFor(() => {
    const valueElement = getCellValueElement(cell);
    expect(valueElement).toBeTruthy();
    expect(valueElement.textContent).toBe(String(expectedDigit));
  });
};

const SOLVED_GRID =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
const ONE_MISSING_GRID = `${SOLVED_GRID.slice(0, 80)}0`;
const UNIT_TEST_GRID =
  '000000000000000000000000000000000000000000000800030007040000900008000040900040008';

describe('Cell Double-Click Behavior', () => {
  let user;

  const click = async (target) => {
    await act(async () => {
      await user.click(target);
    });
  };

  const deactivateIfActive = async (candidate) => {
    if (hasClass(candidate, 'active')) {
      await click(candidate);
    }
  };

  const doubleClickCandidate = async (cell, digit) => {
    const candidate = getCandidates(cell)[digit - 1];
    await click(candidate);
    await click(candidate);
  };

  const findEditableCell = (cells, predicate = () => true) => {
    const match = cells.find((cell) => isEditable(cell) && predicate(cell));
    expect(match).toBeTruthy();
    return match;
  };

  const findSharedActiveDigit = (sourceCell, peerCell) => {
    const sourceActive = new Set(getActiveDigits(sourceCell).map(({ digit }) => digit));
    return getActiveDigits(peerCell).find(({ digit }) => sourceActive.has(digit))?.digit ?? null;
  };

  beforeEach(() => {
    user = userEvent.setup();
    window.history.pushState({}, '', `/?givens=${UNIT_TEST_GRID}&autofillDelayMs=0`);
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('should render the board with 81 cells', () => {
    const { container } = render(<App />);
    expect(getCells(container)).toHaveLength(BOARD_CELL_COUNT);
  });

  it('should toggle candidate on single click', async () => {
    const { container } = render(<App />);
    const testCell = findEditableCell(getCells(container), (cell) => getActiveDigits(cell).length >= 3);

    const chosenDigit = getActiveDigits(testCell)[0].digit;
    await click(getCandidates(testCell)[chosenDigit - 1]);

    expect(getCellValueElement(testCell)).toBeFalsy();
    expect(hasClass(getCandidates(testCell)[chosenDigit - 1], 'active')).toBe(false);
  });

  it('should fill cell on double click', async () => {
    const { container } = render(<App />);
    const testCell = findEditableCell(getCells(container), (cell) => getActiveDigits(cell).length >= 3);

    const chosenDigit = getActiveDigits(testCell)[0].digit;
    await doubleClickCandidate(testCell, chosenDigit);
    await expectFilled(testCell);
  });

  it('should auto-fill when only one candidate remains', async () => {
    const { container } = render(<App />);
    const testCell = findEditableCell(getCells(container), (cell) => getActiveDigits(cell).length >= 3);

    const active = getActiveDigits(testCell);
    const keepDigit = active[0].digit;

    for (const { candidate } of active.slice(1)) {
      await deactivateIfActive(candidate);
    }

    await expectFilledWith(testCell, keepDigit);
  });

  it('should revert filled cell back to candidates', async () => {
    const { container } = render(<App />);
    const testCell = findEditableCell(getCells(container), (cell) => getActiveDigits(cell).length >= 2);

    const chosenDigit = getActiveDigits(testCell)[0].digit;
    await doubleClickCandidate(testCell, chosenDigit);
    await expectFilled(testCell);

    const valueElement = getCellValueElement(testCell);
    expect(valueElement).toBeTruthy();
    await click(valueElement);

    await waitFor(() => {
      expect(hasClass(testCell, 'filled')).toBe(false);
    });
  });

  it('should remove candidate from row when cell is filled', async () => {
    const { container } = render(<App />);
    const cells = getCells(container);

    const sourceCell = findEditableCell(cells.slice(0, 9), (cell) => getActiveDigits(cell).length >= 2);
    const sourceIndex = cells.indexOf(sourceCell);
    const rowStart = Math.floor(sourceIndex / 9) * 9;
    const rowPeers = cells.slice(rowStart, rowStart + 9).filter((cell) => cell !== sourceCell && isEditable(cell));
    const peerCell = rowPeers.find((cell) => findSharedActiveDigit(sourceCell, cell) !== null);

    expect(peerCell).toBeTruthy();
    const sharedDigit = findSharedActiveDigit(sourceCell, peerCell);

    await doubleClickCandidate(sourceCell, sharedDigit);
    expectPeerNoLongerHasDigit(peerCell, sharedDigit);
  });

  it('should remove candidate from column when cell is filled', async () => {
    const { container } = render(<App />);
    const cells = getCells(container);

    const sourceCell = findEditableCell(cells, (cell) => getActiveDigits(cell).length >= 2);
    const sourceIndex = cells.indexOf(sourceCell);
    const col = sourceIndex % 9;
    const colPeers = Array.from({ length: 9 }, (_, row) => cells[row * 9 + col]).filter(
      (cell) => cell !== sourceCell && isEditable(cell),
    );
    const peerCell = colPeers.find((cell) => findSharedActiveDigit(sourceCell, cell) !== null);

    expect(peerCell).toBeTruthy();
    const sharedDigit = findSharedActiveDigit(sourceCell, peerCell);

    await doubleClickCandidate(sourceCell, sharedDigit);
    expectPeerNoLongerHasDigit(peerCell, sharedDigit);
  });

  it('should remove candidate from 3x3 box when cell is filled', async () => {
    const { container } = render(<App />);
    const cells = getCells(container);

    const sourceCell = findEditableCell(cells, (cell) => getActiveDigits(cell).length >= 2);
    const sourceIndex = cells.indexOf(sourceCell);
    const sourceRow = Math.floor(sourceIndex / 9);
    const sourceCol = sourceIndex % 9;
    const boxRowStart = Math.floor(sourceRow / 3) * 3;
    const boxColStart = Math.floor(sourceCol / 3) * 3;

    const boxPeers = [];
    for (let row = boxRowStart; row < boxRowStart + 3; row++) {
      for (let col = boxColStart; col < boxColStart + 3; col++) {
        const cell = cells[row * 9 + col];
        if (cell !== sourceCell && isEditable(cell)) {
          boxPeers.push(cell);
        }
      }
    }

    const peerCell = boxPeers.find((cell) => findSharedActiveDigit(sourceCell, cell) !== null);
    expect(peerCell).toBeTruthy();
    const sharedDigit = findSharedActiveDigit(sourceCell, peerCell);

    await doubleClickCandidate(sourceCell, sharedDigit);
    expectPeerNoLongerHasDigit(peerCell, sharedDigit);
  });

  it('should undo a candidate removal', async () => {
    const { container } = render(<App />);
    const testCell = findEditableCell(getCells(container), (cell) => getActiveDigits(cell).length >= 3);
    const chosenDigit = getActiveDigits(testCell)[0].digit;
    const firstActive = getCandidates(testCell)[chosenDigit - 1];

    expect(hasClass(firstActive, 'active')).toBe(true);
    await click(firstActive);
    if (!getCellValueElement(testCell)) {
      expect(hasClass(getCandidates(testCell)[chosenDigit - 1], 'active')).toBe(false);
    }

    const undo = container.querySelector('button');
    expect(undo).toBeTruthy();
    await click(undo);

    expect(getCellValueElement(testCell)).toBeFalsy();
    expect(hasClass(getCandidates(testCell)[chosenDigit - 1], 'active')).toBe(true);
  });

  it('should undo a cell fill and restore removed candidates', async () => {
    const { container } = render(<App />);
    const cells = getCells(container);

    const sourceCell = findEditableCell(cells, (cell) => getActiveDigits(cell).length >= 2);
    const sourceIndex = cells.indexOf(sourceCell);
    const rowStart = Math.floor(sourceIndex / 9) * 9;
    const rowPeers = cells.slice(rowStart, rowStart + 9).filter((cell) => cell !== sourceCell && isEditable(cell));
    const peerCell = rowPeers.find((cell) => findSharedActiveDigit(sourceCell, cell) !== null);

    expect(peerCell).toBeTruthy();
    const sharedDigit = findSharedActiveDigit(sourceCell, peerCell);

    await doubleClickCandidate(sourceCell, sharedDigit);
    await expectFilled(sourceCell);
    expectPeerNoLongerHasDigit(peerCell, sharedDigit);

    const undo = container.querySelector('button');
    expect(undo).toBeTruthy();
    await click(undo);

    expect(getCellValueElement(sourceCell)).toBeFalsy();
  });

  it('should auto-fill a peer cell when only one candidate remains after elimination', async () => {
    const { container } = render(<App />);
    const cells = getCells(container);

    const sourceCell = findEditableCell(cells, (cell) => getActiveDigits(cell).length >= 2);
    const sourceIndex = cells.indexOf(sourceCell);
    const rowStart = Math.floor(sourceIndex / 9) * 9;
    const rowPeers = cells.slice(rowStart, rowStart + 9).filter((cell) => cell !== sourceCell && isEditable(cell));
    const targetCell = rowPeers.find((cell) => {
      const shared = findSharedActiveDigit(sourceCell, cell);
      return shared !== null && getActiveDigits(cell).length >= 2;
    });

    expect(targetCell).toBeTruthy();
    const targetActiveDigits = getActiveDigits(targetCell).map(({ digit }) => digit);
    const sourceActiveDigits = new Set(getActiveDigits(sourceCell).map(({ digit }) => digit));
    const removableShared = targetActiveDigits.find((digit) => sourceActiveDigits.has(digit));

    expect(removableShared).toBeTruthy();

    // Keep exactly two candidates in target, one of which will be removed by source fill.
    const keepDigits = new Set([removableShared, targetActiveDigits.find((digit) => digit !== removableShared)]);
    for (const digit of DIGITS) {
      if (!keepDigits.has(digit)) {
        await deactivateIfActive(getCandidates(targetCell)[digit - 1]);
      }
    }

    await doubleClickCandidate(sourceCell, removableShared);

    if (getCellValueElement(targetCell)) {
      await expectFilled(targetCell);
    } else {
      expect(hasClass(getCandidates(targetCell)[removableShared - 1], 'active')).toBe(false);
    }
  });
});

describe('Puzzle Completion', () => {
  it('shows a completion message when the puzzle is solved', async () => {
    const previousUrl = window.location.href;
    window.history.pushState({}, '', `/?givens=${ONE_MISSING_GRID}&autofillDelayMs=0`);

    const { container, unmount } = render(<App />);

    await waitFor(() => {
      const message = container.querySelector('.status-message');
      expect(message).toBeTruthy();
      expect(message.textContent).toContain('Puzzle complete');

      const newPuzzleButton = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('New Puzzle'),
      );
      expect(newPuzzleButton).toBeTruthy();
    });

    unmount();
    window.history.pushState({}, '', previousUrl);
  });
});
