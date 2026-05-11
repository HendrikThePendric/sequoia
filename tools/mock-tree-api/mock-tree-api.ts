import type { Tree, TreeNode } from '../tree-generator/generators/generate-tree'

export type WalkedNode = {
    id: string
    displayName: string
    level: number
    path: string
    parent: string | null
    childrenCount: number
}

export type WalkedNodeWithChildIds = Omit<WalkedNode, 'childrenCount'> & {
    childrenIds: string[]
}

type MockTreeApiOptions<TReturnChildIds extends boolean> = {
    returnChildIds?: TReturnChildIds
}

export type FilterOptions = {
    includeAncestors?: boolean
    rootIds?: string[]
}

export type FilteredResult<NodeType> = {
    results: NodeType[]
    matchedIds: string[]
    ancestorIds: string[]
}

type NodeType<TReturnChildIds extends boolean> = TReturnChildIds extends true
    ? WalkedNodeWithChildIds
    : WalkedNode

type WalkOptions = {
    node: TreeNode
    level: number
    path: string
    parent: string | null
    result: WalkedNode[]
}

type WalkWithChildIdsOptions = {
    node: TreeNode
    level: number
    path: string
    parent: string | null
    result: WalkedNodeWithChildIds[]
}

function walk({ node, level, path, parent, result }: WalkOptions): void {
    const nodePath = `${path}/${node.id}`
    result.push({
        id: node.id,
        displayName: node.displayName,
        level,
        path: nodePath,
        parent,
        childrenCount: node.children.length,
    })
    for (const child of node.children) {
        walk({
            node: child,
            level: level + 1,
            path: nodePath,
            parent: node.id,
            result,
        })
    }
}

function walkWithChildIds({
    node,
    level,
    path,
    parent,
    result,
}: WalkWithChildIdsOptions): void {
    const nodePath = `${path}/${node.id}`
    result.push({
        id: node.id,
        displayName: node.displayName,
        level,
        path: nodePath,
        parent,
        childrenIds: node.children.map((child) => child.id),
    })
    for (const child of node.children) {
        walkWithChildIds({
            node: child,
            level: level + 1,
            path: nodePath,
            parent: node.id,
            result,
        })
    }
}

function walkTree(tree: Tree): WalkedNode[] {
    const result: WalkedNode[] = []
    for (const root of tree) {
        walk({ node: root, level: 1, path: '', parent: null, result })
    }
    return result
}

function walkTreeWithChildIds(tree: Tree): WalkedNodeWithChildIds[] {
    const result: WalkedNodeWithChildIds[] = []
    for (const root of tree) {
        walkWithChildIds({
            node: root,
            level: 1,
            path: '',
            parent: null,
            result,
        })
    }
    return result
}

export class MockTreeApi<TReturnChildIds extends boolean = false> {
    #nodes: NodeType<TReturnChildIds>[]
    #byId: Map<string, NodeType<TReturnChildIds>>

    constructor(
        treeData: Tree,
        options: MockTreeApiOptions<TReturnChildIds> = {}
    ) {
        const nodes = options.returnChildIds
            ? (walkTreeWithChildIds(treeData) as NodeType<TReturnChildIds>[])
            : (walkTree(treeData) as NodeType<TReturnChildIds>[])
        this.#nodes = nodes
        this.#byId = new Map(this.#nodes.map((node) => [node.id, node]))
    }

    getRootNodes(rootIds?: string[]): NodeType<TReturnChildIds>[] {
        if (!rootIds) {
            return this.#nodes.filter((node) => node.level === 1)
        }
        return rootIds
            .map((id) => this.getNodeById(id))
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
    }

    getNodeById(id: string): NodeType<TReturnChildIds> {
        const node = this.#byId.get(id)
        if (!node) {
            throw new Error(`Node with id "${id}" not found`)
        }
        return node
    }

    getNodesByIds(ids: string[]): NodeType<TReturnChildIds>[] {
        const idSet = new Set(ids)
        return this.#nodes.filter((node) => idSet.has(node.id))
    }

    getNodeChildren(id: string): NodeType<TReturnChildIds>[] {
        const parent = this.getNodeById(id)
        return this.#nodes.filter(
            (node) =>
                node.path.startsWith(`${parent.path}/`) &&
                node.level === parent.level + 1
        )
    }

    getNodeDescendants(
        id: string,
        maxLevel?: number
    ): NodeType<TReturnChildIds>[] {
        const root = this.getNodeById(id)
        return this.#nodes.filter(
            (node) =>
                node.path.startsWith(`${root.path}/`) &&
                (maxLevel === undefined || node.level <= maxLevel)
        )
    }

    getFilteredNodes(
        predicate: (node: NodeType<TReturnChildIds>) => boolean,
        options: FilterOptions = {}
    ): FilteredResult<NodeType<TReturnChildIds>> {
        const { includeAncestors = false, rootIds } = options
        const scopedNodes = rootIds
            ? this.#nodesUnderRoots(rootIds)
            : this.#nodes

        if (!includeAncestors) {
            const matched = scopedNodes.filter(predicate)
            return {
                results: matched,
                matchedIds: matched.map((n) => n.id),
                ancestorIds: [],
            }
        }

        const ancestorIds = new Set<string>()
        const matchedIds = new Set<string>()

        for (const node of scopedNodes) {
            if (predicate(node)) {
                matchedIds.add(node.id)
                // walk up the path to collect ancestor IDs
                const parts = node.path.split('/').filter(Boolean)
                for (let i = 0; i < parts.length - 1; i++) {
                    ancestorIds.add(parts[i])
                }
            }
        }

        return {
            results: scopedNodes.filter(
                (node) => matchedIds.has(node.id) || ancestorIds.has(node.id)
            ),
            matchedIds: [...matchedIds],
            ancestorIds: [...ancestorIds],
        }
    }

    #nodesUnderRoots(rootIds: string[]): NodeType<TReturnChildIds>[] {
        const roots = rootIds.map((id) => this.getNodeById(id))
        return this.#nodes.filter((node) =>
            roots.some(
                (root) =>
                    node.id === root.id || node.path.startsWith(`${root.path}/`)
            )
        )
    }
}
