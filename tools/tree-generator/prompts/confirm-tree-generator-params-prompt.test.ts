import { describe, expect, it } from 'vitest'
import { MOCK_TREE_GENERATOR_PARAMS } from '../generators/generate-tree.test'
import { computeEstimatedNodeLength } from './confirm-tree-generator-params-prompt'

describe('confirmTreeGeneratorParamsPrompt > ccomputeEstimatedNodeLength', () => {
    it('estimates correctly for tree without leaf nodes', () => {
        expect(computeEstimatedNodeLength(MOCK_TREE_GENERATOR_PARAMS)).toBe(85)
    })
    it('estimates correctly for tree with leaf nodes', () => {
        const treeWithLeavesGeneratorParams = Object.assign(
            {},
            MOCK_TREE_GENERATOR_PARAMS
        )
        treeWithLeavesGeneratorParams.detailsPerLevel.set(2, {
            childrenLength: 4,
            percentageOfLeafNodes: 30,
        })
        treeWithLeavesGeneratorParams.detailsPerLevel.set(3, {
            childrenLength: 4,
            percentageOfLeafNodes: 30,
        })
        expect(computeEstimatedNodeLength(treeWithLeavesGeneratorParams)).toBe(
            48
        )
    })
})
