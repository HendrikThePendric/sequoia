# Sequoia -- Project Guidelines

## Project Overview

Sequoia is a **headless React hook library** for working with large, lazy-loaded tree data structures (10K+ nodes). The library exports hooks and utilities -- not UI components -- that give developers an imperative API for tree operations such as expanding/collapsing nodes, virtual scrolling a flat open-node list, multi-selection, server-side search, and keyboard navigation.

The name is a play on sequoia trees (big trees, big data).

### Current State

The project is in early development. The core tree hooks do not exist yet. What does exist:

- A **tree data generator** CLI tool (`npm run generate-tree`) for creating large synthetic tree datasets as JSON.
- A **mock tree API** (`MockTreeApi`, `AsyncMockTreeApi`) that provides an in-memory data layer with pagination and configurable latency over generated tree data.
- A placeholder **Button component** used for initial build/test pipeline validation.

The generator and mock API exist because DHIS2's test database has very few org units (a very small tree) and the web API doesn't fully meet the requirements. There is no other way to test large tree behavior properly.

### Future Direction

This library may be moved to the [dhis2 org](https://github.com/dhis2) eventually, similar in spirit to [`@dhis2/multi-calendar-dates`](https://github.com/dhis2/multi-calendar-dates). For now, don't worry about dhis2-specific alignment -- focus on making things work first.

## Architecture & Design Decisions

### Hooks-First, Headless

- The public API surface is **React hooks** and helper utilities, not components.
- No built-in styles or UI opinions. Consumers bring their own rendering.
- Components in `src/` (e.g. Button) are for internal testing and Storybook demos only.

### Data Model

- The **NodeStore** (`Map<string, NodeState>`) is the single source of truth for all fetched nodes. It is append-only for the session lifetime -- nodes are never removed or invalidated.
- Each node tracks its children IDs (loaded so far), total children count (from the API, treated as stable), loading status, and a generic `data: TData` payload for consumer-specific fields.
- A **flat rows array** (`FlatRow[]`) is derived from the NodeStore + a set of open (expanded) node IDs via a depth-first walk. Only currently visible nodes appear in the flat list. Unloaded children are represented as skeleton entries to keep the scrollbar correctly sized.
- A **reverse lookup map** (`Map<string, number>`) from node ID to flat row index is rebuilt whenever flat rows change, providing O(1) index lookup for programmatic scrolling and navigation.
- The library accepts an **adapter / data-source interface** that consumers implement to connect their backend. This decouples the hooks from any specific fetch mechanism. The adapter must support paginated child loading and search with ancestor inclusion (so matched nodes can be shown in tree context).
- Node typing: nodes have required fields but may carry additional consumer data. The exact generic approach is still being explored -- prefer the simplest option that works.

### Existing Mock API vs. Hook Layer

The `src/tree-generator/` and `src/mock-tree-api/` code predates the hook architecture. It exists to produce large test datasets and simulate a paginated async backend. This code is **not** part of the hooks' public API -- it serves as the test data layer. Its internal types (e.g. `TreeNode`) may not match the hook layer's internal `NodeState` shape.

### State Management

- **No external state management dependencies** (no Zustand, Redux, etc.).
- The main hook exposes an **imperative API** to control the tree. Lightweight wrapper hooks can provide controlled-component or form-field APIs on top.
- Internal state uses React built-ins (`useState`, `useReducer`, `useRef`, `useCallback`, etc.).

### Virtual Scrolling

- **TanStack Virtual** (`@tanstack/react-virtual`) is the chosen virtualizer. It is the only React virtualizer with a headless hook API (`useVirtualizer`), which aligns with the hooks-first architecture. Fixed row height.
- Fetch triggers are derived from which skeleton rows TanStack Virtual is currently rendering, not from intersection observers.

### Planned Hook Surface (Tentative)

These are directional, not final:

- `useTree` -- core tree state (NodeStore, open/close, flat list)
- `useVirtualTree` -- virtual scrolling integration
- `useTreeSelection` -- multi-select / checkbox logic
- `useTreeSearch` -- server-side search integration
- `useTreeKeyboard` -- keyboard navigation
- `useTreeField` -- controlled form-field wrapper

## Code Conventions

### File & Directory Naming

- **kebab-case** for all files and directories (enforced by `ls-lint`).
- Co-locate tests next to source files: `foo.ts` and `foo.test.ts` in the same directory.
- Each directory re-exports through an `index.ts` barrel file.

### TypeScript

- Strict mode is on. `noUnusedLocals` and `noUnusedParameters` are enforced.
- **Functional components only** -- no class components.
- **Named exports only** -- no default exports.
- Prefer explicit return types on public API functions.

### Formatting & Linting

- **Prettier**: 80 char width, 4 spaces, no semicolons, single quotes, trailing commas (ES5).
- **ESLint**: TypeScript + React + Prettier integration.
- **Conventional Commits** enforced by commitlint via Husky.
- Pre-commit hook runs: format, lint, and test.

### Testing

- **Vitest** with jsdom environment.
- Use `@testing-library/react` for component tests.
- Write tests for all new functionality. Prefer unit tests for hook and utility logic.
- Test files use `.test.ts` / `.test.tsx` extensions.
- Every component (even internal demo ones) should have a **Storybook story**.

### Build

- **Vite** library build outputting CJS + ESM to `dist/`.
- React and React DOM are **peer dependencies**, never bundled.
- No runtime dependencies -- everything is a dev or peer dependency.

## MCP Tool Usage

The following MCP tools are available in this project:

- **`context7`** -- Use for looking up library documentation (React, Vite, Vitest, etc.). Prefer this over guessing API details.
- **`grep`** (Vercel) -- Use for searching code examples on GitHub when unsure how to implement something.
- **`github`** -- Use for interacting with this repo's issues, PRs, and actions on GitHub.
- **`neovim`** -- Use for interacting with the active Neovim editor session.

## Scripts Reference

| Command                 | Description                 |
| ----------------------- | --------------------------- |
| `npm test`              | Run tests (single run)      |
| `npm run test-watch`    | Run tests in watch mode     |
| `npm run test:ui`       | Run Vitest UI               |
| `npm run build`         | Build the library           |
| `npm run lint`          | Run ESLint + ls-lint        |
| `npm run format`        | Run Prettier                |
| `npm run storybook`     | Start Storybook dev server  |
| `npm run generate-tree` | Run tree data generator CLI |
