import { DisplayNameType } from '../prompts/display-name-type-prompt'
import { IdType } from '../prompts/id-type-prompt'
import { DetailsPerLevel } from '../prompts/levels-prompts'
import { addNodeToTree } from './add-node-to-tree'
import { createNodeDetailsGenerator } from './generate-node-details'

export type TreeNode = {
    id: string
    displayName: string
    level: number
    path: string
    parent: string | null
    childrenCount?: number
    children?: string[]
}

export type TreeGeneratorParameters = {
    numberOfRootNodes: number
    numberOfLevels: number
    detailsPerLevel: DetailsPerLevel
    displayNameType: DisplayNameType
    idType: IdType
}

export type Tree = Record<string, TreeNode>

export function generateTree({
    numberOfRootNodes,
    numberOfLevels,
    detailsPerLevel,
    displayNameType,
    idType,
}: TreeGeneratorParameters) {
    const generateNodeDetails = createNodeDetailsGenerator(
        displayNameType,
        idType
    )
    return Array.from({ length: numberOfRootNodes }).reduce<Tree>(
        (tree, _, index) => {
            addNodeToTree({
                index,
                generateNodeDetails,
                numberOfLevels,
                detailsPerLevel,
                parentNode: undefined,
                tree,
            })
            return tree
        },
        {}
    )
}
