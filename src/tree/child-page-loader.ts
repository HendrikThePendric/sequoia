import type { NodeStore } from '../node-store'

const PAGE_SIZE = 50

type InFlightKey = `children:${string}:${number}`

type Listener = (parentId: string) => void

export class ChildPageLoader {
    #nodeStore: NodeStore
    #pageSize: number
    #inFlight: Set<InFlightKey>
    #listeners: Set<Listener>
    /**
     * Ordered child IDs per parent, per page number.
     * Key = parentId, Value = Map<pageNumber, childIds[]>.
     */
    #loadedPages: Map<string, Map<number, string[]>>
    /**
     * Children already in NodeStore before API pages loaded
     * (e.g. from search results). Preserved across flushes.
     * Key = parentId, Value = Set<childId>.
     */
    #preservedIds: Map<string, Set<string>>

    constructor(nodeStore: NodeStore, pageSize: number = PAGE_SIZE) {
        this.#nodeStore = nodeStore
        this.#pageSize = pageSize
        this.#inFlight = new Set()
        this.#listeners = new Set()
        this.#loadedPages = new Map()
        this.#preservedIds = new Map()
    }

    /**
     * Ensure children up to maxOffset are loaded for a parent.
     * Fires needed pages in parallel. When all in-flight pages
     * resolve, inserts children in page order and emits onFlush.
     */
    loadChildren(parentId: string, maxOffset: number): void {
        const node = this.#nodeStore.getNode(parentId)
        if (!node) {
            throw new Error(`parent "${parentId}" not found in NodeStore`)
        }
        if (node.childrenIds.size >= node.childrenCount) {
            return
        }

        this.#saveExistingChildren(parentId)

        const pages = this.#loadedPages.get(parentId)!
        let fromPage = 1
        while (pages.has(fromPage)) {
            fromPage++
        }

        const toPage = Math.floor(maxOffset / this.#pageSize) + 1

        for (let p = fromPage; p <= toPage; p++) {
            const key = this.#inFlightKey(parentId, p)
            if (this.#inFlight.has(key)) {
                continue
            }
            this.#fetchPage(parentId, p, key)
        }
    }

    onFlush(listener: Listener): () => void {
        this.#listeners.add(listener)
        return () => {
            this.#listeners.delete(listener)
        }
    }

    // -- Internal --

    #saveExistingChildren(parentId: string): void {
        if (this.#loadedPages.has(parentId)) {
            return
        }

        this.#loadedPages.set(parentId, new Map())

        const node = this.#nodeStore.getNode(parentId)
        if (!node || node.childrenIds.size === 0) {
            return
        }

        this.#preservedIds.set(parentId, new Set(node.childrenIds))
    }

    #fetchPage(parentId: string, page: number, inFlightKey: InFlightKey): void {
        this.#inFlight.add(inFlightKey)

        this.#nodeStore
            .fetchNodeChildren(parentId, page)
            .then((response) => {
                this.#loadedPages.get(parentId)!.set(
                    page,
                    response.data.map((n) => n.id)
                )
            })
            .finally(() => {
                this.#inFlight.delete(inFlightKey)
                this.#flushIfAllArrived(parentId)
            })
    }

    #flushIfAllArrived(parentId: string): void {
        const prefix = `children:${parentId}:`
        for (const key of this.#inFlight) {
            if (key.startsWith(prefix)) {
                return
            }
        }
        this.#flush(parentId)
    }

    #flush(parentId: string): void {
        const parent = this.#nodeStore.getNode(parentId)
        if (!parent) {
            return
        }

        const pages = this.#loadedPages.get(parentId)
        if (!pages) {
            return
        }

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

    #inFlightKey(parentId: string, page: number): InFlightKey {
        return `children:${parentId}:${page}`
    }

    #notify(parentId: string): void {
        for (const listener of this.#listeners) {
            listener(parentId)
        }
    }
}
