import { useVirtualizer } from '@tanstack/react-virtual'
import {
    useCallback,
    useContext,
    useEffect,
    useRef,
    useSyncExternalStore,
} from 'react'
import { TreeContext } from './tree-provider'

const DEFAULT_ROW_HEIGHT = 24
const DEFAULT_OVERSCAN = 5

export type UseTreeOptions = {
    overscan?: number
    rowHeight?: number
}

export type UseTreeReturn = ReturnType<typeof useTree>

export function useTree(options: UseTreeOptions = {}) {
    const { overscan = DEFAULT_OVERSCAN, rowHeight = DEFAULT_ROW_HEIGHT } =
        options
    const tree = useContext(TreeContext)

    if (!tree) {
        throw new Error('useTree must be used within a TreeProvider')
    }

    const subscribe = useCallback(
        (listener: () => void) => tree.subscribe(listener),
        [tree]
    )
    const getSnapshot = useCallback(() => tree.getSnapshot(), [tree])
    useSyncExternalStore(subscribe, getSnapshot)

    const flatIds = tree.getFlatIds()
    const parentRef = useRef<HTMLDivElement>(null)

    // eslint-disable-next-line react-hooks/incompatible-library
    const virtualizer = useVirtualizer({
        count: tree.getTotalCount(),
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowHeight,
        overscan,
    })

    const virtualItems = virtualizer.getVirtualItems()

    useEffect(() => {
        if (virtualItems.length === 0) {
            return
        }
        const first = virtualItems[0].index
        const last = virtualItems[virtualItems.length - 1].index
        tree.loadVisibleRange(first, last)
    }, [virtualItems, tree])

    return {
        tree,
        flatIds,
        virtualizer,
        virtualItems,
        parentRef,
        totalSize: virtualizer.getTotalSize(),
        rowHeight,
    }
}
