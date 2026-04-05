import { DetailsPerLevel, LevelDetails } from '../prompts/levels-prompts'
import { getChildrenLength, isLeafNode } from '../randomness'
import { NodeDetailsGeneratorGenerator } from './generate-node-details'
import { TreeNode, Tree } from './generate-tree'

type AddNodeToTreeOptions = {
    index: number
    generateNodeDetails: NodeDetailsGeneratorGenerator
    numberOfLevels: number
    detailsPerLevel: DetailsPerLevel
    parentNode?: TreeNode
    tree: Tree
}
export function addNodeToTree({
    index,
    generateNodeDetails,
    numberOfLevels,
    detailsPerLevel,
    parentNode,
    tree,
}: AddNodeToTreeOptions) {
    const nodeDetails = generateNodeDetails(index, parentNode)
    const levelDetails = detailsPerLevel.get(nodeDetails.level) as LevelDetails
    const childrenCount =
        numberOfLevels === nodeDetails.level ||
        isLeafNode(levelDetails.percentageOfLeafNodes)
            ? 0
            : getChildrenLength(levelDetails.childrenLength)
    const children = []
    if (childrenCount > 0) {
        for (let childIndex = 0; childIndex < childrenCount; childIndex++) {
            const childNode = addNodeToTree({
                index: childIndex,
                generateNodeDetails,
                numberOfLevels,
                detailsPerLevel,
                parentNode: nodeDetails,
                tree,
            })
            children.push(childNode.id)
        }
    }
    const node: TreeNode = {
        ...nodeDetails,
        childrenCount,
        children,
    }

    tree[node.id] = node
    return node
}
