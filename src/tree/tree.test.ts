import { describe, it, expect, vi } from 'vitest'
import { NodeStore } from '../node-store'
import type { AdapterNode, PagedResponse, TreeAdapter } from '../node-store'
import { Tree } from './tree'

// -- Test helpers (same pattern as node-store tests) --

function createAdapterNode(
    overrides: Partial<AdapterNode> & { id: string }
): AdapterNode {
    return {
        displayName: overrides.displayName ?? `Node ${overrides.id}`,
        level: overrides.level ?? 1,
        path: overrides.path ?? `/${overrides.id}`,
        parent: overrides.parent ?? null,
        childrenCount: overrides.childrenCount ?? 0,
        ...overrides,
    }
}

function pagedResponse(
    data: AdapterNode[],
    page = 1,
    pageSize = 50
): PagedResponse<AdapterNode> {
    return {
        pager: {
            page,
            pageSize,
            total: data.length,
            pages: Math.ceil(data.length / pageSize),
        },
        data,
    }
}

function createMockAdapter(overrides: Partial<TreeAdapter> = {}): TreeAdapter {
    return {
        getNodesByIds: vi.fn().mockResolvedValue([]),
        getNodeChildren: vi.fn().mockResolvedValue(pagedResponse([])),
        getNodeDescendants: vi.fn().mockResolvedValue(pagedResponse([])),
        getFilteredNodes: vi.fn().mockResolvedValue(pagedResponse([])),
        ...overrides,
    }
}

/**
 * Creates a NodeStore pre-populated with nodes.
 * Handles parent-child registration by fetching parent before children.
 */
async function createPopulatedStore(nodes: AdapterNode[]): Promise<NodeStore> {
    const adapter = createMockAdapter({
        getNodesByIds: vi.fn().mockResolvedValue(nodes),
    })
    const store = new NodeStore(adapter)
    await store.fetchNodesByIds(nodes.map((n) => n.id))
    return store
}

