export type AdapterNode = {
    id: string
    displayName: string
    level: number
    path: string
    parent: string | null
    childrenCount: number
}

export type StoreNode = {
    id: string
    displayName: string
    level: number
    path: string
    parent: string | null
    childrenCount: number
    childrenIds: Set<string>
}

export type Pager = {
    total: number
    pages: number
    pageSize: number
    page: number
}

export type PagedResponse<T> = {
    pager: Pager
    data: T[]
}

export type FilterOptions = {
    rootIds?: string[]
    includeAncestors?: boolean
}

export type FilteredResponse<T> = {
    pager: Pager
    data: T[]
    matchedIds: string[]
    ancestorIds: string[]
}

export interface TreeAdapter {
    getNodesByIds(ids: string[]): Promise<AdapterNode[]>
    getNodeChildren(
        id: string,
        page: number
    ): Promise<PagedResponse<AdapterNode>>
    getNodeDescendants(
        id: string,
        page: number,
        maxLevel?: number
    ): Promise<PagedResponse<AdapterNode>>
    getFilteredNodes(
        filter: string,
        page: number,
        options?: FilterOptions
    ): Promise<FilteredResponse<AdapterNode>>
}
