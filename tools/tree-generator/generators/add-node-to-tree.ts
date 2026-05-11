import { DetailsPerLevel, getLevelDetails } from '../prompts/levels-prompts'
import { getChildrenLength, isLeafNode } from '../randomness'
import { NodeDetails, NodeDetailsGenerator } from './generate-node-details'
import { TreeNode } from './generate-tree'

type BuildNodeOptions = {
    index: number
    generateNodeDetails: NodeDetailsGenerator
    numberOfLevels: number
    detailsPerLevel: DetailsPerLevel
    depth: number
    parentNode?: NodeDetails
}

export function buildNode({
    index,
    generateNodeDetails,
    numberOfLevels,
    detailsPerLevel,
    depth,
    parentNode,
}: BuildNodeOptions): TreeNode {
    const nodeDetails = generateNodeDetails(index, parentNode)
    const isLastLevel = depth === numberOfLevels
    let childrenCount = 0
    if (!isLastLevel) {
        const levelDetails = getLevelDetails(detailsPerLevel, depth)
        childrenCount = isLeafNode(levelDetails.percentageOfLeafNodes)
            ? 0
            : getChildrenLength(levelDetails.childrenLength)
    }

    const children: TreeNode[] = []
    for (let childIndex = 0; childIndex < childrenCount; childIndex++) {
        children.push(
            buildNode({
                index: childIndex,
                generateNodeDetails,
                numberOfLevels,
                detailsPerLevel,
                depth: depth + 1,
                parentNode: nodeDetails,
            })
        )
    }
    children.sort((a, b) => a.displayName.localeCompare(b.displayName))
    return { ...nodeDetails, children }
}
