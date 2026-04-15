import { DisplayNameType } from '../prompts/display-name-type-prompt'
import { IdType } from '../prompts/id-type-prompt'
import { DetailsPerLevel } from '../prompts/levels-prompts'
import { buildNode } from './add-node-to-tree'
import { createNodeDetailsGenerator } from './generate-node-details'

export type TreeNode = {
    id: string
    displayName: string
    children: TreeNode[]
}

export type TreeGeneratorParameters = {
    numberOfRootNodes: number
    numberOfLevels: number
    detailsPerLevel: DetailsPerLevel
    displayNameType: DisplayNameType
    idType: IdType
}

export type Tree = TreeNode[]

export function generateTree({
    numberOfRootNodes,
    numberOfLevels,
    detailsPerLevel,
    displayNameType,
    idType,
}: TreeGeneratorParameters): Tree {
    const generateNodeDetails = createNodeDetailsGenerator(
        displayNameType,
        idType
    )
    return Array.from({ length: numberOfRootNodes }, (_, index) =>
        buildNode({
            index,
            generateNodeDetails,
            numberOfLevels,
            detailsPerLevel,
            depth: 1,
        })
    )
}
