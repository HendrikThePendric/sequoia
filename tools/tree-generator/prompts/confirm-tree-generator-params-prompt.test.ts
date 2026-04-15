import { describe, expect, it } from 'vitest'
import { MOCK_TREE_GENERATOR_PARAMS } from '../__fixtures__/mock-tree-generator-params'
import { computeEstimatedNodeLength } from './confirm-tree-generator-params-prompt'

describe('computeEstimatedNodeLength', () => {
    it('estimates correctly for tree without leaf nodes', () => {
        expect(computeEstimatedNodeLength(MOCK_TREE_GENERATOR_PARAMS)).toBe(14)
    })
    it('estimates correctly for tree with leaf nodes', () => {
        const treeWithLeavesGeneratorParams = {
            ...MOCK_TREE_GENERATOR_PARAMS,
            detailsPerLevel: new Map([
                ...MOCK_TREE_GENERATOR_PARAMS.detailsPerLevel,
                [2, { childrenLength: 4, percentageOfLeafNodes: 30 }],
            ]),
        }
        expect(computeEstimatedNodeLength(treeWithLeavesGeneratorParams)).toBe(
            17
        )
    })
})
