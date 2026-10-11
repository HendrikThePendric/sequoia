import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NodeStore } from '../node-store'
import type { AdapterNode, DataAdapter } from '../node-store'
import { Tree } from '../tree'
import { useTreeSelection } from './use-tree-selection'
import type {
    UseTreeSelectionOptions,
    UseTreeSelectionReturn,
} from './use-tree-selection'

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

function createMockAdapter(): DataAdapter {
    return {
        getNodesByIds: vi.fn().mockResolvedValue([]),
        getNodeChildren: vi.fn().mockResolvedValue({
            pager: { page: 1, pageSize: 50, total: 0, pages: 0 },
            data: [],
        }),
        getNodeDescendants: vi.fn().mockResolvedValue({
            pager: { page: 1, pageSize: 50, total: 0, pages: 0 },
            data: [],
        }),
        getFilteredNodes: vi.fn().mockResolvedValue({
            pager: { page: 1, pageSize: 50, total: 0, pages: 0 },
            data: [],
            matchedIds: [],
            ancestorIds: [],
        }),
    }
}

async function createStore(nodes: AdapterNode[]): Promise<NodeStore> {
    const adapter = createMockAdapter()
    vi.mocked(adapter.getNodesByIds).mockResolvedValue(nodes)
    const store = new NodeStore(adapter)
    await store.fetchNodesByIds(nodes.map((n) => n.id))
    return store
}

function renderSelectionHook(
    tree: Tree,
    options: Partial<UseTreeSelectionOptions> = {}
) {
    return renderHook<UseTreeSelectionReturn, UseTreeSelectionOptions>(
        (opts) => useTreeSelection(opts),
        {
            initialProps: {
                tree,
                flatIds: tree.getFlatIds(),
                ...options,
            },
        }
    )
}

