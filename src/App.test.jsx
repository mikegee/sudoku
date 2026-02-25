import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const BOARD_CELL_COUNT = 81;
const SOLVED_GRID =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
const ONE_MISSING_GRID = `${SOLVED_GRID.slice(0, 80)}0`;
const ALL_EMPTY_GRID = '0'.repeat(BOARD_CELL_COUNT);
const UNIT_TEST_GRID =
  '000000000000000000000000000000000000000000000800030007040000900008000040900040008';

const getCells = (container) => Array.from(container.querySelectorAll('.cell'));
const getCandidates = (cell) => Array.from(cell.querySelectorAll('.candidate'));
const getCellValueElement = (cell) => cell.querySelector('.cell-value');
const hasClass = (element, className) => element.classList.contains(className);

const getActiveDigits = (cell) =>
  getCandidates(cell)
    .map((candidate, index) => ({ candidate, digit: index + 1 }))
    .filter(({ candidate }) => hasClass(candidate, 'active'));

const expectFilled = async (cell) => {
  await waitFor(() => {
    const valueElement = getCellValueElement(cell);
    expect(valueElement).toBeTruthy();
    expect(valueElement.textContent).toMatch(/^[1-9]$/);
  });
};

describe('App interactions', () => {
  let user;

  const click = async (target) => {
    await act(async () => {
      await user.click(target);
    });
  };

  const pressKey = async (key) => {
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    });
  };

  const doubleClickCandidate = async (cell, digit) => {
    const candidate = getCandidates(cell)[digit - 1];
    await click(candidate);
    await click(candidate);
  };

  beforeEach(() => {
    user = userEvent.setup();
    window.history.pushState({}, '', `/?givens=${UNIT_TEST_GRID}&autofillDelayMs=0`);
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renders the board with 81 cells', () => {
    const { container } = render(<App />);
    expect(getCells(container)).toHaveLength(BOARD_CELL_COUNT);
  });

  it('single click toggles candidate without filling the cell', async () => {
    const { container } = render(<App />);
    const targetCell = getCells(container).find((cell) => getActiveDigits(cell).length >= 3);
    expect(targetCell).toBeTruthy();

    const chosenDigit = getActiveDigits(targetCell)[0].digit;
    await click(getCandidates(targetCell)[chosenDigit - 1]);

    expect(getCellValueElement(targetCell)).toBeFalsy();
    expect(hasClass(getCandidates(targetCell)[chosenDigit - 1], 'active')).toBe(false);
  });

  it('double click fills a cell', async () => {
    const { container } = render(<App />);
    const targetCell = getCells(container).find((cell) => getActiveDigits(cell).length >= 3);
    expect(targetCell).toBeTruthy();

    const chosenDigit = getActiveDigits(targetCell)[0].digit;
    await doubleClickCandidate(targetCell, chosenDigit);
    await expectFilled(targetCell);
  });

  it('clicking a filled cell restores candidate mode', async () => {
    const { container } = render(<App />);
    const targetCell = getCells(container).find((cell) => getActiveDigits(cell).length >= 2);
    expect(targetCell).toBeTruthy();

    const chosenDigit = getActiveDigits(targetCell)[0].digit;
    await doubleClickCandidate(targetCell, chosenDigit);
    await expectFilled(targetCell);

    const valueElement = getCellValueElement(targetCell);
    expect(valueElement).toBeTruthy();
    await click(valueElement);

    await waitFor(() => {
      expect(getCellValueElement(targetCell)).toBeFalsy();
    });
  });

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

  it('analyzes the next move and reports easy naked-single hints', async () => {
    const previousUrl = window.location.href;
    window.history.pushState({}, '', `/?givens=${ONE_MISSING_GRID}&autofillDelayMs=999999`);

    const { container, unmount } = render(<App />);
    const analyzeButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Analyze Next Move'),
    );
    expect(analyzeButton).toBeTruthy();

    await click(analyzeButton);

    await waitFor(() => {
      const message = container.querySelector('.status-message');
      expect(message).toBeTruthy();
      expect(message.textContent).toBe('Next move: Easy (Naked Single).');
    });

    unmount();
    window.history.pushState({}, '', previousUrl);
  });

  it('reports when no straightforward move is available', async () => {
    const previousUrl = window.location.href;
    window.history.pushState({}, '', `/?givens=${ALL_EMPTY_GRID}&autofillDelayMs=999999`);

    const { container, unmount } = render(<App />);
    const analyzeButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Analyze Next Move'),
    );
    expect(analyzeButton).toBeTruthy();

    await click(analyzeButton);

    await waitFor(() => {
      const message = container.querySelector('.status-message');
      expect(message).toBeTruthy();
      expect(message.textContent).toContain('No straightforward move found yet.');
      expect(message.classList.contains('status-info')).toBe(true);
    });

    unmount();
    window.history.pushState({}, '', previousUrl);
  });

  it('asks for confirmation before starting a new puzzle if game is not complete', async () => {
    const { container } = render(<App />);
    const newPuzzleButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('New Puzzle'),
    );
    expect(newPuzzleButton).toBeTruthy();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await click(newPuzzleButton);
    expect(confirmSpy).toHaveBeenCalled();

    const selectedCell = container.querySelector('.cell.selected');
    expect(selectedCell).toBeTruthy();

    confirmSpy.mockRestore();
  });

  it('supports keyboard selected-cell movement and color marking', async () => {
    const { container } = render(<App />);
    const cells = getCells(container);

    expect(hasClass(cells[0], 'selected')).toBe(true);

    await pressKey('ArrowRight');
    expect(hasClass(cells[1], 'selected')).toBe(true);

    await pressKey('b');
    expect(hasClass(cells[1], 'mark-blue')).toBe(true);

    await pressKey('ArrowDown');
    expect(hasClass(cells[10], 'selected')).toBe(true);

    await pressKey('g');
    expect(hasClass(cells[10], 'mark-green')).toBe(true);

    await pressKey('c');
    expect(container.querySelectorAll('.cell.mark-blue')).toHaveLength(0);
    expect(container.querySelectorAll('.cell.mark-green')).toHaveLength(0);
  });
});
