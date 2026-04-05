import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import treeData from '../__fixtures__/mock-tree-api-test-data/tall-tree.json'
import { Tree, TreeNode } from '../tree-generator/generators/generate-tree'
import { AsyncMockTreeApi } from './async-mock-tree-api'

describe('MockTreeApi', () => {
    const DELAY = 3
    const PAGE_SIZE = 30
    const tree = new AsyncMockTreeApi(treeData as Tree, DELAY, PAGE_SIZE)
    const setTimeoutMock = vi.fn((callback) => callback())

    beforeAll(() => {
        vi.stubGlobal('setTimeout', setTimeoutMock)
    })

    afterAll(() => {
        vi.clearAllMocks()
    })

    test('calls setTimout with provided delay', () => {
        tree.getNodeById('3')
        tree.getNodesByIds(['1', '2'])
        tree.getNodeChildren('2', 1)
        tree.getNodeDescendants('2', 1)
        tree.getFilteredNodes(
            (node: TreeNode) => node.displayName.includes('2-2-3'),
            1
        )
        expect(setTimeoutMock).toHaveBeenCalledTimes(5)
        expect(setTimeoutMock).toHaveBeenNthCalledWith(
            1,
            expect.anything(),
            DELAY
        )
        expect(setTimeoutMock).toHaveBeenNthCalledWith(
            2,
            expect.anything(),
            DELAY
        )
        expect(setTimeoutMock).toHaveBeenNthCalledWith(
            3,
            expect.anything(),
            DELAY
        )
        expect(setTimeoutMock).toHaveBeenNthCalledWith(
            4,
            expect.anything(),
            DELAY
        )
        expect(setTimeoutMock).toHaveBeenNthCalledWith(
            5,
            expect.anything(),
            DELAY
        )
    })
    describe('paging', () => {
        test('pager works correctly', async () => {
            const actualPage1 = await tree.getNodeChildren('3', 1)
            const actualPage2 = await tree.getNodeChildren('3', 2)
            const actualLastPage = await tree.getNodeChildren('3', 13)
            expect(actualPage1.pager).toEqual({
                page: 1,
                pageSize: 30,
                pages: 13,
                total: 361,
            })
            expect(actualPage2.pager).toEqual({
                page: 2,
                pageSize: 30,
                pages: 13,
                total: 361,
            })
            expect(actualPage1.results.length).toBe(30)
            expect(actualPage2.results.length).toBe(30)
            expect(actualLastPage.results.length).toBe(1)
            // Check total
            expect(
                (actualPage1.pager.pages - 1) * actualPage1.pager.pageSize +
                    actualLastPage.results.length
            ).toBe(actualPage1.pager.total)
            // End of page 1 and start of page 2 need to have adjacent IDs
            const page1LastIdAsInt = parseInt(
                actualPage1.results[actualPage1.results.length - 1].id
            )
            const page2FirstIdAsInt = parseInt(actualPage2.results[0].id)
            expect(page2FirstIdAsInt - page1LastIdAsInt).toBe(1)
        })
        test('does not apply paging to getNodeById', async () => {
            const actual = await tree.getNodeById('1')
            expect(actual).toMatchInlineSnapshot(`
              {
                "children": [
                  "2",
                  "2698",
                  "5584",
                  "8581",
                  "13183",
                  "15526",
                  "20256",
                  "24429",
                  "26306",
                  "30654",
                  "34246",
                  "36724",
                ],
                "childrenCount": 12,
                "displayName": "1",
                "id": "1",
                "level": 1,
                "parent": null,
                "path": "/1",
              }
            `)
        })
        test('does not apply paging to getNodesByIds', async () => {
            const actual = await tree.getNodesByIds(['1', '2'])
            expect(actual).toMatchInlineSnapshot(`
              [
                {
                  "children": [
                    "2",
                    "2698",
                    "5584",
                    "8581",
                    "13183",
                    "15526",
                    "20256",
                    "24429",
                    "26306",
                    "30654",
                    "34246",
                    "36724",
                  ],
                  "childrenCount": 12,
                  "displayName": "1",
                  "id": "1",
                  "level": 1,
                  "parent": null,
                  "path": "/1",
                },
                {
                  "children": [
                    "3",
                    "365",
                    "914",
                    "1507",
                    "1802",
                    "2163",
                  ],
                  "childrenCount": 6,
                  "displayName": "1-1",
                  "id": "2",
                  "level": 2,
                  "parent": "1",
                  "path": "/1/2",
                },
              ]
            `)
        })
        test('does apply paging to getNodeChildren', async () => {
            const actual = await tree.getNodeChildren('2', 1)
            expect(actual.pager).toMatchInlineSnapshot(`
              {
                "page": 1,
                "pageSize": 30,
                "pages": 1,
                "total": 6,
              }
            `)
        })
        test('does apply paging to getNodeDescendants', async () => {
            const actual = await tree.getNodeDescendants('2', 1)
            expect(actual.pager).toMatchInlineSnapshot(`
              {
                "page": 1,
                "pageSize": 30,
                "pages": 90,
                "total": 2695,
              }
            `)
        })
        test('does apply paging to getFilteredNodes', async () => {
            const actual = await tree.getFilteredNodes(() => true, 1)
            expect(actual.pager).toMatchInlineSnapshot(`
              {
                "page": 1,
                "pageSize": 30,
                "pages": 1373,
                "total": 41163,
              }
            `)
        })
    })
})
