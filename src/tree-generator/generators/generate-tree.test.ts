import { describe, expect, it } from 'vitest'
import { TreeGeneratorParameters, generateTree } from './generate-tree'

export const MOCK_TREE_GENERATOR_PARAMS: TreeGeneratorParameters = {
    numberOfRootNodes: 1,
    numberOfLevels: 4,
    detailsPerLevel: new Map([
        [
            1,
            {
                childrenLength: 4,
                percentageOfLeafNodes: 0,
            },
        ],
        [
            2,
            {
                childrenLength: 4,
                percentageOfLeafNodes: 0,
            },
        ],
        [
            3,
            {
                childrenLength: 4,
                percentageOfLeafNodes: 0,
            },
        ],
    ]),
    displayNameType: 'occurrence',
    idType: 'int',
}

describe('generateTree', () => {
    const tree = generateTree(MOCK_TREE_GENERATOR_PARAMS)
    const level1Nodes = Object.values(tree).filter((node) => node.level === 1)
    const level2Nodes = Object.values(tree).filter((node) => node.level === 2)
    const level3Nodes = Object.values(tree).filter((node) => node.level === 3)
    const level4Nodes = Object.values(tree).filter((node) => node.level === 4)

    it('has a single root node without a parent but with children', () => {
        expect(level1Nodes.length).toBe(1)
        expect(level1Nodes[0].parent).toBe(null)
        expect(level1Nodes[0].children?.length).toBeGreaterThan(0)
    })
    it('has nodes at level 2 and 3 with root as parent and children', () => {
        expect(level2Nodes.length).toBeGreaterThan(1)
        expect(level3Nodes.length).toBeGreaterThan(1)
        expect(
            level2Nodes.every((node) => node.parent === level1Nodes[0].id)
        ).toBe(true)
        expect(level3Nodes.every((node) => !!node.parent)).toBe(true)
        expect(
            level2Nodes.every((node) => node.children?.length ?? 0 > 0)
        ).toBe(true)
    })
    it('has nodes at level 4 with a parent but without children', () => {
        expect(level4Nodes.length).toBeGreaterThan(1)
        expect(level4Nodes.every((node) => !!node.parent)).toBe(true)
        expect(level4Nodes.every((node) => !node.children?.length)).toBe(true)
    })
})
