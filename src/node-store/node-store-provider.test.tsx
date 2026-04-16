import { renderHook } from '@testing-library/react'
import { type ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { NodeStore } from './node-store'
import { NodeStoreProvider } from './node-store-provider'
import type { TreeAdapter } from './types'
import { useNodeStore } from './use-node-store'

function createMockAdapter(): TreeAdapter {
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
        }),
    }
}

describe('NodeStoreProvider + useNodeStore', () => {
    it('provides a NodeStore instance to consumers', () => {
        const adapter = createMockAdapter()
        const wrapper = ({ children }: { children: ReactNode }) => (
            <NodeStoreProvider adapter={adapter}>{children}</NodeStoreProvider>
        )

        const { result } = renderHook(() => useNodeStore(), {
            wrapper,
        })

        expect(result.current).toBeInstanceOf(NodeStore)
    })

    it('provides the same NodeStore instance across re-renders', () => {
        const adapter = createMockAdapter()
        const wrapper = ({ children }: { children: ReactNode }) => (
            <NodeStoreProvider adapter={adapter}>{children}</NodeStoreProvider>
        )

        const { result, rerender } = renderHook(() => useNodeStore(), {
            wrapper,
        })

        const firstInstance = result.current
        rerender()
        expect(result.current).toBe(firstInstance)
    })

    it('throws when useNodeStore is used outside a provider', () => {
        // Suppress React error boundary console output
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

        expect(() => {
            renderHook(() => useNodeStore())
        }).toThrow('useNodeStore must be used within a NodeStoreProvider')

        spy.mockRestore()
    })
})
