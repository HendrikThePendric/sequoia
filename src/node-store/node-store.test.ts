import { describe, it, expect, vi } from 'vitest'
import { NodeStore } from './node-store'
import type { AdapterNode, PagedResponse, TreeAdapter } from './types'

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

describe('NodeStore', () => {
    describe('getNode / hasNode', () => {
        it('returns undefined for unknown nodes', () => {
            const store = new NodeStore(createMockAdapter())
            expect(store.getNode('unknown')).toBeUndefined()
            expect(store.hasNode('unknown')).toBe(false)
        })

        it('returns a node after it has been fetched', async () => {
            const nodeA = createAdapterNode({ id: 'a' })
            const adapter = createMockAdapter({
                getNodesByIds: vi.fn().mockResolvedValue([nodeA]),
            })
            const store = new NodeStore(adapter)

            await store.fetchNodesByIds(['a'])

            expect(store.hasNode('a')).toBe(true)
            expect(store.getNode('a')).toEqual(
                expect.objectContaining({ id: 'a', displayName: 'Node a' })
            )
        })
    })

    describe('hasAllChildren', () => {
        it('returns false for unknown nodes', () => {
            const store = new NodeStore(createMockAdapter())
            expect(store.hasAllChildren('unknown')).toBe(false)
        })

        it('returns true when childrenIds.size >= childrenCount', async () => {
            const parent = createAdapterNode({
                id: 'parent',
                childrenCount: 2,
            })
            const childA = createAdapterNode({
                id: 'a',
                parent: 'parent',
                path: '/parent/a',
                level: 2,
            })
            const childB = createAdapterNode({
                id: 'b',
                parent: 'parent',
                path: '/parent/b',
                level: 2,
            })

            const adapter = createMockAdapter({
                getNodesByIds: vi.fn().mockResolvedValue([parent]),
                getNodeChildren: vi
                    .fn()
                    .mockResolvedValue(pagedResponse([childA, childB])),
            })
            const store = new NodeStore(adapter)

            await store.fetchNodesByIds(['parent'])
            expect(store.hasAllChildren('parent')).toBe(false)

            await store.fetchNodeChildren('parent', 1)
            expect(store.hasAllChildren('parent')).toBe(true)
        })
    })

    describe('fetchNodesByIds', () => {
        it('only fetches IDs not already in the store', async () => {
            const nodeA = createAdapterNode({ id: 'a' })
            const nodeB = createAdapterNode({ id: 'b' })
            const getNodesByIds = vi
                .fn()
                .mockResolvedValueOnce([nodeA])
                .mockResolvedValueOnce([nodeB])

            const store = new NodeStore(createMockAdapter({ getNodesByIds }))

            await store.fetchNodesByIds(['a'])
            await store.fetchNodesByIds(['a', 'b'])

            expect(getNodesByIds).toHaveBeenCalledTimes(2)
            expect(getNodesByIds).toHaveBeenNthCalledWith(1, ['a'])
            expect(getNodesByIds).toHaveBeenNthCalledWith(2, ['b'])
        })

        it('skips the fetch entirely when all IDs are cached', async () => {
            const nodeA = createAdapterNode({ id: 'a' })
            const getNodesByIds = vi.fn().mockResolvedValue([nodeA])

            const store = new NodeStore(createMockAdapter({ getNodesByIds }))

            await store.fetchNodesByIds(['a'])
            await store.fetchNodesByIds(['a'])

            expect(getNodesByIds).toHaveBeenCalledTimes(1)
        })

        it('returns all requested nodes in input order', async () => {
            const nodeA = createAdapterNode({ id: 'a' })
            const nodeB = createAdapterNode({ id: 'b' })
            const getNodesByIds = vi.fn().mockResolvedValue([nodeA, nodeB])

            const store = new NodeStore(createMockAdapter({ getNodesByIds }))

            const result = await store.fetchNodesByIds(['b', 'a'])
            expect(result.map((n) => n.id)).toEqual(['b', 'a'])
        })

        it('filters out IDs that the adapter did not return', async () => {
            const nodeA = createAdapterNode({ id: 'a' })
            const getNodesByIds = vi.fn().mockResolvedValue([nodeA])

            const store = new NodeStore(createMockAdapter({ getNodesByIds }))

            const result = await store.fetchNodesByIds(['a', 'nonexistent'])
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('a')
        })

        it('registers children with their parent', async () => {
            const parent = createAdapterNode({
                id: 'parent',
                childrenCount: 1,
            })
            const child = createAdapterNode({
                id: 'child',
                parent: 'parent',
                path: '/parent/child',
                level: 2,
            })
            const getNodesByIds = vi.fn().mockResolvedValue([parent, child])

            const store = new NodeStore(createMockAdapter({ getNodesByIds }))

            await store.fetchNodesByIds(['parent', 'child'])

            const parentNode = store.getNode('parent')!
            expect(parentNode.childrenIds.has('child')).toBe(true)
        })
    })

    describe('fetchNodeChildren', () => {
        it('stores returned nodes and updates parent childrenIds', async () => {
            const parent = createAdapterNode({
                id: 'p',
                childrenCount: 2,
            })
            const childA = createAdapterNode({
                id: 'a',
                parent: 'p',
                path: '/p/a',
                level: 2,
            })
            const childB = createAdapterNode({
                id: 'b',
                parent: 'p',
                path: '/p/b',
                level: 2,
            })

            const adapter = createMockAdapter({
                getNodesByIds: vi.fn().mockResolvedValue([parent]),
                getNodeChildren: vi
                    .fn()
                    .mockResolvedValue(pagedResponse([childA, childB])),
            })
            const store = new NodeStore(adapter)

            // First get the parent into the store
            await store.fetchNodesByIds(['p'])

            const result = await store.fetchNodeChildren('p', 1)
            expect(result.data).toHaveLength(2)
            expect(result.data[0].id).toBe('a')
            expect(result.data[1].id).toBe('b')

            const parentNode = store.getNode('p')!
            expect(parentNode.childrenIds).toEqual(new Set(['a', 'b']))
        })

        it('passes page parameter to adapter', async () => {
            const getNodeChildren = vi.fn().mockResolvedValue(pagedResponse([]))

            const store = new NodeStore(createMockAdapter({ getNodeChildren }))

            await store.fetchNodeChildren('p', 3)
            expect(getNodeChildren).toHaveBeenCalledWith('p', 3)
        })
    })

    describe('fetchNodeDescendants', () => {
        it('stores returned nodes and registers children', async () => {
            const root = createAdapterNode({
                id: 'r',
                childrenCount: 1,
            })
            const child = createAdapterNode({
                id: 'c',
                parent: 'r',
                path: '/r/c',
                level: 2,
                childrenCount: 1,
            })
            const grandchild = createAdapterNode({
                id: 'gc',
                parent: 'c',
                path: '/r/c/gc',
                level: 3,
            })

            const adapter = createMockAdapter({
                getNodesByIds: vi.fn().mockResolvedValue([root]),
                getNodeDescendants: vi
                    .fn()
                    .mockResolvedValue(pagedResponse([child, grandchild])),
            })
            const store = new NodeStore(adapter)

            await store.fetchNodesByIds(['r'])
            const result = await store.fetchNodeDescendants('r', 1)

            expect(result.data).toHaveLength(2)
            expect(store.getNode('r')!.childrenIds).toEqual(new Set(['c']))
            expect(store.getNode('c')!.childrenIds).toEqual(new Set(['gc']))
        })

        it('passes maxLevel to adapter', async () => {
            const getNodeDescendants = vi
                .fn()
                .mockResolvedValue(pagedResponse([]))

            const store = new NodeStore(
                createMockAdapter({ getNodeDescendants })
            )

            await store.fetchNodeDescendants('r', 1, 3)
            expect(getNodeDescendants).toHaveBeenCalledWith('r', 1, 3)
        })
    })

    describe('fetchFilteredNodes', () => {
        it('always calls the adapter', async () => {
            const nodeA = createAdapterNode({ id: 'a' })
            const getFilteredNodes = vi
                .fn()
                .mockResolvedValue(pagedResponse([nodeA]))

            const store = new NodeStore(createMockAdapter({ getFilteredNodes }))

            await store.fetchFilteredNodes('search', 1)
            await store.fetchFilteredNodes('search', 1)

            expect(getFilteredNodes).toHaveBeenCalledTimes(2)
        })

        it('passes filter, page, and options to adapter', async () => {
            const getFilteredNodes = vi
                .fn()
                .mockResolvedValue(pagedResponse([]))

            const store = new NodeStore(createMockAdapter({ getFilteredNodes }))

            const options = {
                rootIds: ['r1'],
                includeAncestors: true,
            }
            await store.fetchFilteredNodes('query', 2, options)

            expect(getFilteredNodes).toHaveBeenCalledWith('query', 2, options)
        })

        it('stores returned nodes in the cache', async () => {
            const nodeA = createAdapterNode({ id: 'a' })
            const getFilteredNodes = vi
                .fn()
                .mockResolvedValue(pagedResponse([nodeA]))

            const store = new NodeStore(createMockAdapter({ getFilteredNodes }))

            await store.fetchFilteredNodes('search', 1)
            expect(store.hasNode('a')).toBe(true)
        })
    })

    describe('#storeNode preserves childrenIds', () => {
        it('does not reset childrenIds when re-fetching a node', async () => {
            const parent = createAdapterNode({
                id: 'p',
                childrenCount: 1,
            })
            const child = createAdapterNode({
                id: 'c',
                parent: 'p',
                path: '/p/c',
                level: 2,
            })

            const adapter = createMockAdapter({
                getNodesByIds: vi
                    .fn()
                    .mockResolvedValueOnce([parent, child])
                    .mockResolvedValueOnce([parent]),
                getNodeChildren: vi
                    .fn()
                    .mockResolvedValue(pagedResponse([child])),
            })
            const store = new NodeStore(adapter)

            // Fetch parent + child, building childrenIds
            await store.fetchNodesByIds(['p', 'c'])
            expect(store.getNode('p')!.childrenIds.has('c')).toBe(true)

            // Re-fetch parent via filtered nodes (simulating a different path)
            const getFilteredNodes = vi
                .fn()
                .mockResolvedValue(pagedResponse([parent]))
            const store2Adapter = createMockAdapter({
                getNodesByIds: vi.fn().mockResolvedValue([parent, child]),
                getFilteredNodes,
            })
            const store2 = new NodeStore(store2Adapter)

            await store2.fetchNodesByIds(['p', 'c'])
            expect(store2.getNode('p')!.childrenIds.has('c')).toBe(true)

            // Re-fetch parent alone -- childrenIds should be preserved
            await store2.fetchFilteredNodes('search', 1)
            expect(store2.getNode('p')!.childrenIds.has('c')).toBe(true)
        })
    })
})
