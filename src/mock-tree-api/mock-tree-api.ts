import type { Tree, TreeNode } from '../tree-generator/generators/generate-tree'

const byLevelAndDisplayName = (a: TreeNode, b: TreeNode) =>
    a.level - b.level || a.displayName.localeCompare(b.displayName)

export class MockTreeApi {
    #treeData: Tree

    constructor(treeData: Tree) {
        this.#treeData = treeData
    }

    getNodeById(id: string): TreeNode {
        return this.#treeData[id]
    }

    getNodesByIds(ids: string[]): TreeNode[] {
        return ids.map((id) => this.getNodeById(id)).sort(byLevelAndDisplayName)
    }

    getNodeChildren(id: string) {
        return this.getNodesByIds(this.getNodeById(id).children ?? []).sort(
            byLevelAndDisplayName
        )
    }

    getNodeDescendants(id: string, maxLevel?: number): TreeNode[] {
        const nodes: TreeNode[] = []
        const callback = (node: TreeNode) => {
            if (!maxLevel || node.level <= maxLevel) {
                nodes.push(node)
            }
        }
        this.#forEachDescendant(id, callback)
        return nodes.sort(byLevelAndDisplayName)
    }

    getFilteredNodes(callback: (node: TreeNode) => boolean): TreeNode[] {
        return Object.values(this.#treeData)
            .filter(callback)
            .sort(byLevelAndDisplayName)
    }

    #forEachDescendant(id: string, callback: (node: TreeNode) => void): void {
        this.getNodeById(id)?.children?.forEach((childId) => {
            const childNode = this.getNodeById(childId)
            callback(childNode)
            this.#forEachDescendant(childId, callback)
        })
    }
}
