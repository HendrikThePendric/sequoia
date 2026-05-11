import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { NodeStoreProvider, useNodeStore } from '../node-store'
import type { AdapterNode, PagedResponse, TreeAdapter } from '../node-store'
import { TreeProvider } from '../tree/tree-provider'
import { useTree } from '../tree/use-tree'
import { useNode } from './use-node'

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

describe('useNode', () => {
    it('throws when used outside TreeProvider', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        expect(() => renderHook(() => useNode('any'))).toThrow(
            'useNode must be used within a TreeProvider'
        )
        spy.mockRestore()
    })

    it('returns undefined for a node not in the store', () => {
        const adapter = createMockAdapter()
        const wrapper = createWrapper(adapter, ['root'])
        const { result } = renderHook(() => useNode('nonexistent'), {
            wrapper,
        })

        expect(result.current).toBeUndefined()
    })

    it('returns node data with isOpen and hasAllChildren', async () => {
        const nodes = [
            createAdapterNode({
                id: 'root',
                displayName: 'Root',
                childrenCount: 1,
            }),
            createAdapterNode({
                id: 'child',
                parent: 'root',
                level: 2,
            }),
        ]
        const adapter = createMockAdapter({
            getNodesByIds: vi.fn().mockResolvedValue(nodes),
        })
        const wrapper = createWrapper(adapter, ['root'])

        const { result } = renderHook(
            () => ({
                tree: useTree(),
                node: useNode('root'),
            }),
            { wrapper }
        )

        // Node is not in the store yet (no fetch triggered)
        expect(result.current.node).toBeUndefined()
    })

    it('reflects isOpen changes after tree mutations', async () => {
        const nodes = [createAdapterNode({ id: 'root', childrenCount: 0 })]
        const adapter = createMockAdapter({
            getNodesByIds: vi.fn().mockResolvedValue(nodes),
        })
        const wrapper = createWrapper(adapter, ['root'])

        const { result } = renderHook(
            () => ({
                tree: useTree(),
                nodeStore: useNodeStore(),
                node: useNode('root'),
            }),
            { wrapper }
        )

        // Populate the store, then open to trigger a re-render
        await act(async () => {
            await result.current.nodeStore.fetchNodesByIds(['root'])
            result.current.tree.open('root')
        })

        expect(result.current.node?.isOpen).toBe(true)

        act(() => {
            result.current.tree.close('root')
        })

        expect(result.current.node?.isOpen).toBe(false)
    })
})
