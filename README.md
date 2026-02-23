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

- `src/App.jsx`: top-level board wiring.
- `src/components/Cell.jsx`: cell interaction model (single click, double click, risky-click guard).
- `src/components/BoardControls.jsx`: undo, number filter, and status message UI.
- `src/game/constants.js`: board-size and digit constants.
- `src/game/actions.js`: reducer action types and creators.
- `src/game/grid.js`: row/column/box indexing utilities.
- `src/game/engine.js`: low-level board mutation and validation helpers.
- `src/game/puzzle.js`: puzzle seeding (query override via `?givens=...` + generated default puzzle).
- `src/game/state.js`: reducer orchestration (actions, history, invalid messaging, undo flow).
- `src/App.css`: board and control styling.
- `src/App.test.jsx`: component-level behavior tests.
- `e2e.spec.js`: Playwright browser tests.

## Notes

- `sudoku-board/` is a legacy experiment and is not used by the active app.
