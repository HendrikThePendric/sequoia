import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { NodeStore, NodeStoreProvider } from '../node-store'
import type { AdapterNode, PagedResponse, TreeAdapter } from '../node-store'
import { TreeProvider } from './tree-provider'
import { useTree } from './use-tree'

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

function createWrapper(adapter: TreeAdapter, rootIds: string[]) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <NodeStoreProvider adapter={adapter}>
                <TreeProvider rootIds={rootIds}>{children}</TreeProvider>
            </NodeStoreProvider>
        )
    }
}

describe('useTree', () => {
    it('throws when used outside TreeProvider', () => {
        // Suppress React error boundary console noise
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

        expect(() => renderHook(() => useTree())).toThrow(
            'useTree must be used within a TreeProvider'
        )

        spy.mockRestore()
    })

    it('returns a tree instance with root IDs', async () => {
        const nodes = [
            createAdapterNode({ id: 'r1' }),
            createAdapterNode({ id: 'r2' }),
        ]
        const adapter = createMockAdapter({
            getNodesByIds: vi.fn().mockResolvedValue(nodes),
        })

        const wrapper = createWrapper(adapter, ['r1', 'r2'])
        const { result } = renderHook(() => useTree(), { wrapper })

        expect(result.current.getFlatIds()).toEqual(['r1', 'r2'])
    })

    it('re-renders when tree state changes', async () => {
        const nodes = [
            createAdapterNode({ id: 'root', childrenCount: 1 }),
            createAdapterNode({
                id: 'child',
                parent: 'root',
                level: 2,
            }),
        ]
        const adapter = createMockAdapter({
            getNodesByIds: vi.fn().mockResolvedValue(nodes),
        })

        // Pre-populate the store so the tree can walk children
        const store = new NodeStore(adapter)
        await store.fetchNodesByIds(['root', 'child'])

        // Use a wrapper that shares this pre-populated store
        const wrapper = createWrapper(adapter, ['root'])
        const { result } = renderHook(() => useTree(), { wrapper })

        // The hook's NodeStore is a different instance (created by provider),
        // so we test the subscription mechanism by calling open on the tree
        const tree = result.current

        act(() => {
            tree.open('root')
        })

        // After open, the tree should have re-rendered
        expect(result.current.isOpen('root')).toBe(true)
    })
})
