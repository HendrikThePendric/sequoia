import { TreeGeneratorParameters } from '../generators/generate-tree'

export const MOCK_TREE_GENERATOR_PARAMS: TreeGeneratorParameters = {
    numberOfRootNodes: 2,
    numberOfLevels: 3,
    detailsPerLevel: new Map([
        [1, { childrenLength: 2, percentageOfLeafNodes: 0 }],
        [2, { childrenLength: 2, percentageOfLeafNodes: 0 }],
    ]),
    displayNameType: 'occurrence',
    idType: 'int',
}
