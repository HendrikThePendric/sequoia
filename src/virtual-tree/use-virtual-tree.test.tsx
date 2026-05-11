import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { NodeStore, NodeStoreProvider } from '../node-store'
import type { AdapterNode, PagedResponse, TreeAdapter } from '../node-store'
import { TreeProvider } from '../tree'
import { useVirtualTree } from './use-virtual-tree'

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

describe('useVirtualTree', () => {
    it('returns flatIds matching the tree', async () => {
        const nodes = [
            createAdapterNode({ id: 'r1' }),
            createAdapterNode({ id: 'r2' }),
        ]
        const adapter = createMockAdapter({
            getNodesByIds: vi.fn().mockResolvedValue(nodes),
        })
        const store = new NodeStore(adapter)
        await store.fetchNodesByIds(['r1', 'r2'])

        const wrapper = createWrapper(adapter, ['r1', 'r2'])
        const { result } = renderHook(() => useVirtualTree(), {
            wrapper,
        })

        expect(result.current.flatIds).toEqual(['r1', 'r2'])
        expect(result.current.parentRef).toBeDefined()
        expect(result.current.totalSize).toBeGreaterThan(0)
    })

    it('accepts custom rowHeight and overscan', async () => {
        const nodes = [createAdapterNode({ id: 'r1' })]
        const adapter = createMockAdapter({
            getNodesByIds: vi.fn().mockResolvedValue(nodes),
        })
        const store = new NodeStore(adapter)
        await store.fetchNodesByIds(['r1'])

        const wrapper = createWrapper(adapter, ['r1'])
        const { result } = renderHook(() => useVirtualTree({ rowHeight: 32 }), {
            wrapper,
        })

        expect(result.current.rowHeight).toBe(32)
    })
})
