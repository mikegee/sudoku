import { expect, test } from '@playwright/test';

const TEST_GRID =
  '000000000000000000000000000000000000000000000800030007040000900008000040900040008';
const APP_URL = `http://localhost:5173/?givens=${TEST_GRID}&autofillDelayMs=0`;
const DEFAULT_APP_URL = 'http://localhost:5173/?autofillDelayMs=0';
const SOLVED_GRID =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
const ONE_MISSING_GRID = `${SOLVED_GRID.slice(0, 80)}0`;
const DOUBLE_CLICK_DELAY_MS = 100;
const BOARD_CELL_COUNT = 81;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const openBoard = async (page) => {
  await page.goto(APP_URL);
};

const openDefaultBoard = async (page) => {
  await page.goto(DEFAULT_APP_URL);
};

const cellAt = (page, index) => page.locator('.cell').nth(index);
const candidateAt = (cell, digit) => cell.locator('.candidate').nth(digit - 1);
const cellValue = (cell) => cell.locator('.cell-value');
const undoButton = (page) => page.locator('button', { hasText: 'Undo' });

const hasClassFragment = async (locator, className) => {
  const classValue = (await locator.getAttribute('class')) || '';
  return classValue.includes(className);
};

const deactivateCandidateIfActive = async (cell, digit) => {
  const candidate = candidateAt(cell, digit);
  if (await hasClassFragment(candidate, 'active')) {
    await candidate.click();
  }
};

const activateCandidateIfInactive = async (cell, digit) => {
  const candidate = candidateAt(cell, digit);
  if (!(await hasClassFragment(candidate, 'active'))) {
    await candidate.click();
  }
};

const doubleClickCandidate = async (page, cell, digit, delayMs = DOUBLE_CLICK_DELAY_MS) => {
  const candidate = candidateAt(cell, digit);
  await candidate.click();
  await page.waitForTimeout(delayMs);
  await candidate.click();
};

const keepOnlyCandidates = async (page, cell, allowedDigits, delayMs = 0) => {
  for (const digit of DIGITS) {
    if (allowedDigits.includes(digit)) {
      continue;
    }

    await deactivateCandidateIfActive(cell, digit);
    if (delayMs > 0) {
      await page.waitForTimeout(delayMs);
    }
  }
};

test('double-click candidate fills cell', async ({ page }) => {
  await openBoard(page);

  const firstCell = cellAt(page, 0);
  await doubleClickCandidate(page, firstCell, 1);

  await expect(cellValue(firstCell)).toBeVisible({ timeout: 5000 });
  await expect(cellValue(firstCell)).toContainText('1');
});

test('single click toggles candidate visibility', async ({ page }) => {
  await openBoard(page);

  const firstCell = cellAt(page, 0);
  const activeCandidatesBefore = firstCell.locator('.candidate.active');
  const countBefore = await activeCandidatesBefore.count();

  await activeCandidatesBefore.first().click();

  const countAfter = await firstCell.locator('.candidate.active').count();
  expect(countAfter).toBe(countBefore - 1);
  await expect(cellValue(firstCell)).toHaveCount(0);
});

test('clicking filled cell reverts to candidate mode', async ({ page }) => {
  await openBoard(page);

  const firstCell = cellAt(page, 0);
  await doubleClickCandidate(page, firstCell, 1);

  await expect(cellValue(firstCell)).toBeVisible();
  await expect(cellValue(firstCell)).toContainText('1');

  await cellValue(firstCell).click();

  await expect(cellValue(firstCell)).not.toBeVisible();
  await expect(firstCell.locator('.candidates')).toBeVisible();
});

test('auto-fill when only one candidate remains', async ({ page }) => {
  await openBoard(page);

  const secondCell = cellAt(page, 1);
  await keepOnlyCandidates(page, secondCell, [1], 30);

  await expect(cellValue(secondCell)).toBeVisible();
  await expect(cellValue(secondCell)).toContainText('1');
});

