import type { VirtualItem } from '@tanstack/react-virtual'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNodeStore } from '../node-store'
import type { Tree } from '../tree'

const DEFAULT_DEBOUNCE_MS = 300
const DEFAULT_PAGE_SIZE = 50

export type UseTreeSearchOptions = {
    tree: Tree
    virtualItems: VirtualItem[]
    debounceMs?: number
    pageSize?: number
}

export type UseTreeSearchReturn = {
    /** The current search query string. */
    query: string
    /** Set the search query. */
    setQuery: (query: string) => void
    /** Whether search mode is active (a query has been submitted). */
    searching: boolean
    /** Whether the initial search page is still loading. */
    loading: boolean
    /** Exit search mode and return to normal tree view. */
    clear: () => void
    /** Total matching results count (from pager). */
    totalResultCount: number
}

/**
 * Manages the search lifecycle: debounced queries, paginated fetching,
 * and feeding incremental results into the Tree's search mode.
 */
export function useTreeSearch(
    options: UseTreeSearchOptions
): UseTreeSearchReturn {
    const {
        tree,
        virtualItems,
        debounceMs = DEFAULT_DEBOUNCE_MS,
        pageSize = DEFAULT_PAGE_SIZE,
    } = options
    const nodeStore = useNodeStore()

    const [query, setQueryState] = useState('')
    const [searching, setSearching] = useState(false)
    const [loading, setLoading] = useState(false)

    const queryRef = useRef(query)
    queryRef.current = query
    const inFlightRef = useRef(new Set<number>())
    const loadedPagesRef = useRef(new Set<number>())
    const totalPagesRef = useRef(0)
    const pageSizeRef = useRef(pageSize)
    pageSizeRef.current = pageSize

    const clear = useCallback(() => {
        tree.clearSearch()
        setQueryState('')
        setSearching(false)
        setLoading(false)
        inFlightRef.current = new Set()
        loadedPagesRef.current = new Set()
        totalPagesRef.current = 0
    }, [tree])

    const setQuery = useCallback((next: string) => {
        setQueryState(next)
    }, [])

    // Debounced search on query change
    useEffect(() => {
        if (!query.trim()) {
            tree.clearSearch()
            setSearching(false)
            setLoading(false)
            inFlightRef.current = new Set()
            loadedPagesRef.current = new Set()
            totalPagesRef.current = 0
            return
        }

        tree.clearSearch()
        setSearching(false)
        inFlightRef.current = new Set()
        loadedPagesRef.current = new Set([1])
        setLoading(true)
        totalPagesRef.current = 0

        let cancelled = false
        const timer = setTimeout(async () => {
            const response = await nodeStore.fetchFilteredNodes(query, 1, {
                includeAncestors: true,
            })
            if (!cancelled) {
                pageSizeRef.current = response.pager.pageSize
                totalPagesRef.current = response.pager.pages
                tree.setSearchResults(
                    response.matchedIds,
                    response.ancestorIds,
                    response.pager.total
                )
                setSearching(true)
                setLoading(false)
            }
        }, debounceMs)

        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [query, debounceMs, nodeStore, tree])

    // Scroll-based pagination for search results
    useEffect(() => {
        if (!searching) {
            return
        }
        if (totalPagesRef.current === 0) {
            return
        }
        if (virtualItems.length === 0) {
            return
        }

        const lastNeeded =
            Math.floor(
                virtualItems[virtualItems.length - 1].index /
                    pageSizeRef.current
            ) + 1
        const targetPage = Math.min(lastNeeded, totalPagesRef.current)

        for (let p = 2; p <= targetPage; p++) {
            if (loadedPagesRef.current.has(p) || inFlightRef.current.has(p)) {
                continue
            }

            inFlightRef.current.add(p)
            nodeStore
                .fetchFilteredNodes(queryRef.current, p, {
                    includeAncestors: true,
                })
                .then((response) => {
                    loadedPagesRef.current.add(p)
                    tree.setSearchResults(
                        response.matchedIds,
                        response.ancestorIds,
                        response.pager.total
                    )
                })
                .finally(() => {
                    inFlightRef.current.delete(p)
                })
        }
    }, [virtualItems, searching, nodeStore, tree])

    const totalResultCount = tree.getTotalResultCount()

    return {
        query,
        setQuery,
        searching,
        loading,
        clear,
        totalResultCount,
    }
}
