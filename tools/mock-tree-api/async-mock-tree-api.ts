import type { Tree, TreeNode } from '../tree-generator/generators/generate-tree'
import { MockTreeApi } from './mock-tree-api'

type Pager = {
    total: number
    pages: number
    pageSize: number
    page: number
}
type PagedResults = {
    pager: Pager
    results: TreeNode[]
}

export class AsyncMockTreeApi {
    #delay: number
    #tree: MockTreeApi
    #pageSize: number

    constructor(treeData: Tree, delay: number = 1000, pageSize: number = 50) {
        this.#tree = new MockTreeApi(treeData)
        this.#delay = delay
        this.#pageSize = pageSize
    }

    async getNodeById(id: string): Promise<TreeNode> {
        await this.#wait()
        return this.#tree.getNodeById(id)
    }

    async getNodesByIds(ids: string[]): Promise<TreeNode[]> {
        await this.#wait()
        return this.#tree.getNodesByIds(ids)
    }

    async getNodeChildren(id: string, page: number) {
        await this.#wait()
        return this.#pageResults(this.#tree.getNodeChildren(id), page)
    }

    async getNodeDescendants(
        id: string,
        page: number,
        maxLevel?: number
    ): Promise<PagedResults> {
        await this.#wait()
        return this.#pageResults(
            this.#tree.getNodeDescendants(id, maxLevel),
            page
        )
    }

    async getFilteredNodes(
        callback: (node: TreeNode) => boolean,
        page: number
    ): Promise<PagedResults> {
        await this.#wait()
        return this.#pageResults(this.#tree.getFilteredNodes(callback), page)
    }

    async #wait() {
        return new Promise<void>((resolve) => {
            setTimeout(() => {
                resolve()
            }, this.#delay)
        })
    }

    #pageResults(results: TreeNode[], page: number): PagedResults {
        const isValidPageNumber = Number.isInteger(page) && page > 0
        const isValidPageSize =
            typeof this.#pageSize === 'number' &&
            Number.isInteger(this.#pageSize) &&
            this.#pageSize > 0

        if (!isValidPageNumber) {
            throw new Error('Parameter `page` not a positive integer')
        }
        if (!isValidPageSize) {
            throw new Error('Page needs to be a positive integer')
        }

        const sliceStart = page * this.#pageSize - this.#pageSize
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