describe('Tree', () => {
    describe('constructor', () => {
        it('initialises with root IDs in flatIds', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'r1' }),
                createAdapterNode({ id: 'r2' }),
            ])

            const tree = new Tree(store, ['r1', 'r2'])

            expect(tree.getFlatIds()).toEqual(['r1', 'r2'])
        })

        it('builds correct reverse index', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'r1' }),
                createAdapterNode({ id: 'r2' }),
            ])

            const tree = new Tree(store, ['r1', 'r2'])

            expect(tree.getIndexById('r1')).toBe(0)
            expect(tree.getIndexById('r2')).toBe(1)
            expect(tree.getIndexById('unknown')).toBeUndefined()
        })
    })

    describe('expansion', () => {
        it('opens a node and includes its children in flatIds', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 2,
                }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                }),
                createAdapterNode({
                    id: 'b',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])

            expect(tree.getFlatIds()).toEqual(['root'])

            tree.open('root')

            expect(tree.getFlatIds()).toEqual(['root', 'a', 'b'])
            expect(tree.isOpen('root')).toBe(true)
        })

        it('closes a node and removes its children from flatIds', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 1,
                }),
                createAdapterNode({
                    id: 'child',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])
            tree.open('root')
            expect(tree.getFlatIds()).toEqual(['root', 'child'])

            tree.close('root')
            expect(tree.getFlatIds()).toEqual(['root'])
            expect(tree.isOpen('root')).toBe(false)
        })

        it('toggle switches open state', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 1,
                }),
                createAdapterNode({
                    id: 'child',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])

            tree.toggle('root')
            expect(tree.isOpen('root')).toBe(true)
            expect(tree.getFlatIds()).toEqual(['root', 'child'])

            tree.toggle('root')
            expect(tree.isOpen('root')).toBe(false)
            expect(tree.getFlatIds()).toEqual(['root'])
        })

        it('handles nested open nodes with DFS order', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 2,
                }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                    childrenCount: 1,
                }),
                createAdapterNode({
                    id: 'a1',
                    parent: 'a',
                    level: 3,
                }),
                createAdapterNode({
                    id: 'b',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])
            tree.open('root')
            tree.open('a')

            expect(tree.getFlatIds()).toEqual(['root', 'a', 'a1', 'b'])
        })

        it('closing a parent collapses nested children from flatIds', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 1,
                }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                    childrenCount: 1,
                }),
                createAdapterNode({
                    id: 'a1',
                    parent: 'a',
                    level: 3,
                }),
            ])

            const tree = new Tree(store, ['root'])
            tree.open('root')
            tree.open('a')
            expect(tree.getFlatIds()).toEqual(['root', 'a', 'a1'])

            tree.close('root')
            expect(tree.getFlatIds()).toEqual(['root'])
            // Note: 'a' is still in openNodeIds, but not visible
            expect(tree.isOpen('a')).toBe(true)
        })

        it('does not notify when opening an already-open node', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'root' }),
            ])
            const tree = new Tree(store, ['root'])
            tree.open('root')

            const listener = vi.fn()
            tree.subscribe(listener)

            tree.open('root')
            expect(listener).not.toHaveBeenCalled()
        })

        it('does not notify when closing an already-closed node', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'root' }),
            ])
            const tree = new Tree(store, ['root'])

            const listener = vi.fn()
            tree.subscribe(listener)

            tree.close('root')
            expect(listener).not.toHaveBeenCalled()
        })
    })

    describe('multi-root', () => {
        it('handles multiple roots in order', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({
                    id: 'r1',
                    childrenCount: 1,
                }),
                createAdapterNode({
                    id: 'r1-child',
                    parent: 'r1',
                    level: 2,
                }),
                createAdapterNode({
                    id: 'r2',
                    childrenCount: 1,
                }),
                createAdapterNode({
                    id: 'r2-child',
                    parent: 'r2',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['r1', 'r2'])
            tree.open('r1')
            tree.open('r2')

            expect(tree.getFlatIds()).toEqual([
                'r1',
                'r1-child',
                'r2',
                'r2-child',
            ])
        })
    })

    describe('subscription', () => {
        it('notifies listeners on open', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'root', childrenCount: 1 }),
                createAdapterNode({
                    id: 'child',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])
            const listener = vi.fn()
            tree.subscribe(listener)

            tree.open('root')
            expect(listener).toHaveBeenCalledTimes(1)
        })

        it('notifies listeners on close', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'root' }),
            ])
            const tree = new Tree(store, ['root'])
            tree.open('root')

            const listener = vi.fn()
            tree.subscribe(listener)

            tree.close('root')
            expect(listener).toHaveBeenCalledTimes(1)
        })

        it('unsubscribe stops notifications', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'root' }),
            ])
            const tree = new Tree(store, ['root'])

            const listener = vi.fn()
            const unsubscribe = tree.subscribe(listener)

            tree.open('root')
            expect(listener).toHaveBeenCalledTimes(1)

            unsubscribe()
            tree.close('root')
            expect(listener).toHaveBeenCalledTimes(1)
        })

        it('getSnapshot version increments on each mutation', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'root' }),
            ])
            const tree = new Tree(store, ['root'])

            const v0 = tree.getSnapshot()
            tree.open('root')
            const v1 = tree.getSnapshot()
            tree.close('root')
            const v2 = tree.getSnapshot()

            expect(v1).toBe(v0 + 1)
            expect(v2).toBe(v1 + 1)
        })
    })

    describe('reverse index', () => {
        it('updates after expansion changes', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 2,
                }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                }),
                createAdapterNode({
                    id: 'b',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])
            expect(tree.getIndexById('root')).toBe(0)

            tree.open('root')
            expect(tree.getIndexById('root')).toBe(0)
            expect(tree.getIndexById('a')).toBe(1)
            expect(tree.getIndexById('b')).toBe(2)

            tree.close('root')
            expect(tree.getIndexById('root')).toBe(0)
            expect(tree.getIndexById('a')).toBeUndefined()
        })
    })

    describe('skeleton rows', () => {
        it('emits skeleton entries for unloaded children', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 5,
                }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                }),
                createAdapterNode({
                    id: 'b',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])
            tree.open('root')

            const flatIds = tree.getFlatIds()
            // root + 2 loaded children + 3 skeletons = 6
            expect(flatIds).toHaveLength(6)
            expect(flatIds[0]).toBe('root')
            expect(flatIds[1]).toBe('a')
            expect(flatIds[2]).toBe('b')
            expect(flatIds[3]).toBe('skeleton:root:2')
            expect(flatIds[4]).toBe('skeleton:root:3')
            expect(flatIds[5]).toBe('skeleton:root:4')
        })

        it('does not emit skeletons when all children are loaded', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 2,
                }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                }),
                createAdapterNode({
                    id: 'b',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])
            tree.open('root')

            expect(tree.getFlatIds()).toEqual(['root', 'a', 'b'])
        })

        it('skeleton entries have correct reverse index', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 3,
                }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])
            tree.open('root')

            expect(tree.getIndexById('skeleton:root:1')).toBe(2)
            expect(tree.getIndexById('skeleton:root:2')).toBe(3)
        })

        it('skeletons disappear when node is closed', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 5,
                }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])
            tree.open('root')
            expect(tree.getFlatIds()).toHaveLength(6) // root + 1 child + 4 skeletons

            tree.close('root')
            expect(tree.getFlatIds()).toEqual(['root'])
        })
    })

    describe('isSkeleton / parseSkeletonId', () => {
        it('identifies skeleton IDs', () => {
            expect(Tree.isSkeleton('skeleton:root:0')).toBe(true)
            expect(Tree.isSkeleton('skeleton:parent-id:42')).toBe(true)
            expect(Tree.isSkeleton('real-node-id')).toBe(false)
            expect(Tree.isSkeleton('')).toBe(false)
        })

        it('parses skeleton IDs correctly', () => {
            expect(Tree.parseSkeletonId('skeleton:root:0')).toEqual({
                parentId: 'root',
                offset: 0,
            })
            expect(
                Tree.parseSkeletonId('skeleton:parent:with:colons:5')
            ).toEqual({
                parentId: 'parent:with:colons',
                offset: 5,
            })
            expect(Tree.parseSkeletonId('not-a-skeleton')).toBeUndefined()
        })
    })

    describe('loadChildren', () => {
        it('no-ops when node is not open', async () => {
            const adapter = createMockAdapter({
                getNodesByIds: vi.fn().mockResolvedValue([
                    createAdapterNode({
                        id: 'root',
                        childrenCount: 10,
                    }),
                ]),
                getNodeChildren: vi
                    .fn()
                    .mockRejectedValue(new Error('should not be called')),
            })
            const store = new NodeStore(adapter)
            await store.fetchNodesByIds(['root'])
            const tree = new Tree(store, ['root'])

            // Node is not open → loadChildren should be a no-op
            tree.loadChildren('root', 99)

            expect(adapter.getNodeChildren).not.toHaveBeenCalled()
        })

        it('loads children and replaces skeletons', async () => {
            const children = [
                createAdapterNode({
                    id: 'c',
                    parent: 'root',
                    level: 2,
                }),
                createAdapterNode({
                    id: 'd',
                    parent: 'root',
                    level: 2,
                }),
            ]
            const adapter = createMockAdapter({
                getNodesByIds: vi.fn().mockResolvedValue([
                    createAdapterNode({
                        id: 'root',
                        childrenCount: 2,
                    }),
                ]),
                getNodeChildren: vi
                    .fn()
                    .mockResolvedValue(pagedResponse(children, 1, 50)),
            })
            const store = new NodeStore(adapter)
            await store.fetchNodesByIds(['root'])
            const tree = new Tree(store, ['root'])

            tree.open('root')
            // 2 children expected, none loaded → 2 skeletons
            expect(tree.getFlatIds()).toEqual([
                'root',
                'skeleton:root:0',
                'skeleton:root:1',
            ])

            // Load page 1 (covers offsets 0-1 with pageSize=50)
            tree.loadChildren('root', 1)

            await vi.waitFor(() => {
                expect(tree.getFlatIds()).toEqual(['root', 'c', 'd'])
            })
        })
    })

    describe('search mode', () => {
        it('setSearchResults enters search mode and shows only filter-set nodes', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'root', childrenCount: 3 }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                    childrenCount: 1,
                }),
                createAdapterNode({
                    id: 'a1',
                    parent: 'a',
                    level: 3,
                }),
                createAdapterNode({
                    id: 'b',
                    parent: 'root',
                    level: 2,
                }),
                createAdapterNode({
                    id: 'c',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])

            // Search for node 'c'. Only ancestor 'root' and match 'c' are shown.
            // Non-matching siblings (a, b) are filtered out.
            tree.setSearchResults(['c'], ['root'], 2)

            expect(tree.inSearchMode()).toBe(true)
            expect(tree.isFilterMatch('c')).toBe(true)
            expect(tree.isFilterAncestor('root')).toBe(true)
            expect(tree.isFilterMatch('a')).toBe(false)

            expect(tree.getFlatIds()).toEqual(['root', 'c'])
        })

        it('filtered walk only enters roots that are in the filter set', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'r1', childrenCount: 1 }),
                createAdapterNode({
                    id: 'r1-child',
                    parent: 'r1',
                    level: 2,
                }),
                createAdapterNode({ id: 'r2', childrenCount: 1 }),
                createAdapterNode({
                    id: 'r2-child',
                    parent: 'r2',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['r1', 'r2'])

            // Only r1 and its child are in the filter set
            tree.setSearchResults(['r1-child'], ['r1'], 2)

            // r2 should not be visible
            const flatIds = tree.getFlatIds()
            expect(flatIds).toContain('r1')
            expect(flatIds).toContain('r1-child')
            expect(flatIds).not.toContain('r2')
            expect(flatIds).not.toContain('r2-child')
        })

        it('collapsing an ancestor hides only non-filter-set children', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'root', childrenCount: 2 }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                }),
                createAdapterNode({
                    id: 'b',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])

            // Node 'a' is the match. Non-matching sibling 'b' is filtered out.
            tree.setSearchResults(['a'], ['root'], 2)
            expect(tree.getFlatIds()).toEqual(['root', 'a'])

            // Expand root. Pre-flush: 'a' (filter-set) is skipped, only
            // non-filter-set sibling 'b' is shown.
            tree.openSearch('root')
            expect(tree.getFlatIds()).toEqual(['root', 'b'])

            // Collapse root → 'b' hidden, but filter-set child 'a' returns
            tree.closeSearch('root')
            expect(tree.getFlatIds()).toEqual(['root', 'a'])
        })

        it('filter-set children are always visible regardless of expansion', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'root', childrenCount: 1 }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                    childrenCount: 1,
                }),
                createAdapterNode({
                    id: 'a1',
                    parent: 'a',
                    level: 3,
                }),
            ])

            const tree = new Tree(store, ['root'])

            // All three nodes are in the filter set (matched + ancestors)
            tree.setSearchResults(['a1'], ['root', 'a'], 3)
            // All filter-set nodes are visible without expansion
            expect(tree.getFlatIds()).toEqual(['root', 'a', 'a1'])

            // Closing 'a' doesn't hide filter-set children (a1)
            tree.closeSearch('a')
            expect(tree.getFlatIds()).toEqual(['root', 'a', 'a1'])
        })

        it('expanding an ancestor shows non-filter-set siblings', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'root', childrenCount: 2 }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                }),
                createAdapterNode({
                    id: 'b',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])

            // Only 'a' matches. Root is ancestor. 'b' is a non-filter-set sibling.
            tree.setSearchResults(['a'], ['root'], 2)
            // Filter-set nodes only: root (ancestor) and a (match)
            expect(tree.getFlatIds()).toEqual(['root', 'a'])

            // Expand root. Pre-flush: filter-set child 'a' is skipped,
            // only non-filter-set sibling 'b' is shown. 'a' reappears
            // at its natural position when its API page loads (flush).
            tree.openSearch('root')
            expect(tree.getFlatIds()).toEqual(['root', 'b'])
        })

        it('toggle redirects to toggleSearch in search mode', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'root', childrenCount: 1 }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])
            tree.setSearchResults(['a'], ['root'], 2)

            // Manually expand root in search mode
            tree.openSearch('root')
            expect(tree.isSearchOpen('root')).toBe(true)

            // toggle → closes root in search mode
            tree.toggle('root')
            expect(tree.isSearchOpen('root')).toBe(false)
            expect(tree.isOpen('root')).toBe(false) // normal open set untouched

            tree.toggle('root')
            expect(tree.isSearchOpen('root')).toBe(true)
        })

        it('clearSearch exits search mode and restores normal walk', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'root', childrenCount: 1 }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])
            tree.setSearchResults(['a'], ['root'], 2)
            expect(tree.inSearchMode()).toBe(true)

            tree.clearSearch()
            expect(tree.inSearchMode()).toBe(false)
            expect(tree.getFlatIds()).toEqual(['root'])
            expect(tree.isFilterMatch('a')).toBe(false)
            expect(tree.isFilterAncestor('root')).toBe(false)
        })

        it('clearSearch + setSearchResults replaces IDs from previous search', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'root', childrenCount: 2 }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                }),
                createAdapterNode({
                    id: 'b',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])

            // First search: only 'a' matches
            tree.setSearchResults(['a'], ['root'], 2)
            expect(tree.isFilterMatch('a')).toBe(true)
            expect(tree.isFilterMatch('b')).toBe(false)

            // Second search without clearSearch: 'b' matches but 'a' lingers
            // (this is a pagination union, not a new search)
            tree.setSearchResults(['b'], ['root'], 2)
            expect(tree.isFilterMatch('a')).toBe(true) // stale!
            expect(tree.isFilterMatch('b')).toBe(true)

            // Clear and start fresh: only 'b' should match
            tree.clearSearch()
            tree.setSearchResults(['b'], ['root'], 2)
            expect(tree.isFilterMatch('b')).toBe(true)
            expect(tree.isFilterMatch('a')).toBe(false)
        })

        it('pagination: second call merges IDs into existing sets', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 2,
                }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                }),
                createAdapterNode({
                    id: 'b',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])

            // Page 1: a matches, root is ancestor
            tree.setSearchResults(['a'], ['root'], 3)
            // Root is auto-expanded, so all loaded children (a, b) are shown
            expect(tree.isFilterMatch('a')).toBe(true)
            expect(tree.isFilterMatch('b')).toBe(false)

            // Page 2: b also matches (merged into filterMatchedIds)
            tree.setSearchResults(['b'], ['root'], 3)
            expect(tree.isFilterMatch('a')).toBe(true)
            expect(tree.isFilterMatch('b')).toBe(true)
            expect(tree.getFlatIds()).toContain('a')
            expect(tree.getFlatIds()).toContain('b')
        })

        it('expanding a node in search mode emits skeletons for unloaded children', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'root', childrenCount: 5 }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                }),
                createAdapterNode({
                    id: 'b',
                    parent: 'root',
                    level: 2,
                }),
            ])

            const tree = new Tree(store, ['root'])

            // Root is an ancestor, 'a' and 'b' are matches
            tree.setSearchResults(['a', 'b'], ['root'], 4)

            // Filter-set children are shown without expansion
            expect(tree.getFlatIds()).toEqual(['root', 'a', 'b'])

            // Expand root. Pre-flush: filter-set children (a, b) are
            // skipped. loadedCount=2, totalCount=5 → 3 skeletons.
            tree.openSearch('root')

            const flatIds = tree.getFlatIds()
            expect(flatIds).toHaveLength(4) // root + 3 skeletons
            expect(flatIds[0]).toBe('root')
            expect(flatIds[1]).toBe('skeleton:root:2')
            expect(flatIds[2]).toBe('skeleton:root:3')
            expect(flatIds[3]).toBe('skeleton:root:4')
        })

        it('getTotalResultCount reports total from pager', async () => {
            const store = await createPopulatedStore([
                createAdapterNode({ id: 'root' }),
            ])
            const tree = new Tree(store, ['root'])

            expect(tree.getTotalResultCount()).toBe(0)

            tree.setSearchResults(['root'], [], 42)
            expect(tree.getTotalResultCount()).toBe(42)
        })
    })

    describe('loadChildren in search mode', () => {
        it('loadChildren no-ops when node is not search-open', async () => {
            const adapter = createMockAdapter({
                getNodesByIds: vi.fn().mockResolvedValue([
                    createAdapterNode({
                        id: 'root',
                        childrenCount: 10,
                    }),
                ]),
                getNodeChildren: vi
                    .fn()
                    .mockRejectedValue(new Error('should not be called')),
            })
            const store = new NodeStore(adapter)
            await store.fetchNodesByIds(['root'])
            const tree = new Tree(store, ['root'])

            // Enter search mode but don't expand root
            tree.setSearchResults([], ['root'], 10)
            tree.loadChildren('root', 99)

            expect(adapter.getNodeChildren).not.toHaveBeenCalled()
        })

        it('expanding ancestor loads children and replaces skeletons in search mode', async () => {
            const page1Children = [
                createAdapterNode({
                    id: 'c',
                    parent: 'root',
                    level: 2,
                }),
                createAdapterNode({
                    id: 'd',
                    parent: 'root',
                    level: 2,
                }),
            ]
            const adapter = createMockAdapter({
                getNodesByIds: vi.fn().mockResolvedValue([
                    createAdapterNode({
                        id: 'root',
                        childrenCount: 100,
                    }),
                    createAdapterNode({
                        id: 'a',
                        parent: 'root',
                        level: 2,
                    }),
                ]),
                getNodeChildren: vi
                    .fn()
                    .mockResolvedValue(pagedResponse(page1Children, 1, 2)),
            })
            const store = new NodeStore(adapter)
            await store.fetchNodesByIds(['root', 'a'])

            const tree = new Tree(store, ['root'])

            // Search mode: 'a' is a match, root is ancestor
            tree.setSearchResults(['a'], ['root'], 5)

            // Only filter-set nodes visible: root and match 'a'
            expect(tree.getFlatIds()).toEqual(['root', 'a'])

            // Expand root in search mode — childrenIds becomes only {c, d}
            // after flush, so 'a' (match on later page) is no longer visible
            tree.openSearch('root')
            tree.loadChildren('root', 1)

            await vi.waitFor(() => {
                const ids = tree.getFlatIds()
                // root + c + d (from page 1) + remaining skeletons
                // 'a' is not in childrenIds after flush, so not walked
                expect(ids[0]).toBe('root')
                expect(ids[1]).toBe('c')
                expect(ids[2]).toBe('d')
                expect(ids[3]).toBe('skeleton:root:2')
                expect(ids).toHaveLength(1 + 2 + 98) // root + 2 page1 + 98 skeletons
            })
        })

        it('search match not on loaded page disappears after sibling load', async () => {
            const adapter = createMockAdapter({
                getNodesByIds: vi.fn().mockResolvedValue([
                    createAdapterNode({
                        id: 'root',
                        childrenCount: 100,
                    }),
                    // This match would be on page 2 (index 50+)
                    createAdapterNode({
                        id: 'match',
                        parent: 'root',
                        level: 2,
                    }),
                ]),
                getNodeChildren: vi.fn().mockResolvedValue(
                    pagedResponse(
                        [
                            createAdapterNode({
                                id: 'child1',
                                parent: 'root',
                                level: 2,
                            }),
                        ],
                        1,
                        50
                    )
                ),
            })
            const store = new NodeStore(adapter)
            await store.fetchNodesByIds(['root', 'match'])

            const tree = new Tree(store, ['root'])

            // Search mode: 'match' is the only match
            tree.setSearchResults(['match'], ['root'], 3)
            expect(tree.getFlatIds()).toEqual(['root', 'match'])

            // Expand root — flush clears and rebuilds from page 1 only
            tree.openSearch('root')
            tree.loadChildren('root', 0)

            await vi.waitFor(() => {
                const ids = tree.getFlatIds()
                // root + child1 (from page 1) + skeletons.
                // 'match' is not in page 1, so it disappears.
                expect(ids[0]).toBe('root')
                expect(ids[1]).toBe('child1')
                expect(ids).not.toContain('match')
            })
        })

        it('search match appears at natural position when its page loads', async () => {
            let resolvePage2: (value: PagedResponse<AdapterNode>) => void
            const page2Promise = new Promise<PagedResponse<AdapterNode>>(
                (resolve) => {
                    resolvePage2 = resolve
                }
            )

            const page1Children = [
                createAdapterNode({
                    id: 'child1',
                    parent: 'root',
                    level: 2,
                }),
            ]

            const adapter = createMockAdapter({
                getNodesByIds: vi.fn().mockResolvedValue([
                    createAdapterNode({
                        id: 'root',
                        childrenCount: 60,
                    }),
                    createAdapterNode({
                        id: 'match',
                        parent: 'root',
                        level: 2,
                    }),
                ]),
                getNodeChildren: vi
                    .fn()
                    .mockResolvedValueOnce(pagedResponse(page1Children, 1, 50))
                    .mockReturnValueOnce(page2Promise),
            })
            const store = new NodeStore(adapter)
            await store.fetchNodesByIds(['root', 'match'])

            const tree = new Tree(store, ['root'])
            tree.setSearchResults(['match'], ['root'], 3)
            tree.openSearch('root')
            tree.loadChildren('root', 0)

            // After page 1, match is not visible (not on page 1)
            await vi.waitFor(() => {
                const ids = tree.getFlatIds()
                expect(ids[1]).toBe('child1')
                expect(ids).not.toContain('match')
            })

            // Load page 2, which contains match at its natural position
            const page2Children = [
                createAdapterNode({
                    id: 'child50',
                    parent: 'root',
                    level: 2,
                }),
                createAdapterNode({
                    id: 'match',
                    parent: 'root',
                    level: 2,
                }),
                createAdapterNode({
                    id: 'child52',
                    parent: 'root',
                    level: 2,
                }),
            ]
            tree.loadChildren('root', 52)

            // Resolve page 2 promise
            resolvePage2!(pagedResponse(page2Children, 2, 50))

            await vi.waitFor(() => {
                const ids = tree.getFlatIds()
                // root + child1 + child50 + match + child52 + skeletons
                expect(ids[1]).toBe('child1')
                expect(ids[2]).toBe('child50')
                expect(ids[3]).toBe('match')
                expect(ids[4]).toBe('child52')
            })
        })

        it('toggle in search mode eagerly loads children', async () => {
            const page1Children = [
                createAdapterNode({
                    id: 'child',
                    parent: 'root',
                    level: 2,
                }),
            ]
            const adapter = createMockAdapter({
                getNodesByIds: vi.fn().mockResolvedValue([
                    createAdapterNode({
                        id: 'root',
                        childrenCount: 1,
                    }),
                ]),
                getNodeChildren: vi
                    .fn()
                    .mockResolvedValue(pagedResponse(page1Children, 1, 50)),
            })
            const store = new NodeStore(adapter)
            await store.fetchNodesByIds(['root'])
            const tree = new Tree(store, ['root'])

            tree.setSearchResults([], ['root'], 1)
            tree.toggle('root')

            expect(tree.isSearchOpen('root')).toBe(true)

            await vi.waitFor(() => {
                expect(adapter.getNodeChildren).toHaveBeenCalledWith('root', 1)
            })
        })

        it('fromPage skips already-loaded pages', async () => {
            const adapter = createMockAdapter({
                getNodesByIds: vi.fn().mockResolvedValue([
                    createAdapterNode({
                        id: 'root',
                        childrenCount: 200,
                    }),
                ]),
                getNodeChildren: vi.fn((_id: string, page: number) => {
                    if (page === 1) {
                        return Promise.resolve(
                            pagedResponse(
                                Array.from({ length: 50 }, (_, i) =>
                                    createAdapterNode({
                                        id: `child${i}`,
                                        parent: 'root',
                                        level: 2,
                                    })
                                ),
                                1,
                                50
                            )
                        )
                    }
                    if (page === 2) {
                        return Promise.resolve(
                            pagedResponse(
                                [
                                    createAdapterNode({
                                        id: 'child50',
                                        parent: 'root',
                                        level: 2,
                                    }),
                                ],
                                2,
                                50
                            )
                        )
                    }
                    return Promise.resolve(pagedResponse([], page, 50))
                }),
            })
            const store = new NodeStore(adapter)
            await store.fetchNodesByIds(['root'])

            const tree = new Tree(store, ['root'])
            tree.open('root')
            tree.loadChildren('root', 49)

            await vi.waitFor(() => {
                const ids = tree.getFlatIds()
                expect(ids).toHaveLength(1 + 50 + 150) // root + 50 page1 + 150 skeletons
            })

            // Clear the mock call history so we can verify the next call
            vi.clearAllMocks()

            // Load page 2 — fromPage should be 2
            tree.loadChildren('root', 51)

            await vi.waitFor(() => {
                expect(adapter.getNodeChildren).toHaveBeenCalledWith('root', 2)
                expect(adapter.getNodeChildren).not.toHaveBeenCalledWith(
                    'root',
                    3
                )
            })
        })
    })

    describe('toggle', () => {
        it('toggle open eagerly loads page 1', async () => {
            const page1Children = [
                createAdapterNode({
                    id: 'child',
                    parent: 'root',
                    level: 2,
                }),
            ]
            const adapter = createMockAdapter({
                getNodesByIds: vi.fn().mockResolvedValue([
                    createAdapterNode({
                        id: 'root',
                        childrenCount: 1,
                    }),
                ]),
                getNodeChildren: vi
                    .fn()
                    .mockResolvedValue(pagedResponse(page1Children, 1, 50)),
            })
            const store = new NodeStore(adapter)
            await store.fetchNodesByIds(['root'])
            const tree = new Tree(store, ['root'])

            tree.toggle('root')

            expect(tree.isOpen('root')).toBe(true)

            await vi.waitFor(() => {
                expect(adapter.getNodeChildren).toHaveBeenCalledWith('root', 1)
            })
        })
    })
})
