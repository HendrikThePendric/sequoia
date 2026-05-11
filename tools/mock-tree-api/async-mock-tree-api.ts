import type { Tree } from '../tree-generator/generators/generate-tree'
import {
    FilterOptions,
    MockTreeApi,
    WalkedNode,
    WalkedNodeWithChildIds,
} from './mock-tree-api'

type Pager = {
    total: number
    pages: number
    pageSize: number
    page: number
}

type PagedResults<TNode> = {
    pager: Pager
    results: TNode[]
}

type PagedFilteredResult<TNode> = {
    pager: Pager
    results: TNode[]
    matchedIds: string[]
    ancestorIds: string[]
}

type AsyncMockTreeApiOptions<TReturnChildIds extends boolean> = {
    returnChildIds?: TReturnChildIds
    delay?: number
    pageSize?: number
}

type NodeType<TReturnChildIds extends boolean> = TReturnChildIds extends true
    ? WalkedNodeWithChildIds
    : WalkedNode

export class AsyncMockTreeApi<TReturnChildIds extends boolean = false> {
    #delay: number
    #tree: MockTreeApi<TReturnChildIds>
    #pageSize: number

    constructor(
        treeData: Tree,
        options: AsyncMockTreeApiOptions<TReturnChildIds> = {}
    ) {
        const { delay = 1000, pageSize = 50, returnChildIds } = options
        this.#tree = new MockTreeApi(treeData, { returnChildIds })
        this.#delay = delay
        this.#pageSize = pageSize
    }

    async getRootNodes(
        page: number,
        rootIds?: string[]
    ): Promise<PagedResults<NodeType<TReturnChildIds>>> {
        await this.#wait()
        return this.#pageResults(this.#tree.getRootNodes(rootIds), page)
    }

    async getNodeById(id: string): Promise<NodeType<TReturnChildIds>> {
        await this.#wait()
        return this.#tree.getNodeById(id)
    }

    async getNodesByIds(ids: string[]): Promise<NodeType<TReturnChildIds>[]> {
        await this.#wait()
        return this.#tree.getNodesByIds(ids)
    }

    async getNodeChildren(
        id: string,
        page: number
    ): Promise<PagedResults<NodeType<TReturnChildIds>>> {
        await this.#wait()
        return this.#pageResults(this.#tree.getNodeChildren(id), page)
    }

    async getNodeDescendants(
        id: string,
        page: number,
        maxLevel?: number
    ): Promise<PagedResults<NodeType<TReturnChildIds>>> {
        await this.#wait()
        return this.#pageResults(
            this.#tree.getNodeDescendants(id, maxLevel),
            page
        )
    }

    async getFilteredNodes(
        predicate: (node: NodeType<TReturnChildIds>) => boolean,
        page: number,
        options: FilterOptions = {}
    ): Promise<PagedFilteredResult<NodeType<TReturnChildIds>>> {
        await this.#wait()
        const full = this.#tree.getFilteredNodes(predicate, options)
        const paged = this.#pageResults(full.results, page)
        return {
            pager: paged.pager,
            results: paged.results,
            matchedIds: full.matchedIds,
            ancestorIds: full.ancestorIds,
        }
    }

    async #wait(): Promise<void> {
        return new Promise<void>((resolve) => setTimeout(resolve, this.#delay))
    }

    #pageResults(
        results: NodeType<TReturnChildIds>[],
        page: number
    ): PagedResults<NodeType<TReturnChildIds>> {
        if (!Number.isInteger(page) || page < 1) {
            throw new Error('Parameter `page` must be a positive integer')
        }
        if (!Number.isInteger(this.#pageSize) || this.#pageSize < 1) {
            throw new Error('pageSize must be a positive integer')
        }

        const sliceStart = (page - 1) * this.#pageSize
        const sliceEnd = Math.min(sliceStart + this.#pageSize, results.length)

        return {
            pager: {
                page,
                pageSize: this.#pageSize,
                total: results.length,
                pages: Math.ceil(results.length / this.#pageSize),
            },
            results: results.slice(sliceStart, sliceEnd),
        }
    }
}
