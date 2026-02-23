# Sudoku

A browser-based Sudoku sandbox focused on candidate management:

- click a candidate to toggle it on/off
- double-click a candidate to fill the cell
- undo changes with history support
- auto-fill forced singles when only one candidate remains
- automatically remove filled values from row/column/box peers

## Development

```bash
npm install
npm run dev
```

## Tests

Unit tests:

```bash
npm run test
```

End-to-end browser tests:

```bash
npm run test:e2e
```

## Project Structure

- `src/App.jsx`: top-level board wiring (state reducer integration, keyboard navigation/marking, and message display).
- `src/components/Cell.jsx`: per-cell interaction behavior (single click, double click, risky-click handling).
- `src/components/BoardControls.jsx`: New Puzzle/Undo controls and number-filter buttons.
- `src/game/actions.js`: reducer action types and action creators.
- `src/game/constants.js`: board constants and defaults.
- `src/game/grid.js`: row/column/box index helpers.
- `src/game/engine.js`: low-level board/candidate mutation + placement validation helpers.
- `src/game/puzzle.js`: puzzle generation and query-string givens override (`?givens=...`).
- `src/game/state.js`: game reducer, history handling, auto-fill flow, and message typing.
- `src/App.css`: board, controls, and status message styles.
- `src/App.test.jsx`: component-level interaction tests.
- `src/game/state.test.js`: focused reducer/unit behavior tests.
- `e2e.spec.js`: Playwright end-to-end browser tests.