describe('useTreeSelection', () => {
    describe('toggle', () => {
        it('selects a node on first toggle', async () => {
            const store = await createStore([createAdapterNode({ id: 'root' })])
            const tree = new Tree(store, ['root'])
            const { result } = renderSelectionHook(tree)

            act(() => {
                result.current.toggle('root')
            })

            expect(result.current.isSelected('root')).toBe(true)
            expect(result.current.count).toBe(1)
        })

        it('deselects a node on second toggle', async () => {
            const store = await createStore([createAdapterNode({ id: 'root' })])
            const tree = new Tree(store, ['root'])
            const { result } = renderSelectionHook(tree)

            act(() => {
                result.current.toggle('root')
            })
            act(() => {
                result.current.toggle('root')
            })

            expect(result.current.isSelected('root')).toBe(false)
            expect(result.current.count).toBe(0)
        })

        it('can select multiple nodes', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'r1' }),
                createAdapterNode({ id: 'r2' }),
                createAdapterNode({ id: 'r3' }),
            ])
            const tree = new Tree(store, ['r1', 'r2', 'r3'])
            const { result } = renderSelectionHook(tree)

            act(() => {
                result.current.toggle('r1')
            })
            act(() => {
                result.current.toggle('r3')
            })

            expect(result.current.isSelected('r1')).toBe(true)
            expect(result.current.isSelected('r2')).toBe(false)
            expect(result.current.isSelected('r3')).toBe(true)
            expect(result.current.count).toBe(2)
        })
    })

    describe('selectAll / deselectAll', () => {
        it('selects all visible non-skeleton nodes', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'r1' }),
                createAdapterNode({ id: 'r2' }),
                createAdapterNode({ id: 'r3' }),
            ])
            const tree = new Tree(store, ['r1', 'r2', 'r3'])
            const { result } = renderSelectionHook(tree)

            act(() => {
                result.current.selectAll()
            })

            expect(result.current.count).toBe(3)
            expect(result.current.isSelected('r1')).toBe(true)
            expect(result.current.isSelected('r2')).toBe(true)
            expect(result.current.isSelected('r3')).toBe(true)
        })

        it('deselects all nodes', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'r1' }),
                createAdapterNode({ id: 'r2' }),
            ])
            const tree = new Tree(store, ['r1', 'r2'])
            const { result } = renderSelectionHook(tree)

            act(() => {
                result.current.selectAll()
            })
            expect(result.current.count).toBe(2)

            act(() => {
                result.current.deselectAll()
            })
            expect(result.current.count).toBe(0)
        })
    })

    describe('selectRange', () => {
        it('selects nodes between from and to inclusive', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'a' }),
                createAdapterNode({ id: 'b' }),
                createAdapterNode({ id: 'c' }),
                createAdapterNode({ id: 'd' }),
            ])
            const tree = new Tree(store, ['a', 'b', 'c', 'd'])
            const { result } = renderSelectionHook(tree)

            act(() => {
                result.current.selectRange('a', 'c')
            })

            expect(result.current.isSelected('a')).toBe(true)
            expect(result.current.isSelected('b')).toBe(true)
            expect(result.current.isSelected('c')).toBe(true)
            expect(result.current.isSelected('d')).toBe(false)
            expect(result.current.count).toBe(3)
        })

        it('works with reversed order (to before from)', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'a' }),
                createAdapterNode({ id: 'b' }),
                createAdapterNode({ id: 'c' }),
            ])
            const tree = new Tree(store, ['a', 'b', 'c'])
            const { result } = renderSelectionHook(tree)

            act(() => {
                result.current.selectRange('c', 'a')
            })

            expect(result.current.isSelected('a')).toBe(true)
            expect(result.current.isSelected('b')).toBe(true)
            expect(result.current.isSelected('c')).toBe(true)
        })

        it('preserves previously selected nodes', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'a' }),
                createAdapterNode({ id: 'b' }),
                createAdapterNode({ id: 'c' }),
                createAdapterNode({ id: 'd' }),
            ])
            const tree = new Tree(store, ['a', 'b', 'c', 'd'])
            const { result } = renderSelectionHook(tree)

            act(() => {
                result.current.toggle('d')
            })
            act(() => {
                result.current.selectRange('a', 'b')
            })

            expect(result.current.isSelected('a')).toBe(true)
            expect(result.current.isSelected('b')).toBe(true)
            expect(result.current.isSelected('c')).toBe(false)
            expect(result.current.isSelected('d')).toBe(true)
            expect(result.current.count).toBe(3)
        })

        it('no-ops if either ID is not in flatIds', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'a' }),
                createAdapterNode({ id: 'b' }),
            ])
            const tree = new Tree(store, ['a', 'b'])
            const { result } = renderSelectionHook(tree)

            act(() => {
                result.current.selectRange('a', 'nonexistent')
            })

            expect(result.current.count).toBe(0)
        })
    })

    describe('isIndeterminate', () => {
        it('returns false for a node with no selected children', async () => {
            const store = await createStore([
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
            const { result } = renderSelectionHook(tree)

            expect(result.current.isIndeterminate('root')).toBe(false)
        })

        it('returns true when some (not all) children are selected', async () => {
            const store = await createStore([
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
            tree.open('root')
            const { result } = renderSelectionHook(tree)

            act(() => {
                result.current.toggle('a')
            })

            expect(result.current.isIndeterminate('root')).toBe(true)
        })

        it('returns false for a leaf node', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'a', childrenCount: 0 }),
            ])
            const tree = new Tree(store, ['a'])
            const { result } = renderSelectionHook(tree)

            expect(result.current.isIndeterminate('a')).toBe(false)
        })

        it('returns false when the node itself is selected', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'root', childrenCount: 1 }),
                createAdapterNode({
                    id: 'a',
                    parent: 'root',
                    level: 2,
                }),
            ])
            const tree = new Tree(store, ['root'])
            const { result } = renderSelectionHook(tree)

            act(() => {
                result.current.toggle('root')
            })

            expect(result.current.isIndeterminate('root')).toBe(false)
        })
    })

    describe('controlled mode', () => {
        it('uses external selectedIds when provided', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'a' }),
                createAdapterNode({ id: 'b' }),
            ])
            const tree = new Tree(store, ['a', 'b'])
            const { result } = renderSelectionHook(tree, {
                selectedIds: ['a'],
            })

            expect(result.current.isSelected('a')).toBe(true)
            expect(result.current.isSelected('b')).toBe(false)
            expect(result.current.count).toBe(1)
        })

        it('calls onSelectionChange when toggling in controlled mode', async () => {
            const store = await createStore([createAdapterNode({ id: 'a' })])
            const tree = new Tree(store, ['a'])
            const onChange = vi.fn()
            const { result } = renderSelectionHook(tree, {
                selectedIds: [],
                onSelectionChange: onChange,
            })

            act(() => {
                result.current.toggle('a')
            })

            expect(onChange).toHaveBeenCalledWith(['a'])
        })

        it('calls onSelectionChange when deselecting in controlled mode', async () => {
            const store = await createStore([createAdapterNode({ id: 'a' })])
            const tree = new Tree(store, ['a'])
            const onChange = vi.fn()
            const { result } = renderSelectionHook(tree, {
                selectedIds: ['a'],
                onSelectionChange: onChange,
            })

            act(() => {
                result.current.toggle('a')
            })

            expect(onChange).toHaveBeenCalledWith([])
        })
    })
})
