import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import treeData from '../__fixtures__/mock-tree-api-test-data/tree.json'
import { Tree } from '../tree-generator/generators/generate-tree'
import { AsyncMockTreeApi } from './async-mock-tree-api'
import { WalkedNode } from './mock-tree-api'

describe('AsyncMockTreeApi', () => {
    const DELAY = 3
    const PAGE_SIZE = 3
    const tree = new AsyncMockTreeApi(treeData as Tree, {
        delay: DELAY,
        pageSize: PAGE_SIZE,
    })
    const setTimeoutMock = vi.fn<(callback: () => void, delay: number) => void>(
        (callback) => callback()
    )

    beforeAll(() => {
        vi.stubGlobal('setTimeout', setTimeoutMock)
    })

    afterAll(() => {
        vi.unstubAllGlobals()
        vi.clearAllMocks()
    })

    it('calls setTimeout with the configured delay for every method', () => {
        tree.getNodeById('1')
        tree.getNodesByIds(['1', '8'])
        tree.getNodeChildren('1', 1)
        tree.getNodeDescendants('1', 1)
        tree.getFilteredNodes((node: WalkedNode) => node.level === 3, 1)
        tree.getRootNodes(1)
        expect(setTimeoutMock).toHaveBeenCalledTimes(6)
        expect(
            setTimeoutMock.mock.calls.every((call) => call[1] === DELAY)
        ).toBe(true)
    })

    describe('paging', () => {
        it('getNodeChildren paginates correctly', async () => {
            // root "1" has 2 children, page size 3 => 1 page
            const page1 = await tree.getNodeChildren('1', 1)
            expect(page1).toMatchInlineSnapshot(`
                {
                  "pager": {
                    "page": 1,
                    "pageSize": 3,
                    "pages": 1,
                    "total": 2,
                  },
                  "results": [
                    {
                      "childrenCount": 2,
                      "displayName": "1-1",
                      "id": "2",
                      "level": 2,
                      "parent": "1",
                      "path": "/1/2",
                    },
                    {
                      "childrenCount": 2,
                      "displayName": "1-2",
                      "id": "5",
                      "level": 2,
                      "parent": "1",
                      "path": "/1/5",
                    },
                  ],
                }
            `)
        })

        it('getNodeDescendants spans multiple pages', async () => {
            // root "1" has 6 descendants, page size 3 => 2 pages
            const page1 = await tree.getNodeDescendants('1', 1)
            const page2 = await tree.getNodeDescendants('1', 2)
            expect(page1.pager).toMatchInlineSnapshot(`
                {
                  "page": 1,
                  "pageSize": 3,
                  "pages": 2,
                  "total": 6,
                }
            `)
            expect(page2.pager).toMatchInlineSnapshot(`
                {
                  "page": 2,
                  "pageSize": 3,
                  "pages": 2,
                  "total": 6,
                }
            `)
            expect(page1.results).toMatchInlineSnapshot(`
                [
                  {
                    "childrenCount": 2,
                    "displayName": "1-1",
                    "id": "2",
                    "level": 2,
                    "parent": "1",
                    "path": "/1/2",
                  },
                  {
                    "childrenCount": 0,
                    "displayName": "1-1-1",
                    "id": "3",
                    "level": 3,
                    "parent": "2",
                    "path": "/1/2/3",
                  },
                  {
                    "childrenCount": 0,
                    "displayName": "1-1-2",
                    "id": "4",
                    "level": 3,
                    "parent": "2",
                    "path": "/1/2/4",
                  },
                ]
            `)
            expect(page2.results).toMatchInlineSnapshot(`
                [
                  {
                    "childrenCount": 2,
                    "displayName": "1-2",
                    "id": "5",
                    "level": 2,
                    "parent": "1",
                    "path": "/1/5",
                  },
                  {
                    "childrenCount": 0,
                    "displayName": "1-2-1",
                    "id": "6",
                    "level": 3,
                    "parent": "5",
                    "path": "/1/5/6",
                  },
                  {
                    "childrenCount": 0,
                    "displayName": "1-2-2",
                    "id": "7",
                    "level": 3,
                    "parent": "5",
                    "path": "/1/5/7",
                  },
                ]
            `)
        })

        it('getFilteredNodes with ancestors paginates correctly', async () => {
            const page1 = await tree.getFilteredNodes(
                (node) => node.displayName === '2-2-1',
                1,
                { includeAncestors: true }
            )
            expect(page1).toMatchInlineSnapshot(`
                {
                  "pager": {
                    "page": 1,
                    "pageSize": 3,
                    "pages": 1,
                    "total": 3,
                  },
                  "results": [
                    {
                      "childrenCount": 2,
                      "displayName": "2",
                      "id": "8",
                      "level": 1,
                      "parent": null,
                      "path": "/8",
                    },
                    {
                      "childrenCount": 2,
                      "displayName": "2-2",
                      "id": "12",
                      "level": 2,
                      "parent": "8",
                      "path": "/8/12",
                    },
                    {
                      "childrenCount": 0,
                      "displayName": "2-2-1",
                      "id": "13",
                      "level": 3,
                      "parent": "12",
                      "path": "/8/12/13",
                    },
                  ],
                }
            `)
        })

        it('throws for an invalid page number', async () => {
            await expect(tree.getNodeChildren('1', 0)).rejects.toThrow(
                'Parameter `page` must be a positive integer'
            )
        })

        it('does not apply paging to getNodeById', async () => {
            const result = await tree.getNodeById('1')
            expect(result).toMatchInlineSnapshot(`
                {
                  "childrenCount": 2,
                  "displayName": "1",
                  "id": "1",
                  "level": 1,
                  "parent": null,
                  "path": "/1",
                }
            `)
        })

        it('does not apply paging to getNodesByIds', async () => {
            const result = await tree.getNodesByIds(['1', '8'])
            expect(result).toMatchInlineSnapshot(`
                [
                  {
                    "childrenCount": 2,
                    "displayName": "1",
                    "id": "1",
                    "level": 1,
                    "parent": null,
                    "path": "/1",
                  },
                  {
                    "childrenCount": 2,
                    "displayName": "2",
                    "id": "8",
                    "level": 1,
                    "parent": null,
                    "path": "/8",
                  },
                ]
            `)
        })

        it('returns empty results when requesting a page beyond the last', async () => {
            const result = await tree.getNodeDescendants('1', 3)
            expect(result.results).toEqual([])
            expect(result.pager).toMatchInlineSnapshot(`
                {
                  "page": 3,
                  "pageSize": 3,
                  "pages": 2,
                  "total": 6,
                }
            `)
        })

        it('returns empty results when no nodes match the filter', async () => {
            const result = await tree.getFilteredNodes(() => false, 1)
            expect(result.results).toEqual([])
            expect(result.pager).toMatchInlineSnapshot(`
                {
                  "page": 1,
                  "pageSize": 3,
                  "pages": 0,
                  "total": 0,
                }
            `)
        })

        it('getNodeDescendants respects maxLevel', async () => {
            const result = await tree.getNodeDescendants('1', 1, 2)
            expect(result).toMatchInlineSnapshot(`
                {
                  "pager": {
                    "page": 1,
                    "pageSize": 3,
                    "pages": 1,
                    "total": 2,
                  },
                  "results": [
                    {
                      "childrenCount": 2,
                      "displayName": "1-1",
                      "id": "2",
                      "level": 2,
                      "parent": "1",
                      "path": "/1/2",
                    },
                    {
                      "childrenCount": 2,
                      "displayName": "1-2",
                      "id": "5",
                      "level": 2,
                      "parent": "1",
                      "path": "/1/5",
                    },
                  ],
                }
            `)
        })

        it('getRootNodes paginates correctly', async () => {
            const result = await tree.getRootNodes(1)
            expect(result).toMatchInlineSnapshot(`
                {
                  "pager": {
                    "page": 1,
                    "pageSize": 3,
                    "pages": 1,
                    "total": 2,
                  },
                  "results": [
                    {
                      "childrenCount": 2,
                      "displayName": "1",
                      "id": "1",
                      "level": 1,
                      "parent": null,
                      "path": "/1",
                    },
                    {
                      "childrenCount": 2,
                      "displayName": "2",
                      "id": "8",
                      "level": 1,
                      "parent": null,
                      "path": "/8",
                    },
                  ],
                }
            `)
        })
    })
})

