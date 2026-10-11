# Handoff Notes — Sequoia Tree Library

Written at the point of handoff from OpenCode+DeepSeek to Claude (work repo). This
captures architectural decisions, rationale, and — most importantly — the upcoming
scope changes that will require rework.

## What was built

A headless tree library, POC-complete with 174 passing tests. The public API surface
(`src/index.ts`):

```
NodeStore, NodeStoreProvider, useNodeStore          // data cache layer
DataAdapter, AdapterNode, StoreNode, Pager, ...     // types
Tree, TreeProvider, useTree                         // core tree + virtualizer
useTreeSearch({ tree, virtualItems })               // search lifecycle
useTreeSelection({ tree, flatIds, ... })            // multi-select
useTreeKeyboard({ tree, flatIds, ... })             // keyboard nav
```

Key relationships:

- **`DataAdapter`** — consumer implements 4 methods (`getNodesByIds`, `getNodeChildren`,
  `getNodeDescendants`, `getFilteredNodes`) to connect a backend. This is the ONLY
  seam where API-specific logic lives.
- **`NodeStore`** — append-only cache. Dedupes fetches, links children to parents via
  `childrenIds: Set<string>`. Shared across multiple `TreeProvider`s.
- **`Tree`** — the monolith. Owns open/close state, derives the flat row list
  (depth-first walk over `NodeStore` + open set), maintains a reverse index map, and
  handles search mode. Exposes an imperative API (`open`, `close`, `toggle`, `isOpen`,
  `getFlatIds`, `getNode`, `isLeaf`, `hasAllChildren`, etc.).
- **`ChildPageLoader`** — child pagination. Calculates which pages cover a visible
  offset range, fires them in parallel, flushes them in page order into a parent's
  `childrenIds`.
- **`useTree`** — merges the Tree instance + TanStack Virtual. Returns
  `{ tree, flatIds, virtualItems, parentRef, totalSize, virtualizer, rowHeight }`.
  Skeleton-triggered fetching is internal (`tree.loadVisibleRange`).
- **`useTreeSearch`** — debounced queries, scroll-based pagination, feeds
  `tree.setSearchResults(matchedIds, ancestorIds, total)`.
- **`useTreeSelection`** / **`useTreeKeyboard`** — feature hooks. Take `tree`/`flatIds`
  as explicit params (prop-driven, no hidden context).

## Architectural decisions (and why)

1. **Single monolithic `Tree` class, not granular hooks.** Expanding, flattening,
   paging and loading form a tight dependency graph (flat list = f(NodeStore × openIds)).
   Splitting them across hooks creates synchronization pain for no benefit.

2. **`DataAdapter` is a plain interface, not a class.** Consumers implement it as an
   object literal or via a factory function. Class inheritance was rejected — composition
   (factory + partial override) is simpler and just as flexible.

3. **Prop-driven hooks, no feature registration in the provider.** We deliberately
   rejected a `TreeProvider features={{ search, selection }}` approach. It's ergonomic
   but creates hidden context coupling (`useNodeSearch` throws if search isn't
   registered). Instead, feature hooks take `tree`/`flatIds` as params; the consumer
   wires them. "Each tree implementation decides what props a node needs."

4. **No `useNode` hook.** It was removed. Consumers read `tree.getNode(id)` +
   `tree.isOpen(id)` directly. This keeps every row's data source explicit (props),
   avoiding hidden context reads.

5. **NodeStore stays separate from Tree.** Dedup across trees, future offline support,
   and the ability to share one store across many `TreeProvider`s (multi-root contexts).

## The scope changes (IMPORTANT — this is what changes next)

The POC was built against assumptions that have now been revised:

1. **"Bring your own API" is off the table.** There will be a dedicated endpoint with a
   limited field set and limited filtering options. `DataAdapter` should be simplified —
   it's no longer a fully generic abstraction. The `data?: Record<string, unknown>` field
   on nodes may no longer be needed (or becomes a fixed, known shape).

2. **Response shape changes significantly.** The new endpoint returns:
   - A paged list of results in the correct order, with an accurate pager.
   - Ancestors returned under an `ancestors` field, **per page** (not a separate
     `ancestorIds` array for the whole query).
   - This means the total list length is variable — page 1 returns N matches + M
     ancestors, page 2 returns different matches + possibly overlapping/different
     ancestors.

   This breaks two current assumptions:
   - `useTreeSearch` currently dedupes `matchedIds`/`ancestorIds` across pages via
     `tree.setSearchResults`. With ancestors coming per-page, dedup logic and the
     "when does a node appear" logic need revisiting.
   - `Tree.getTotalCount()` returns `max(flatIds.length, totalResultCount)`, assuming
     `pager.total` equals the visible row count. With a variable list length this is
     wrong — the virtualizer's scrollbar sizing needs to account for the sum of
     matches + ancestors, not just matches.

3. **Building directly into `@dhis2/ui`.** Not fully headless anymore. Components will
   be shipped alongside hooks, so UI assumptions can be made (row height, styling,
   error/loading states). Hooks should still be published so devs can customize, but
   the default component path is now the primary target.

## The riskiest area

The **search mode + ancestors-per-page** interaction is the highest-risk rework. The
current search implementation was the hardest part of the POC (see the "flushed
parents" / "seeded children" handling in `ChildPageLoader` and `Tree`). The new
response shape touches exactly that logic. I'd validate it against real fixtures from
the new endpoint early, before anything else.

## Naming conventions to preserve

- `DataAdapter` (was `TreeAdapter`) — the data-source seam
- `ChildPageLoader` (was `TreeFetcher` → `PageLoader`) — child pagination, NOT search
- `NodeStore` — the append-only node cache
- kebab-case files/dirs, co-located `*.test.ts(x)`, named exports only, barrel `index.ts`
- Prettier: 4 spaces, no semicolons, single quotes, trailing commas (ES5)
- Vitest + Testing Library; 174 tests currently passing

## Repo state

- Branch `main`, commit `e9c0686`, pushed to `origin/main`.
- All green: lint, typecheck, 174 tests.
- `src/__fixtures__/` has `deep-tree.json` (~176K nodes), `tall-tree.json`,
  `multi-root-tree.json` for testing.
- `tools/mock-tree-api/` and `tools/tree-generator/` are the test-data layer (NOT part
  of the public API).
