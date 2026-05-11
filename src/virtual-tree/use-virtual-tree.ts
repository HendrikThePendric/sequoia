import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useRef } from 'react'
import { Tree, useTree } from '../tree'

const ROW_HEIGHT = 24
const OVERSCAN = 5

export type UseVirtualTreeOptions = {
    overscan?: number
    rowHeight?: number
}

export function useVirtualTree(options: UseVirtualTreeOptions = {}) {
    const { overscan = OVERSCAN, rowHeight = ROW_HEIGHT } = options
    const tree = useTree()
    const flatIds = tree.getFlatIds()
    const parentRef = useRef<HTMLDivElement>(null)

    // react-hooks/incompatible-library: TanStack Virtual's API returns methods
    // that close over mutable internal state, which is incompatible with automatic
    // memoization. The compiler skips memoizing this hook, which is fine for a
    // virtual scroller. Consumers must be aware that values from this hook should
    // not be passed to React.memo components or used as memoization dependencies.
    // eslint-disable-next-line react-hooks/incompatible-library
    const virtualizer = useVirtualizer({
        count: tree.getTotalCount(),
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowHeight,
        overscan,
    })

    const virtualItems = virtualizer.getVirtualItems()

    // Detect visible skeletons and tell the tree to load their children.
    const triggerSkeletonFetches = useCallback(() => {
        const currentFlatIds = tree.getFlatIds()
        const items = virtualizer.getVirtualItems()

        // Collect the furthest visible offset per parent
        const parentMaxOffsets = new Map<string, number>()

        for (const item of items) {
            const id = currentFlatIds[item.index]
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
            tree.loadChildren(parentId, maxOffset)
        }
    }, [tree, virtualizer])

    useEffect(() => {
        triggerSkeletonFetches()
    }, [virtualItems, flatIds, triggerSkeletonFetches])

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

/**
 * Return type of {@link useVirtualTree}.
 *
 * **Memo-incompatible**: most values here (e.g. `virtualizer`, `virtualItems`,
 * `flatIds`) change identity on every render. Avoid passing them as props to
 * `React.memo`-wrapped components or using them in `useMemo`/`useCallback`
 * dependency arrays — memoization will never stabilize.
 */
export type UseVirtualTreeReturn = ReturnType<typeof useVirtualTree>
