import { describe, expect, it, vi } from 'vitest'
import { MOCK_TREE_GENERATOR_PARAMS } from '../__fixtures__/mock-tree-generator-params'
import { generateTree } from './generate-tree'

vi.mock('../randomness/get-children-length', () => ({
    getChildrenLength: (n: number) => n,
}))

describe('generateTree', () => {
    const tree = generateTree(MOCK_TREE_GENERATOR_PARAMS)

    it('produces a nested tree matching the expected shape', () => {
        expect(tree).toMatchInlineSnapshot(`
          [
            {
              "children": [
                {
                  "children": [
                    {
                      "children": [],
                      "displayName": "1-1-1",
                      "id": "3",
                    },
                    {
                      "children": [],
                      "displayName": "1-1-2",
                      "id": "4",
                    },
                  ],
                  "displayName": "1-1",
                  "id": "2",
                },
                {
                  "children": [
                    {
                      "children": [],
                      "displayName": "1-2-1",
                      "id": "6",
                    },
                    {
                      "children": [],
                      "displayName": "1-2-2",
                      "id": "7",
                    },
                  ],
                  "displayName": "1-2",
                  "id": "5",
                },
              ],
              "displayName": "1",
              "id": "1",
            },
            {
              "children": [
                {
                  "children": [
                    {
                      "children": [],
                      "displayName": "2-1-1",
                      "id": "10",
                    },
                    {
                      "children": [],
                      "displayName": "2-1-2",
                      "id": "11",
                    },
                  ],
                  "displayName": "2-1",
                  "id": "9",
                },
                {
                  "children": [
                    {
                      "children": [],
                      "displayName": "2-2-1",
                      "id": "13",
                    },
                    {
                      "children": [],
                      "displayName": "2-2-2",
                      "id": "14",
                    },
                  ],
                  "displayName": "2-2",
                  "id": "12",
                },
              ],
              "displayName": "2",
              "id": "8",
            },
          ]
        `)
    })

    it('produces leaf nodes with empty children arrays at the last level', () => {
        tree.forEach((root) => {
            root.children.forEach((child) => {
                child.children.forEach((leaf) => {
                    expect(leaf.children).toEqual([])
                })
            })
        })
    })
})
