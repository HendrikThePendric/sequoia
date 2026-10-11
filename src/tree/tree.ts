import type { NodeStore, StoreNode } from '../node-store'
import { ChildPageLoader } from './child-page-loader'

type Listener = () => void

const SKELETON_PREFIX = 'skeleton:'

export type SkeletonId = {
    parentId: string
    offset: number
}

export interface TreeSurface {
    // -- Subscription --
    subscribe(listener: Listener): () => void
    getSnapshot(): number

    // -- Expansion --
    open(id: string): void
    close(id: string): void
    toggle(id: string): void
    isOpen(id: string): boolean

    // -- Loading --
    /** Ensure children up to maxOffset are visible for the given parent. */
    loadChildren(parentId: string, maxOffset: number): void
    /**
     * Map a visible index range to skeleton rows and trigger loadChildren
     * for the furthest visible offset per parent.
     */
    loadVisibleRange(firstIndex: number, lastIndex: number): void

    // -- Derived state --
    getFlatIds(): string[]
    getIndexById(id: string): number | undefined
    /** Total row count for the virtualizer. */
    getTotalCount(): number

    // -- Search mode (lifecycle managed by useTreeSearch) --
    setSearchResults(
        matchedIds: string[],
        ancestorIds: string[],
        total: number
    ): void
    clearSearch(): void
    inSearchMode(): boolean

    // -- Search mode query helpers (for consumer row styling) --
    isFilterMatch(id: string): boolean
    isFilterAncestor(id: string): boolean
    getTotalResultCount(): number

    // -- Node access --
    getNode(id: string): StoreNode | undefined
    isLeaf(id: string): boolean
    hasAllChildren(id: string): boolean

    // -- Skeleton helpers (static, used by virtualizer integration) --
}

export class Tree implements TreeSurface {
    #nodeStore: NodeStore
    #rootIds: string[]
    #openNodeIds: Set<string>
    #flatIds: string[]
    #indexById: Map<string, number>
    #listeners: Set<Listener>
    #version: number
    #pageLoader: ChildPageLoader

    // -- Search mode state --
    #filterMatchedIds: Set<string> | null = null
    #filterAncestorIds: Set<string> | null = null
    #searchOpenIds: Set<string> = new Set()
    #totalResultCount: number = 0
    #filterSetCache: Set<string> | null = null
    #flushedParents: Set<string> = new Set()

    constructor(nodeStore: NodeStore, rootIds: string[]) {
        this.#nodeStore = nodeStore
        this.#rootIds = rootIds
        this.#openNodeIds = new Set()
        this.#flatIds = []
        this.#indexById = new Map()
        this.#listeners = new Set()
        this.#version = 0
        this.#pageLoader = new ChildPageLoader(nodeStore)

        this.#pageLoader.onFlush((parentId) => {
            this.#flushedParents.add(parentId)
            this.#rebuildFlatIds()
            this.#notify()
        })

        this.#rebuildFlatIds()
    }

    // -- Static helpers (used in useTree's skeleton trigger) --

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
            this.#openSearch(id)
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
            this.#closeSearch(id)
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
            this.#toggleSearch(id)
            return
        }
        if (this.#openNodeIds.has(id)) {
            this.close(id)
        } else {
            this.open(id)
            this.loadChildren(id, 0)
        }
    }

    isOpen(id: string): boolean {
        if (this.#inSearchMode()) {
            return this.#isSearchOpen(id)
        }
        return this.#openNodeIds.has(id)
    }

    // -- Loading --

    loadChildren(parentId: string, maxOffset: number): void {
        const openSet = this.#inSearchMode()
            ? this.#searchOpenIds
            : this.#openNodeIds
        if (!openSet.has(parentId)) {
            return
        }
        this.#pageLoader.loadChildren(parentId, maxOffset)
    }

    loadVisibleRange(firstIndex: number, lastIndex: number): void {
        const currentFlatIds = this.#flatIds
        const parentMaxOffsets = new Map<string, number>()

        for (let i = firstIndex; i <= lastIndex; i++) {
            const id = currentFlatIds[i]
            if (!id || !Tree.isSkeleton(id)) {
                continue
            }
            const skeleton = Tree.parseSkeletonId(id)
            if (!skeleton) {
                continue
            }
            const prev = parentMaxOffsets.get(skeleton.parentId) ?? -1
            if (skeleton.offset > prev) {
                parentMaxOffsets.set(skeleton.parentId, skeleton.offset)
            }
        }

        for (const [parentId, maxOffset] of parentMaxOffsets) {
            this.loadChildren(parentId, maxOffset)
        }
    }

    // -- Search mode (public API for useTreeSearch) --

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

    isFilterMatch(id: string): boolean {
        return this.#filterMatchedIds?.has(id) ?? false
    }

    isFilterAncestor(id: string): boolean {
        return this.#filterAncestorIds?.has(id) ?? false
    }

    getTotalResultCount(): number {
        return this.#totalResultCount
    }

    // -- Derived state --

    getFlatIds(): string[] {
        return this.#flatIds
    }

    getIndexById(id: string): number | undefined {
        return this.#indexById.get(id)
    }

    getTotalCount(): number {
        if (this.#inSearchMode()) {
            return Math.max(this.#flatIds.length, this.#totalResultCount)
        }
        return this.#flatIds.length
    }

    getNode(id: string): StoreNode | undefined {
        return this.#nodeStore.getNode(id)
    }

    isLeaf(id: string): boolean {
        const node = this.#nodeStore.getNode(id)
        return node ? node.childrenCount === 0 : true
    }

    hasAllChildren(id: string): boolean {
        const node = this.#nodeStore.getNode(id)
        if (!node) {
            return false
        }
        return node.childrenIds.size >= node.childrenCount
    }

    // -- Private search mode helpers --

    #inSearchMode(): boolean {
        return this.#filterMatchedIds !== null
    }

    #openSearch(id: string): void {
        if (this.#searchOpenIds.has(id)) {
            return
        }
        this.#searchOpenIds.add(id)
        this.#rebuildFlatIds()
        this.#notify()
    }

    #closeSearch(id: string): void {
        if (!this.#searchOpenIds.has(id)) {
            return
        }
        this.#searchOpenIds.delete(id)
        this.#rebuildFlatIds()
        this.#notify()
    }

    #toggleSearch(id: string): void {
        if (this.#searchOpenIds.has(id)) {
            this.#closeSearch(id)
        } else {
            this.#openSearch(id)
            this.loadChildren(id, 0)
        }
    }

    #isSearchOpen(id: string): boolean {
        return this.#searchOpenIds.has(id)
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
                this.#walkNode(childId, flatIds, indexById)
            } else if (isExpanded && !inFilterSet) {
                this.#walkNode(childId, flatIds, indexById)
            } else if (
                isExpanded &&
                inFilterSet &&
                this.#flushedParents.has(id)
            ) {
                this.#walkNode(childId, flatIds, indexById)
            }
        }

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
