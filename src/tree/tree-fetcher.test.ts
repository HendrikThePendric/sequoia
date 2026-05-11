import { describe, it, expect, vi } from 'vitest'
import { NodeStore } from '../node-store'
import type { AdapterNode, PagedResponse, TreeAdapter } from '../node-store'
import { TreeFetcher } from './tree-fetcher'

// -- Helpers --

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
    page: number,
    pageSize: number
): PagedResponse<AdapterNode> {
    return {
        pager: { page, pageSize, total: data.length, pages: 1 },
        data,
    }
}

function createMockAdapter(overrides: Partial<TreeAdapter> = {}): TreeAdapter {
    return {
        getNodesByIds: vi.fn().mockResolvedValue([]),
        getNodeChildren: vi.fn().mockRejectedValue(new Error('unexpected')),
        getNodeDescendants: vi.fn().mockRejectedValue(new Error('unexpected')),
        getFilteredNodes: vi.fn().mockRejectedValue(new Error('unexpected')),
        ...overrides,
    }
}

type Deferred<T> = {
    promise: Promise<T>
    resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((r) => {
        resolve = r
    })
    return { promise, resolve }
}

describe('TreeFetcher', () => {
    describe('loadChildren', () => {
        it('fires pages in parallel for the given offset range', async () => {
            const getNodeChildren = vi
                .fn()
                .mockResolvedValue(pagedResponse([], 1, 50))
            const adapter = createMockAdapter({
                getNodesByIds: vi
                    .fn()
                    .mockResolvedValue([
                        createAdapterNode({ id: 'root', childrenCount: 200 }),
                    ]),
                getNodeChildren,
            })
            const store = new NodeStore(adapter)
            await store.fetchNodesByIds(['root'])

            const fetcher = new TreeFetcher(store, 50)

            fetcher.loadChildren('root', 149)

            await vi.waitFor(() => {
                expect(getNodeChildren).toHaveBeenCalledTimes(3)
            })

            expect(getNodeChildren).toHaveBeenCalledWith('root', 1)
            expect(getNodeChildren).toHaveBeenCalledWith('root', 2)
            expect(getNodeChildren).toHaveBeenCalledWith('root', 3)
        })

        it('inserts children in page order regardless of response order', async () => {
            const def1 = deferred<PagedResponse<AdapterNode>>()
            const def2 = deferred<PagedResponse<AdapterNode>>()
            const def3 = deferred<PagedResponse<AdapterNode>>()

            const getNodeChildren = vi
                .fn()
                .mockImplementation((_id: string, page: number) => {
                    if (page === 1) {
                        return def1.promise
                    }
                    if (page === 2) {
                        return def2.promise
                    }
                    if (page === 3) {
                        return def3.promise
                    }
                    throw new Error('unexpected page')
                })

            const adapter = createMockAdapter({
                getNodesByIds: vi
                    .fn()
                    .mockResolvedValue([
                        createAdapterNode({ id: 'root', childrenCount: 6 }),
                    ]),
                getNodeChildren,
            })
            const store = new NodeStore(adapter)
            await store.fetchNodesByIds(['root'])

            const fetcher = new TreeFetcher(store, 2)
            const listener = vi.fn()
            fetcher.onBatchComplete(listener)

            fetcher.loadChildren('root', 5)

            // Resolve out of order: page 2, then 3, then 1
            def2.resolve(
                pagedResponse(
                    [
                        createAdapterNode({
                            id: 'p2a',
                            parent: 'root',
                            level: 2,
                        }),
                        createAdapterNode({
                            id: 'p2b',
                            parent: 'root',
                            level: 2,
                        }),
                    ],
                    2,
                    2
                )
            )

            expect(listener).not.toHaveBeenCalled()

            def3.resolve(
                pagedResponse(
                    [
                        createAdapterNode({
                            id: 'p3a',
                            parent: 'root',
                            level: 2,
                        }),
                        createAdapterNode({
                            id: 'p3b',
                            parent: 'root',
                            level: 2,
                        }),
                    ],
                    3,
                    2
                )
            )

            expect(listener).not.toHaveBeenCalled()

            def1.resolve(
                pagedResponse(
                    [
                        createAdapterNode({
                            id: 'p1a',
                            parent: 'root',
                            level: 2,
                        }),
                        createAdapterNode({
                            id: 'p1b',
                            parent: 'root',
                            level: 2,
                        }),
                    ],
                    1,
                    2
                )
            )

            await vi.waitFor(() => {
                expect(listener).toHaveBeenCalledTimes(1)
            })

            const parent = store.getNode('root')
            expect(parent).toBeDefined()
            expect([...parent!.childrenIds]).toEqual([
                'p1a',
                'p1b',
                'p2a',
                'p2b',
                'p3a',
                'p3b',
            ])
        })

        it('coalesces: second loadChildren extends existing batch', async () => {
            const def1 = deferred<PagedResponse<AdapterNode>>()
            const def2 = deferred<PagedResponse<AdapterNode>>()

            const getNodeChildren = vi
                .fn()
                .mockImplementation((_id: string, page: number) => {
                    if (page === 1) {
                        return def1.promise
                    }
                    if (page === 2) {
                        return def2.promise
                    }
                    throw new Error('unexpected page')
                })

            const adapter = createMockAdapter({
                getNodesByIds: vi
                    .fn()
                    .mockResolvedValue([
                        createAdapterNode({ id: 'root', childrenCount: 4 }),
                    ]),
                getNodeChildren,
            })
            const store = new NodeStore(adapter)
            await store.fetchNodesByIds(['root'])

            const fetcher = new TreeFetcher(store, 2)
            const listener = vi.fn()
            fetcher.onBatchComplete(listener)

            // First call: maxOffset=1 → page 1 only
            fetcher.loadChildren('root', 1)

            // Second call: maxOffset=3 → adds page 2
            fetcher.loadChildren('root', 3)

            // Resolve page 2 first
            def2.resolve(
                pagedResponse(
                    [
                        createAdapterNode({
                            id: 'p2a',
                            parent: 'root',
                            level: 2,
                        }),
                        createAdapterNode({
                            id: 'p2b',
                            parent: 'root',
                            level: 2,
                        }),
                    ],
                    2,
                    2
                )
            )

            expect(listener).not.toHaveBeenCalled()

            def1.resolve(
                pagedResponse(
                    [
                        createAdapterNode({
                            id: 'p1a',
                            parent: 'root',
                            level: 2,
                        }),
                        createAdapterNode({
                            id: 'p1b',
                            parent: 'root',
                            level: 2,
                        }),
                    ],
                    1,
                    2
                )
            )

            await vi.waitFor(() => {
                expect(listener).toHaveBeenCalledTimes(1)
            })

            expect([...store.getNode('root')!.childrenIds]).toEqual([
                'p1a',
                'p1b',
                'p2a',
                'p2b',
            ])
        })

        it('deduplicates same page requested twice while in-flight', async () => {
            const def1 = deferred<PagedResponse<AdapterNode>>()

            const getNodeChildren = vi
                .fn()
                .mockImplementation((_id: string, page: number) => {
                    if (page === 1) {
                        return def1.promise
                    }
                    throw new Error('unexpected page')
                })

            const adapter = createMockAdapter({
                getNodesByIds: vi
                    .fn()
                    .mockResolvedValue([
                        createAdapterNode({ id: 'root', childrenCount: 2 }),
                    ]),
                getNodeChildren,
            })
            const store = new NodeStore(adapter)
            await store.fetchNodesByIds(['root'])

            const fetcher = new TreeFetcher(store, 2)

            // Both calls request page 1
            fetcher.loadChildren('root', 0)
            fetcher.loadChildren('root', 1)

            expect(getNodeChildren).toHaveBeenCalledTimes(1)

            def1.resolve(
                pagedResponse(
                    [
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
                    ],
                    1,
                    2
                )
            )

            // Wait for async cleanup, adapter should not be called again
            await new Promise((r) => setTimeout(r, 50))
            expect(getNodeChildren).toHaveBeenCalledTimes(1)
        })

        it('no-ops when all children are already loaded', async () => {
            const getNodeChildren = vi
                .fn()
                .mockRejectedValue(new Error('should not be called'))

            const adapter = createMockAdapter({
                getNodesByIds: vi.fn().mockResolvedValue([
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
                ]),
                getNodeChildren,
            })
            const store = new NodeStore(adapter)
            await store.fetchNodesByIds(['root', 'a', 'b'])

            const fetcher = new TreeFetcher(store, 2)
            const listener = vi.fn()
            fetcher.onBatchComplete(listener)

            fetcher.loadChildren('root', 99)

            expect(getNodeChildren).not.toHaveBeenCalled()
            expect(listener).not.toHaveBeenCalled()
        })

        it('no-ops when parent node is not in the store', () => {
            const getNodeChildren = vi.fn()
            const adapter = createMockAdapter({ getNodeChildren })
            const store = new NodeStore(adapter)

            const fetcher = new TreeFetcher(store, 50)

            fetcher.loadChildren('nonexistent', 99)

            expect(getNodeChildren).not.toHaveBeenCalled()
        })
    })

    describe('onBatchComplete', () => {
        it('calls listener when batch completes and unsubscribe works', async () => {
            const adapter = createMockAdapter({
                getNodesByIds: vi
                    .fn()
                    .mockResolvedValue([
                        createAdapterNode({ id: 'root', childrenCount: 100 }),
                    ]),
                getNodeChildren: vi
                    .fn()
                    .mockResolvedValue(pagedResponse([], 1, 50)),
            })
            const store = new NodeStore(adapter)
            await store.fetchNodesByIds(['root'])

            const fetcher = new TreeFetcher(store, 50)
            const listener = vi.fn()
            const unsub = fetcher.onBatchComplete(listener)

            fetcher.loadChildren('root', 99)

            await vi.waitFor(() => {
                expect(listener).toHaveBeenCalledTimes(1)
            })

            unsub()
            fetcher.loadChildren('root', 149)

            await new Promise((r) => setTimeout(r, 50))
            expect(listener).toHaveBeenCalledTimes(1)
        })
    })
})