test('multiple cells can be filled independently', async ({ page }) => {
  await openBoard(page);

  const firstCell = cellAt(page, 0);
  const secondCell = cellAt(page, 1);

  await doubleClickCandidate(page, firstCell, 1);
  await doubleClickCandidate(page, secondCell, 2);

  await expect(cellValue(firstCell)).toContainText('1');
  await expect(cellValue(secondCell)).toContainText('2');
});

test('filling a cell removes candidate from same row', async ({ page }) => {
  await openBoard(page);

  await doubleClickCandidate(page, cellAt(page, 0), 5);
  await expect(candidateAt(cellAt(page, 2), 5)).not.toHaveClass(/active/);
});

test('filling a cell removes candidate from same column', async ({ page }) => {
  await openBoard(page);

  await doubleClickCandidate(page, cellAt(page, 0), 3);
  await expect(candidateAt(cellAt(page, 9), 3)).not.toHaveClass(/active/);
});

test('filling a cell removes candidate from same 3x3 box', async ({ page }) => {
  await openBoard(page);

  await doubleClickCandidate(page, cellAt(page, 0), 7);
  await expect(candidateAt(cellAt(page, 10), 7)).not.toHaveClass(/active/);
});

test('undo reverts a candidate removal', async ({ page }) => {
  await openBoard(page);

  const undo = undoButton(page);
  const firstCandidate = candidateAt(cellAt(page, 0), 1);

  await expect(undo).toBeDisabled();
  await expect(firstCandidate).toHaveClass(/active/);

  await firstCandidate.click();
  await expect(firstCandidate).not.toHaveClass(/active/);
  await expect(undo).toBeEnabled();

  await undo.click();
  await expect(firstCandidate).toHaveClass(/active/);
  await expect(undo).toBeDisabled();
});

test('undo reverts a cell fill and restores affected candidates', async ({ page }) => {
  await openBoard(page);

  const firstCell = cellAt(page, 0);
  const rowPeerCandidate = candidateAt(cellAt(page, 2), 5);
  const undo = undoButton(page);

  await doubleClickCandidate(page, firstCell, 5);

  await expect(cellValue(firstCell)).toContainText('5');
  await expect(rowPeerCandidate).not.toHaveClass(/active/);

  await undo.click();

  await expect(cellValue(firstCell)).not.toBeVisible();
  await expect(rowPeerCandidate).toHaveClass(/active/);
});

test('double-click only creates one undo entry', async ({ page }) => {
  await openBoard(page);

  const firstCell = cellAt(page, 0);
  const undo = undoButton(page);

  await doubleClickCandidate(page, firstCell, 3);

  await expect(cellValue(firstCell)).toContainText('3');

  await undo.click();

  await expect(cellValue(firstCell)).not.toBeVisible();
  await expect(undo).toBeDisabled();
});

test('double-click undo stays single-step across multiple timing windows', async ({ page }) => {
  await openBoard(page);

  const undo = undoButton(page);
  const delaysMs = [40, 80, 120, 180, 240, 320, 420];
  const candidateDigit = 3;
  const eligibleCellIndexes = [];

  for (let index = 0; index < BOARD_CELL_COUNT && eligibleCellIndexes.length < delaysMs.length; index++) {
    const cell = cellAt(page, index);
    if ((await cellValue(cell).count()) > 0) {
      continue;
    }

    if (await hasClassFragment(candidateAt(cell, candidateDigit), 'active')) {
      eligibleCellIndexes.push(index);
    }
  }

  for (let i = 0; i < delaysMs.length; i++) {
    const testCell = cellAt(page, eligibleCellIndexes[i]);
    await doubleClickCandidate(page, testCell, candidateDigit, delaysMs[i]);

    await expect(cellValue(testCell)).toContainText(String(candidateDigit));
    await expect(undo).toBeEnabled();

    await undo.click();
    await expect(cellValue(testCell)).not.toBeVisible();
    await expect(undo).toBeDisabled();
  }
});