describe('AsyncMockTreeApi (rootIds)', () => {
    const DELAY = 3
    const PAGE_SIZE = 2
    const setTimeoutMock = vi.fn<(callback: () => void, delay: number) => void>(
        (callback) => callback()
    )

    beforeAll(() => {
        vi.stubGlobal('setTimeout', setTimeoutMock)
    })

    afterAll(() => {
        vi.unstubAllGlobals()
        vi.clearAllMocks()
    })

    const tree = new AsyncMockTreeApi(treeData as Tree, {
        delay: DELAY,
        pageSize: PAGE_SIZE,
    })

    it('getRootNodes with rootIds returns those nodes sorted by displayName', async () => {
        const result = await tree.getRootNodes(1, ['12', '2'])
        expect(result).toMatchInlineSnapshot(`
            {
              "pager": {
                "page": 1,
                "pageSize": 2,
                "pages": 1,
                "total": 2,
              },
              "results": [
                {
                  "childrenCount": 2,
                  "displayName": "1-1",
                  "id": "2",
                  "level": 2,
                  "parent": "1",
                  "path": "/1/2",
                },
                {
                  "childrenCount": 2,
                  "displayName": "2-2",
                  "id": "12",
                  "level": 2,
                  "parent": "8",
                  "path": "/8/12",
                },
              ],
            }
        `)
    })

    it('getFilteredNodes with rootIds scopes to those subtrees', async () => {
        const result = await tree.getFilteredNodes(
            (node) => node.level === 3,
            1,
            { rootIds: ['2'] }
        )
        expect(result).toMatchInlineSnapshot(`
            {
              "pager": {
                "page": 1,
                "pageSize": 2,
                "pages": 1,
                "total": 2,
              },
              "results": [
                {
                  "childrenCount": 0,
                  "displayName": "1-1-1",
                  "id": "3",
                  "level": 3,
                  "parent": "2",
                  "path": "/1/2/3",
                },
                {
                  "childrenCount": 0,
                  "displayName": "1-1-2",
                  "id": "4",
                  "level": 3,
                  "parent": "2",
                  "path": "/1/2/4",
                },
              ],
            }
        `)
    })

    it('getFilteredNodes with rootIds and includeAncestors stops at the root boundary', async () => {
        const result = await tree.getFilteredNodes(
            (node) => node.displayName === '2-2-1',
            1,
            { rootIds: ['12'], includeAncestors: true }
        )
        expect(result).toMatchInlineSnapshot(`
            {
              "pager": {
                "page": 1,
                "pageSize": 2,
                "pages": 1,
                "total": 2,
              },
              "results": [
                {
                  "childrenCount": 2,
                  "displayName": "2-2",
                  "id": "12",
                  "level": 2,
                  "parent": "8",
                  "path": "/8/12",
                },
                {
                  "childrenCount": 0,
                  "displayName": "2-2-1",
                  "id": "13",
                  "level": 3,
                  "parent": "12",
                  "path": "/8/12/13",
                },
              ],
            }
        `)
    })
})
