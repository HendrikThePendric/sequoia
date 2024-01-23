import { describe, expect, test } from 'vitest'
import treeData from '../__fixtures__/mock-tree-api-test-data/tree.json'
import { TreeNode } from '../tree-generator/generators/generate-tree'
import { MockTreeApi } from './mock-tree-api'

describe('MockTreeApi', () => {
    const tree = new MockTreeApi(treeData)

    test('getNodeById method returns the expected node', () => {
        expect(tree.getNodeById('3')).toMatchInlineSnapshot(`
          {
            "children": [
              "4",
              "5",
            ],
            "childrenCount": 2,
            "displayName": "1-1-1",
            "id": "3",
            "level": 3,
            "parent": "2",
            "path": "/1/2/3",
          }
        `)
    })

    test('getNodesByIds method returns the expected nodes', () => {
        expect(tree.getNodesByIds(['1', '2'])).toMatchInlineSnapshot(`
          [
            {
              "children": [
                "2",
                "9",
                "23",
              ],
              "childrenCount": 3,
              "displayName": "1",
              "id": "1",
              "level": 1,
              "parent": null,
              "path": "/1",
            },
            {
              "children": [
                "3",
                "6",
              ],
              "childrenCount": 2,
              "displayName": "1-1",
              "id": "2",
              "level": 2,
              "parent": "1",
              "path": "/1/2",
            },
          ]
        `)
    })
    test('getNodeChildren method returns the expected nodes', () => {
        expect(tree.getNodeChildren('2')).toMatchInlineSnapshot(`
          [
            {
              "children": [
                "4",
                "5",
              ],
              "childrenCount": 2,
              "displayName": "1-1-1",
              "id": "3",
              "level": 3,
              "parent": "2",
              "path": "/1/2/3",
            },
            {
              "children": [
                "7",
                "8",
              ],
              "childrenCount": 2,
              "displayName": "1-1-2",
              "id": "6",
              "level": 3,
              "parent": "2",
              "path": "/1/2/6",
            },
          ]
        `)
    })
    test('getNodeDescendants method returns the expected nodes', () => {
        const descendants = tree.getNodeDescendants('2')
        const descendantsWithMaxLevel3 = tree.getNodeDescendants('3')
        expect(descendants.length).toBeGreaterThan(
            descendantsWithMaxLevel3.length
        )
        expect(descendantsWithMaxLevel3).toMatchInlineSnapshot(`
          [
            {
              "children": [],
              "childrenCount": 0,
              "displayName": "1-1-1-1",
              "id": "4",
              "level": 4,
              "parent": "3",
              "path": "/1/2/3/4",
            },
            {
              "children": [],
              "childrenCount": 0,
              "displayName": "1-1-1-2",
              "id": "5",
              "level": 4,
              "parent": "3",
              "path": "/1/2/3/5",
            },
          ]
        `)
    })

    test('getFilteredNodes method returns the expected nodes', () => {
        const callback = (node: TreeNode) => node.displayName.includes('2-2-3')
        expect(tree.getFilteredNodes(callback)).toMatchInlineSnapshot(`
          [
            {
              "children": [],
              "childrenCount": 0,
              "displayName": "1-2-2-3",
              "id": "19",
              "level": 4,
              "parent": "16",
              "path": "/1/9/16/19",
            },
          ]
        `)
    })
})