test('separate actions require separate undos', async ({ page }) => {
  await openBoard(page);

  const undo = undoButton(page);
  const firstCell = cellAt(page, 0);
  const candidate1 = candidateAt(firstCell, 1);
  const candidate2 = candidateAt(firstCell, 2);

  await candidate1.click();
  await expect(undo).toBeEnabled();

  await candidate2.click();

  await undo.click();
  await expect(candidate2).toHaveClass(/active/);
  await expect(candidate1).not.toHaveClass(/active/);
  await expect(undo).toBeEnabled();

  await undo.click();
  await expect(candidate1).toHaveClass(/active/);
  await expect(undo).toBeDisabled();
});

test('peer elimination auto-fills when one candidate remains', async ({ page }) => {
  await openBoard(page);

  const sourceCell = cellAt(page, 0);
  const targetCell = cellAt(page, 1);

  await keepOnlyCandidates(page, targetCell, [1, 2]);
  await doubleClickCandidate(page, sourceCell, 1);

  await expect(cellValue(targetCell)).toContainText('2');
});

test('double-click wins over risky single-click auto-fill in two-candidate row endgame', async ({ page }) => {
  await openBoard(page);

  const firstCell = cellAt(page, 0);
  const secondCell = cellAt(page, 1);

  await keepOnlyCandidates(page, firstCell, [1, 2]);
  await keepOnlyCandidates(page, secondCell, [1, 2]);

  await doubleClickCandidate(page, firstCell, 2);

  await expect(cellValue(firstCell)).toContainText('2');
  await expect(cellValue(secondCell)).toContainText('1');
});

test('number filter highlights cells that are or can be the selected number', async ({ page }) => {
  await openBoard(page);

  const filter5 = page.locator('.digit-button', { hasText: '5' });
  await filter5.click();

  await expect(page.locator('.cell.highlighted')).toHaveCount(71);

  await filter5.click();
  await expect(page.locator('.cell.highlighted')).toHaveCount(0);
});

test('number filter highlights candidate cells only and excludes filled cells with same value', async ({
  page,
}) => {
  await page.goto(`http://localhost:5173/?givens=${ONE_MISSING_GRID}&autofillDelayMs=999999`);

  const filter9 = page.locator('.digit-button', { hasText: '9' });
  await filter9.click();

  // In this puzzle state, only the single empty cell should still carry candidate 9.
  await expect(page.locator('.cell.highlighted')).toHaveCount(1);
  await expect(cellAt(page, 80)).toHaveClass(/highlighted/);

  // Filled cells with 9 must not be highlighted by the filter.
  await expect(cellValue(cellAt(page, 6))).toContainText('9');
  await expect(cellAt(page, 6)).not.toHaveClass(/highlighted/);
});

test('board loads with 10 seeded given cells', async ({ page }) => {
  await openBoard(page);
  await expect(page.locator('.cell .cell-value')).toHaveCount(10);
});

test('default generated puzzle loads as playable and incomplete', async ({ page }) => {
  await openDefaultBoard(page);

  // Let zero-delay auto-fill settle before checking startup quality.
  await page.waitForTimeout(300);

  const givenCount = await page.locator('.cell.filled-given .cell-value').count();
  const filledTotal = await page.locator('.cell .cell-value').count();
  const candidateCellCount = await page.locator('.cell .candidates').count();

  expect(givenCount).toBeGreaterThanOrEqual(25);
  expect(filledTotal).toBeLessThan(50);
  expect(candidateCellCount).toBeGreaterThan(0);

  await expect(page.locator('.cell.invalid')).toHaveCount(0);
  await expect(page.locator('.status-message')).toHaveCount(0);
  await expect(page.locator('button', { hasText: 'New Puzzle' })).toBeVisible();

  const filledIndices = await page.$$eval('.cell', (cells) =>
    cells.map((cell, index) => (cell.querySelector('.cell-value') ? index : -1)).filter((index) => index >= 0),
  );
  const filled = new Set(filledIndices);
  const unitHasAllFilled = (indices) => indices.every((index) => filled.has(index));

  const units = [];
  for (let row = 0; row < 9; row++) {
    units.push(Array.from({ length: 9 }, (_, col) => row * 9 + col));
  }
  for (let col = 0; col < 9; col++) {
    units.push(Array.from({ length: 9 }, (_, row) => row * 9 + col));
  }
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const unit = [];
      for (let rowOffset = 0; rowOffset < 3; rowOffset++) {
        for (let colOffset = 0; colOffset < 3; colOffset++) {
          unit.push((boxRow * 3 + rowOffset) * 9 + (boxCol * 3 + colOffset));
        }
      }
      units.push(unit);
    }
  }

  expect(units.some(unitHasAllFilled)).toBe(false);
});

