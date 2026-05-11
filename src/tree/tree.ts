import type { NodeStore } from '../node-store'
import { TreeFetcher } from './tree-fetcher'

type Listener = () => void

const SKELETON_PREFIX = 'skeleton:'

export type SkeletonId = {
    parentId: string
    offset: number
}

export class Tree {
    #nodeStore: NodeStore
    #rootIds: string[]
    #openNodeIds: Set<string>
    #flatIds: string[]
    #indexById: Map<string, number>
    #listeners: Set<Listener>
    #version: number
    #fetcher: TreeFetcher

    // -- Search mode state --
    #filterMatchedIds: Set<string> | null = null
    #filterAncestorIds: Set<string> | null = null
    #searchOpenIds: Set<string> = new Set()
    #totalResultCount: number = 0
    // Temporary cache used during filtered walk to avoid extra params on walkNode
    #filterSetCache: Set<string> | null = null
    // Parents whose children have been flushed by TreeFetcher in the
    // current search session. After flush, childrenIds is rebuilt from
    // API pages, so filter-set children are safe to walk when expanded.
    #flushedParents: Set<string> = new Set()

    constructor(nodeStore: NodeStore, rootIds: string[]) {
        this.#nodeStore = nodeStore
        this.#rootIds = rootIds
        this.#openNodeIds = new Set()
        this.#flatIds = []
        this.#indexById = new Map()
        this.#listeners = new Set()
        this.#version = 0
        this.#fetcher = new TreeFetcher(nodeStore)

        this.#fetcher.onBatchComplete((parentId) => {
            this.#flushedParents.add(parentId)
            this.#rebuildFlatIds()
            this.#notify()
        })

        this.#rebuildFlatIds()
    }

    // -- Skeleton ID helpers --

    static isSkeleton(id: string): boolean {
        return id.startsWith(SKELETON_PREFIX)
    }

    static parseSkeletonId(id: string): SkeletonId | undefined {
        if (!id.startsWith(SKELETON_PREFIX)) {
            return undefined
        }
        const rest = id.slice(SKELETON_PREFIX.length)
        const lastColon = rest.lastIndexOf(':')
        if (lastColon === -1) {
            return undefined
        }
        const parentId = rest.slice(0, lastColon)
        const offset = Number(rest.slice(lastColon + 1))
        if (Number.isNaN(offset)) {
            return undefined
        }
        return { parentId, offset }
    }

    // -- Subscription (useSyncExternalStore contract) --

    subscribe(listener: Listener): () => void {
        this.#listeners.add(listener)
        return () => {
            this.#listeners.delete(listener)
        }
    }

    getSnapshot(): number {
        return this.#version
    }

    // -- Expansion --

    open(id: string): void {
        if (this.#inSearchMode()) {
            this.openSearch(id)
            return
        }
        if (this.#openNodeIds.has(id)) {
            return
        }
        this.#openNodeIds.add(id)
        this.#rebuildFlatIds()
        this.#notify()
    }

    close(id: string): void {
        if (this.#inSearchMode()) {
            this.closeSearch(id)
            return
        }
        if (!this.#openNodeIds.has(id)) {
            return
        }
        this.#openNodeIds.delete(id)
        this.#rebuildFlatIds()
        this.#notify()
    }

    toggle(id: string): void {
        if (this.#inSearchMode()) {
            this.toggleSearch(id)
            return
        }
        if (this.#openNodeIds.has(id)) {
            this.close(id)
        } else {
            this.open(id)
            // Eager-load page 1 so the first children appear as fast as possible
            this.loadChildren(id, 0)
        }
    }

    isOpen(id: string): boolean {
        return this.#openNodeIds.has(id)
    }

    /**
     * Ensure children up to maxOffset are visible.
     * Called by the scroll effect to load children in the visible range.
     * No-op if the node is not open (checks the mode-appropriate open set).
     */
    loadChildren(parentId: string, maxOffset: number): void {
        const isOpen = this.#inSearchMode()
            ? this.#searchOpenIds.has(parentId)
            : this.#openNodeIds.has(parentId)
        if (!isOpen) {
            return
        }
        this.#fetcher.loadChildren(parentId, maxOffset)
    }

    // -- Search mode --

    /**
     * Enter search mode. Called incrementally as pages of results arrive.
     * @param matchedIds - IDs of nodes that matched the filter query
     * @param ancestorIds - IDs of ancestor nodes that should be shown for context
     * @param total - total combined result count across all pages (from pager)
     */
    setSearchResults(
        matchedIds: string[],
        ancestorIds: string[],
        total: number
    ): void {
        const enteringSearch = this.#filterMatchedIds === null

        if (enteringSearch) {
            this.#filterMatchedIds = new Set()
            this.#filterAncestorIds = new Set()
            this.#searchOpenIds = new Set()
        }

        for (const id of matchedIds) {
            this.#filterMatchedIds!.add(id)
        }
        for (const id of ancestorIds) {
            this.#filterAncestorIds!.add(id)
        }
        this.#totalResultCount = total

        this.#rebuildFlatIds()
        this.#notify()
    }

    /** Exit search mode and return to the normal tree view. */
    clearSearch(): void {
        this.#filterMatchedIds = null
        this.#filterAncestorIds = null
        this.#searchOpenIds = new Set()
        this.#flushedParents = new Set()
        this.#totalResultCount = 0
        this.#rebuildFlatIds()
        this.#notify()
    }

    inSearchMode(): boolean {
        return this.#inSearchMode()
    }

    openSearch(id: string): void {
        if (this.#searchOpenIds.has(id)) {
            return
        }
        this.#searchOpenIds.add(id)
        this.#rebuildFlatIds()
        this.#notify()
    }

    closeSearch(id: string): void {
        if (!this.#searchOpenIds.has(id)) {
            return
        }
        this.#searchOpenIds.delete(id)
        this.#rebuildFlatIds()
        this.#notify()
    }

    toggleSearch(id: string): void {
        if (this.#searchOpenIds.has(id)) {
            this.closeSearch(id)
        } else {
            this.openSearch(id)
            this.loadChildren(id, 0)
        }
    }

    isSearchOpen(id: string): boolean {
        return this.#searchOpenIds.has(id)
    }

    isFilterMatch(id: string): boolean {
        return this.#filterMatchedIds?.has(id) ?? false
    }

    isFilterAncestor(id: string): boolean {
        return this.#filterAncestorIds?.has(id) ?? false
    }

    getTotalResultCount(): number {
        return this.#totalResultCount
    }

    /**
     * Total row count for virtualizer.
     * In search mode, uses the pager total so the scrollbar is correctly
     * sized even before all pages are loaded.
     */
    getTotalCount(): number {
        if (this.#inSearchMode()) {
            return Math.max(this.#flatIds.length, this.#totalResultCount)
        }
        return this.#flatIds.length
    }

    #inSearchMode(): boolean {
        return this.#filterMatchedIds !== null
    }

    // -- Derived state (read during render) --

    getFlatIds(): string[] {
        return this.#flatIds
    }

    getIndexById(id: string): number | undefined {
        return this.#indexById.get(id)
    }

    // -- Internal --

    #rebuildFlatIds(): void {
        if (this.#inSearchMode()) {
            this.#rebuildFilteredFlatIds()
        } else {
            this.#rebuildNormalFlatIds()
        }
    }

    #rebuildNormalFlatIds(): void {
        const flatIds: string[] = []
        const indexById = new Map<string, number>()

        for (const rootId of this.#rootIds) {
            this.#walkNode(rootId, flatIds, indexById)
        }

        this.#flatIds = flatIds
        this.#indexById = indexById
    }

    #rebuildFilteredFlatIds(): void {
        const flatIds: string[] = []
        const indexById = new Map<string, number>()
        this.#filterSetCache = new Set([
            ...this.#filterMatchedIds!,
            ...this.#filterAncestorIds!,
        ])

        // Only start walking from roots that are in the filter set.
        // Walk only includes children that are in the filter set
        // (plus their loaded descendants when expanded).
        for (const rootId of this.#rootIds) {
            if (this.#filterSetCache.has(rootId)) {
                this.#walkNode(rootId, flatIds, indexById)
            }
        }

        this.#flatIds = flatIds
        this.#indexById = indexById
        this.#filterSetCache = null
    }

    #walkNode(
        id: string,
        flatIds: string[],
        indexById: Map<string, number>
    ): void {
        indexById.set(id, flatIds.length)
        flatIds.push(id)

        const node = this.#nodeStore.getNode(id)
        if (!node) {
            return
        }

        const filterSet = this.#filterSetCache
        const openSet = this.#inSearchMode()
            ? this.#searchOpenIds
            : this.#openNodeIds
        const isExpanded = openSet.has(id)

        for (const childId of node.childrenIds) {
            const inFilterSet = filterSet && filterSet.has(childId)
            if (inFilterSet && !isExpanded) {
                // Search mode, collapsed: filter-set children always visible.
                this.#walkNode(childId, flatIds, indexById)
            } else if (isExpanded && !inFilterSet) {
                // Expanded: walk non-filter-set children. After flush,
                // filter-set children from API pages are also in childrenIds
                // but are no longer in the filter set (they were seeded).
                this.#walkNode(childId, flatIds, indexById)
            } else if (
                isExpanded &&
                inFilterSet &&
                this.#flushedParents.has(id)
            ) {
                // Expanded + flushed: filter-set children are from API pages,
                // safe to walk at their natural position.
                this.#walkNode(childId, flatIds, indexById)
            }
        }

        // Emit skeleton entries when the node is expanded
        const loadedCount = node.childrenIds.size
        const totalCount = node.childrenCount
        if (loadedCount < totalCount && isExpanded) {
            const skeletonCount = totalCount - loadedCount
            for (let i = 0; i < skeletonCount; i++) {
                const skeletonId = `${SKELETON_PREFIX}${id}:${loadedCount + i}`
                indexById.set(skeletonId, flatIds.length)
                flatIds.push(skeletonId)
            }
        }
    }

    #notify(): void {
        this.#version += 1
        for (const listener of this.#listeners) {
            listener()
        }
    }
}
