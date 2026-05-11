import type {
    AdapterNode,
    FilteredResponse,
    FilterOptions,
    PagedResponse,
    StoreNode,
    TreeAdapter,
} from './types'

export class NodeStore {
    #nodes: Map<string, StoreNode>
    #adapter: TreeAdapter

    constructor(adapter: TreeAdapter) {
        this.#nodes = new Map()
        this.#adapter = adapter
    }

    getNode(id: string): StoreNode | undefined {
        return this.#nodes.get(id)
    }

    hasNode(id: string): boolean {
        return this.#nodes.has(id)
    }

    hasAllChildren(id: string): boolean {
        const node = this.#nodes.get(id)
        if (!node) {
            return false
        }
        return node.childrenIds.size >= node.childrenCount
    }

    async fetchNodesByIds(ids: string[]): Promise<StoreNode[]> {
        const missingIds = ids.filter((id) => !this.#nodes.has(id))

        if (missingIds.length > 0) {
            const adapterNodes = await this.#adapter.getNodesByIds(missingIds)
            for (const adapterNode of adapterNodes) {
                this.#storeNode(adapterNode)
            }
            this.#registerChildren(
                missingIds
                    .map((id) => this.#nodes.get(id))
                    .filter((node): node is StoreNode => node !== undefined)
            )
        }

        return ids
            .map((id) => this.#nodes.get(id))
            .filter((node): node is StoreNode => node !== undefined)
    }

    async fetchNodeChildren(
        id: string,
        page: number
    ): Promise<PagedResponse<StoreNode>> {
        const response = await this.#adapter.getNodeChildren(id, page)
        const storeNodes = response.data.map((node) => this.#storeNode(node))
        this.#registerChildren(storeNodes)

        return { pager: response.pager, data: storeNodes }
    }

    async fetchNodeDescendants(
        id: string,
        page: number,
        maxLevel?: number
    ): Promise<PagedResponse<StoreNode>> {
        const response = await this.#adapter.getNodeDescendants(
            id,
            page,
            maxLevel
        )
        const storeNodes = response.data.map((node) => this.#storeNode(node))
        this.#registerChildren(storeNodes)

        return { pager: response.pager, data: storeNodes }
    }

    async fetchFilteredNodes(
        filter: string,
        page: number,
        options?: FilterOptions
    ): Promise<FilteredResponse<StoreNode>> {
        const response = await this.#adapter.getFilteredNodes(
            filter,
            page,
            options
        )
        const storeNodes = response.data.map((node) => this.#storeNode(node))
        this.#registerChildren(storeNodes)

        return {
            pager: response.pager,
            data: storeNodes,
            matchedIds: response.matchedIds,
            ancestorIds: response.ancestorIds,
        }
    }

    #storeNode(adapterNode: AdapterNode): StoreNode {
        const existing = this.#nodes.get(adapterNode.id)

        if (existing) {
            existing.displayName = adapterNode.displayName
            existing.level = adapterNode.level
            existing.path = adapterNode.path
            existing.parent = adapterNode.parent
            existing.childrenCount = adapterNode.childrenCount
            return existing
        }

        const storeNode: StoreNode = {
            ...adapterNode,
            childrenIds: new Set<string>(),
        }
        this.#nodes.set(storeNode.id, storeNode)
        return storeNode
    }

    #registerChildren(storeNodes: StoreNode[]): void {
        for (const node of storeNodes) {
            if (node.parent) {
                const parent = this.#nodes.get(node.parent)
                if (parent) {
                    parent.childrenIds.add(node.id)
                }
            }
        }
    }
}
