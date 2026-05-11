import { useCallback, useContext, useSyncExternalStore } from 'react'
import type { Tree } from './tree'
import { TreeContext } from './tree-provider'

export function useTree(): Tree {
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

    return tree
}