test('rejects invalid manual double-click fill and shows message', async ({ page }) => {
  await openBoard(page);

  const targetCell = cellAt(page, 46); // row 6, col 2 (0-based)
  await doubleClickCandidate(page, targetCell, 8);

  await expect(cellValue(targetCell)).toHaveCount(0);
  await expect(page.locator('.status-message')).toContainText('violates Sudoku rules');
  await expect(page.locator('.status-message')).toHaveClass(/status-error/);
});

test('keeps invalid auto-fill, marks cell red, and allows undo', async ({ page }) => {
  await openBoard(page);

  const targetCell = cellAt(page, 46); // row 6, col 2 (0-based)

  await activateCandidateIfInactive(targetCell, 8);
  await keepOnlyCandidates(page, targetCell, [8]);

  await expect(targetCell).toHaveClass(/invalid/);
  await expect(cellValue(targetCell)).toContainText('8');
  await expect(page.locator('.status-message')).toContainText('Auto-fill placed');

  await undoButton(page).click();
  await expect(cellValue(targetCell)).toHaveCount(0);
  await expect(targetCell).not.toHaveClass(/invalid/);
});

test('shows a completion message when puzzle is solved', async ({ page }) => {
  await page.goto(`http://localhost:5173/?givens=${ONE_MISSING_GRID}&autofillDelayMs=0`);
  await expect(page.locator('.status-message')).toContainText('Puzzle complete');
  await expect(page.locator('.status-message')).toHaveClass(/status-success/);
  await expect(page.locator('button', { hasText: 'New Puzzle' })).toBeVisible();
});

test('undo reverts the triggering action and full auto-fill cascade as one step', async ({ page }) => {
  await openBoard(page);

  const firstCell = cellAt(page, 0);
  const secondCell = cellAt(page, 1);

  // Prepare a deterministic two-cell row endgame: both cells only allow {1,2}.
  await keepOnlyCandidates(page, firstCell, [1, 2]);
  await keepOnlyCandidates(page, secondCell, [1, 2]);

  // Trigger action: double-click 2 in first cell. Cascade should force second to 1.
  await doubleClickCandidate(page, firstCell, 2);
  await expect(cellValue(firstCell)).toContainText('2');
  await expect(cellValue(secondCell)).toContainText('1');

  // Undo once should revert both fills from the same cascade chain.
  await undoButton(page).click();
  await expect(cellValue(firstCell)).not.toBeVisible();
  await expect(cellValue(secondCell)).not.toBeVisible();
  await expect(candidateAt(firstCell, 2)).toHaveClass(/active/);
  await expect(candidateAt(secondCell, 1)).toHaveClass(/active/);
});

test('new puzzle button starts a fresh puzzle after completion', async ({ page }) => {
  await page.goto(`http://localhost:5173/?givens=${ONE_MISSING_GRID}&autofillDelayMs=999999`);

  const lastCell = cellAt(page, 80);
  await doubleClickCandidate(page, lastCell, 9);
  await expect(page.locator('.status-message')).toContainText('Puzzle complete');

  await page.locator('button', { hasText: 'New Puzzle' }).click();
  await expect(page.locator('.status-message')).toHaveCount(0);
  await expect(undoButton(page)).toBeDisabled();
  await expect(page.locator('.cell.invalid')).toHaveCount(0);
  const givenCount = await page.locator('.cell.filled-given .cell-value').count();
  const candidateCellCount = await page.locator('.cell .candidates').count();
  expect(givenCount).toBeGreaterThan(0);
  expect(candidateCellCount).toBeGreaterThan(0);
  await expect(page.locator('button', { hasText: 'New Puzzle' })).toBeVisible();
});
