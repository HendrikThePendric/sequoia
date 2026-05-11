import type { NodeStore, PagedResponse, StoreNode } from '../node-store'

const PAGE_SIZE = 50

type InFlightKey = string // e.g. "children:<parentId>:<page>"
type PendingKey = string // e.g. "children:<parentId>"

type Listener = (parentId: string) => void

export class TreeFetcher {
    #nodeStore: NodeStore
    #pageSize: number
    #pending: Map<PendingKey, Map<number, PagedResponse<StoreNode>>>
    #inFlight: Set<InFlightKey>
    #listeners: Set<Listener>
    /**
     * Complete child ordering per parent.
     * Key = parentId, Value = Map<page, childIds[]>.
     * Only contains children from API responses (natural order).
     */
    #childPages: Map<string, Map<number, string[]>>
    /**
     * Children that existed in NodeStore before API pages loaded.
     * These come from search results and are preserved across flushes.
     * Key = parentId, Value = Set<childId>.
     */
    #seededIds: Map<string, Set<string>>

    constructor(nodeStore: NodeStore, pageSize: number = PAGE_SIZE) {
        this.#nodeStore = nodeStore
        this.#pageSize = pageSize
        this.#pending = new Map()
        this.#inFlight = new Set()
        this.#listeners = new Set()
        this.#childPages = new Map()
        this.#seededIds = new Map()
    }

    /**
     * Ensure children up to maxOffset are loaded for a parent.
     * Fires needed pages in parallel. When all in-flight pages
     * resolve, inserts children in page order and emits onBatchComplete.
     */
    loadChildren(parentId: string, maxOffset: number): void {
        const node = this.#nodeStore.getNode(parentId)
        if (!node || node.childrenIds.size >= node.childrenCount) {
            return
        }

        // Seed from NodeStore's existing children on first encounter
        this.#ensureSeeded(parentId)

        // Find the next API page not yet loaded. Seeded children
        // (from search results) don't count as loaded pages.
        const pages = this.#childPages.get(parentId)!
        let fromPage = 1
        while (pages.has(fromPage)) {
            fromPage++
        }

        const toPage = Math.floor(maxOffset / this.#pageSize) + 1

        for (let p = fromPage; p <= toPage; p++) {
            const inFlightKey = this.#inFlightKey(parentId, p)
            if (this.#inFlight.has(inFlightKey)) {
                continue
            }
            this.#firePage(parentId, p, inFlightKey)
        }
    }

    onBatchComplete(listener: Listener): () => void {
        this.#listeners.add(listener)
        return () => {
            this.#listeners.delete(listener)
        }
    }

    // -- Internal --

    /**
     * On first encounter of a parent, record children that already exist
     * in NodeStore (e.g. from search results) so they are preserved across
     * flushes even when their natural page hasn't been fetched yet.
     */
    #ensureSeeded(parentId: string): void {
        if (this.#childPages.has(parentId)) {
            return
        }

        this.#childPages.set(parentId, new Map())

        const node = this.#nodeStore.getNode(parentId)
        if (!node || node.childrenIds.size === 0) {
            return
        }

        this.#seededIds.set(parentId, new Set(node.childrenIds))
    }

    #firePage(parentId: string, page: number, inFlightKey: InFlightKey): void {
        this.#inFlight.add(inFlightKey)

        this.#nodeStore
            .fetchNodeChildren(parentId, page)
            .then((response) => {
                const pendingKey = this.#pendingKey(parentId)
                let pageMap = this.#pending.get(pendingKey)
                if (!pageMap) {
                    pageMap = new Map()
                    this.#pending.set(pendingKey, pageMap)
                }
                pageMap.set(page, response)

                // Update ordered state with this page's children
                this.#childPages.get(parentId)!.set(
                    page,
                    response.data.map((n) => n.id)
                )
            })
            .finally(() => {
                this.#inFlight.delete(inFlightKey)
                this.#checkFlush(parentId)
            })
    }

    #checkFlush(parentId: string): void {
        const prefix = this.#pendingKey(parentId) + ':'
        for (const key of this.#inFlight) {
            if (key.startsWith(prefix)) {
                return // still waiting
            }
        }
        this.#flushChildren(parentId)
    }

    #flushChildren(parentId: string): void {
        const pendingKey = this.#pendingKey(parentId)
        this.#pending.delete(pendingKey)

        const parent = this.#nodeStore.getNode(parentId)
        if (!parent) {
            return
        }

        const pages = this.#childPages.get(parentId)
        if (!pages) {
            return
        }

        // Build complete ordered list from all known API pages.
        // Search results from later pages are not appended — they appear
        // at their natural position when their API page loads.
        parent.childrenIds.clear()
        const sortedPages = [...pages.keys()].sort((a, b) => a - b)
        for (const page of sortedPages) {
            const ids = pages.get(page)!
            for (const id of ids) {
                parent.childrenIds.add(id)
            }
        }

        this.#notify(parentId)
    }

    #pendingKey(parentId: string): PendingKey {
        return `children:${parentId}`
    }

    #inFlightKey(parentId: string, page: number): InFlightKey {
        return `children:${parentId}:${page}`
    }

    #notify(parentId: string): void {
        for (const listener of this.#listeners) {
            listener(parentId)
        }
    }
}
