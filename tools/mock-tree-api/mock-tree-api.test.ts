import { describe, expect, it } from 'vitest'
import treeData from '../__fixtures__/mock-tree-api-test-data/tree.json'
import { Tree } from '../tree-generator/generators/generate-tree'
import { MockTreeApi } from './mock-tree-api'

describe('MockTreeApi (default: childrenCount)', () => {
    const tree = new MockTreeApi(treeData as Tree)

    it('getNodeById returns the correct node with derived fields', () => {
        expect(tree.getNodeById('3')).toMatchInlineSnapshot(`
            {
              "childrenCount": 0,
              "displayName": "1-1-1",
              "id": "3",
              "level": 3,
              "parent": "2",
              "path": "/1/2/3",
            }
        `)
    })

    it('getNodeById throws for an unknown id', () => {
        expect(() => tree.getNodeById('999')).toThrow(
            'Node with id "999" not found'
        )
    })

    it('getNodesByIds returns nodes in depth-first tree order', () => {
        expect(tree.getNodesByIds(['8', '1', '5'])).toMatchInlineSnapshot(`
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
                "displayName": "1-2",
                "id": "5",
                "level": 2,
                "parent": "1",
                "path": "/1/5",
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

    it('getNodeChildren returns direct children in depth-first order', () => {
        expect(tree.getNodeChildren('1')).toMatchInlineSnapshot(`
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
                "childrenCount": 2,
                "displayName": "1-2",
                "id": "5",
                "level": 2,
                "parent": "1",
                "path": "/1/5",
              },
            ]
        `)
    })

    it('getNodeDescendants returns all descendants in depth-first order', () => {
        expect(tree.getNodeDescendants('1')).toMatchInlineSnapshot(`
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

    it('getNodeDescendants respects maxLevel', () => {
        expect(tree.getNodeDescendants('1', 2)).toMatchInlineSnapshot(`
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
                "childrenCount": 2,
                "displayName": "1-2",
                "id": "5",
                "level": 2,
                "parent": "1",
                "path": "/1/5",
              },
            ]
        `)
    })

    it('getFilteredNodes without ancestors returns only matched nodes', () => {
        expect(
            tree.getFilteredNodes((node) => node.displayName.includes('1-1'))
        ).toMatchInlineSnapshot(`
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
            {
              "childrenCount": 0,
              "displayName": "2-1-1",
              "id": "10",
              "level": 3,
              "parent": "9",
              "path": "/8/9/10",
            },
          ]
        `)
    })

    it('getFilteredNodes with ancestors returns matched nodes plus ancestors in depth-first order', () => {
        expect(
            tree.getFilteredNodes((node) => node.displayName === '2-2-1', {
                includeAncestors: true,
            })
        ).toMatchInlineSnapshot(`
            [
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
            ]
        `)
    })

    it('getNodeById returns a root node correctly', () => {
        expect(tree.getNodeById('1')).toMatchInlineSnapshot(`
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

    it('getNodesByIds returns empty array for empty input', () => {
        expect(tree.getNodesByIds([])).toEqual([])
    })

    it('getNodeChildren returns empty array for a leaf node', () => {
        expect(tree.getNodeChildren('3')).toEqual([])
    })

    it('getNodeDescendants returns empty array for a leaf node', () => {
        expect(tree.getNodeDescendants('3')).toEqual([])
    })

    it('getFilteredNodes returns empty array when no nodes match', () => {
        expect(
            tree.getFilteredNodes((node) => node.displayName === 'nonexistent')
        ).toEqual([])
    })

    it('getFilteredNodes with ancestors returns only the root when matched node is a root', () => {
        expect(
            tree.getFilteredNodes((node) => node.id === '1', {
                includeAncestors: true,
            })
        ).toMatchInlineSnapshot(`
            [
              {
                "childrenCount": 2,
                "displayName": "1",
                "id": "1",
                "level": 1,
                "parent": null,
                "path": "/1",
              },
            ]
        `)
    })
})

describe('MockTreeApi (returnChildIds: true)', () => {
    const tree = new MockTreeApi(treeData as Tree, { returnChildIds: true })

    it('getNodeById returns node with childrenIds instead of childrenCount', () => {
        expect(tree.getNodeById('1')).toMatchInlineSnapshot(`
            {
              "childrenIds": [
                "2",
                "5",
              ],
              "displayName": "1",
              "id": "1",
              "level": 1,
              "parent": null,
              "path": "/1",
            }
        `)
    })

    it('leaf node has an empty childrenIds array', () => {
        expect(tree.getNodeById('3')).toMatchInlineSnapshot(`
            {
              "childrenIds": [],
              "displayName": "1-1-1",
              "id": "3",
              "level": 3,
              "parent": "2",
              "path": "/1/2/3",
            }
        `)
    })

    it('getNodeChildren returns nodes with childrenIds', () => {
        expect(tree.getNodeChildren('1')).toMatchInlineSnapshot(`
            [
              {
                "childrenIds": [
                  "3",
                  "4",
                ],
                "displayName": "1-1",
                "id": "2",
                "level": 2,
                "parent": "1",
                "path": "/1/2",
              },
              {
                "childrenIds": [
                  "6",
                  "7",
                ],
                "displayName": "1-2",
                "id": "5",
                "level": 2,
                "parent": "1",
                "path": "/1/5",
              },
            ]
        `)
    })
})

describe('MockTreeApi (rootIds)', () => {
    // Single shared instance — rootIds is passed per method call
    const tree = new MockTreeApi(treeData as Tree)

    it('getRootNodes with rootIds returns those nodes sorted by displayName', () => {
        // "12" (displayName "2-2") and "2" (displayName "1-1")
        // passed in reverse order to verify sorting
        expect(tree.getRootNodes(['12', '2'])).toMatchInlineSnapshot(`
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
                "childrenCount": 2,
                "displayName": "2-2",
                "id": "12",
                "level": 2,
                "parent": "8",
                "path": "/8/12",
              },
            ]
        `)
    })

    it('getRootNodes with rootIds preserves original levels and paths', () => {
        // Node "2" is at level 2 in the full tree — not rebased to level 1
        const roots = tree.getRootNodes(['2'])
        expect(roots).toHaveLength(1)
        expect(roots[0].level).toBe(2)
        expect(roots[0].path).toBe('/1/2')
        expect(roots[0].parent).toBe('1')
    })

    it('getRootNodes throws for an unknown rootId', () => {
        expect(() => tree.getRootNodes(['999'])).toThrow(
            'Node with id "999" not found'
        )
    })

    it('getFilteredNodes with rootIds only searches within the specified subtrees', () => {
        // "1-2-1" (id "6") is under root "1" but not under root "2"
        expect(
            tree.getFilteredNodes((node) => node.displayName === '1-2-1', {
                rootIds: ['2'],
            })
        ).toEqual([])

        // "1-1-1" (id "3") is under root "2"
        expect(
            tree.getFilteredNodes((node) => node.displayName === '1-1-1', {
                rootIds: ['2'],
            })
        ).toMatchInlineSnapshot(`
            [
              {
                "childrenCount": 0,
                "displayName": "1-1-1",
                "id": "3",
                "level": 3,
                "parent": "2",
                "path": "/1/2/3",
              },
            ]
        `)
    })

    it('getFilteredNodes with rootIds and includeAncestors stops at the root boundary', () => {
        // Search under root "12" for "2-2-1" — ancestors should include
        // "12" (the root) but not "8" (above the root)
        const result = tree.getFilteredNodes(
            (node) => node.displayName === '2-2-1',
            { rootIds: ['12'], includeAncestors: true }
        )
        expect(result).toMatchInlineSnapshot(`
            [
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
            ]
        `)
        // Verify "8" is NOT in the results
        expect(result.find((n) => n.id === '8')).toBeUndefined()
    })

    it('getFilteredNodes with multiple rootIds searches across all specified subtrees', () => {
        // Search for level-3 nodes under roots "2" and "12"
        const result = tree.getFilteredNodes((node) => node.level === 3, {
            rootIds: ['2', '12'],
        })
        expect(result).toMatchInlineSnapshot(`
            [
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
              {
                "childrenCount": 0,
                "displayName": "2-2-1",
                "id": "13",
                "level": 3,
                "parent": "12",
                "path": "/8/12/13",
              },
              {
                "childrenCount": 0,
                "displayName": "2-2-2",
                "id": "14",
                "level": 3,
                "parent": "12",
                "path": "/8/12/14",
              },
            ]
        `)
    })

    it('getFilteredNodes with rootIds includes the root node itself when it matches', () => {
        const result = tree.getFilteredNodes((node) => node.id === '2', {
            rootIds: ['2'],
        })
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe('2')
    })
})

describe('MockTreeApi (getRootNodes without rootIds)', () => {
    const tree = new MockTreeApi(treeData as Tree)

    it('returns all original roots', () => {
        expect(tree.getRootNodes()).toMatchInlineSnapshot(`
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
})

describe('MockTreeApi (empty tree)', () => {
    const emptyTree = new MockTreeApi([])

    it('getNodesByIds returns empty array', () => {
        expect(emptyTree.getNodesByIds(['1'])).toEqual([])
    })

    it('getFilteredNodes returns empty array', () => {
        expect(emptyTree.getFilteredNodes(() => true)).toEqual([])
    })
})
