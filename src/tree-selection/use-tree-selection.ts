import { useCallback, useMemo, useRef, useState } from 'react'
import { Tree } from '../tree'

export type UseTreeSelectionOptions = {
    tree: Tree
    flatIds: string[]
    /** Controlled mode: initial or current selection. */
    selectedIds?: string[]
    /** Controlled mode: called when selection changes. */
    onSelectionChange?: (ids: string[]) => void
}

export type UseTreeSelectionReturn = {
    /** Set of currently selected node IDs. */
    selectedIds: ReadonlySet<string>
    /** Toggle selection for a node. Also sets the range anchor. */
    toggle: (id: string) => void
    /** Select all visible nodes. */
    selectAll: () => void
    /** Deselect all nodes. */
    deselectAll: () => void
    /** Select a contiguous range from a previously selected anchor node. */
    selectRange: (fromId: string, toId: string) => void
    /** Check if a node is selected. */
    isSelected: (id: string) => boolean
    /** Check if a node is in an indeterminate selection state. */
    isIndeterminate: (id: string) => boolean
    /** Number of selected nodes. */
    count: number
}

function collectRealIds(flatIds: string[]): string[] {
    return flatIds.filter((id) => !Tree.isSkeleton(id))
}

/**
 * Manages multi-select / checkbox state for tree nodes.
 *
 * Supports both controlled (`selectedIds` + `onSelectionChange`) and
 * uncontrolled (internal state) modes.
 */
export function useTreeSelection(
    options: UseTreeSelectionOptions
): UseTreeSelectionReturn {
    const {
        tree,
        flatIds,
        selectedIds: controlledIds,
        onSelectionChange,
    } = options
    const isControlled = controlledIds !== undefined

    const [internalIds, setInternalIds] = useState<Set<string>>(
        () => new Set(controlledIds ?? [])
    )

    const selectedIds: ReadonlySet<string> = useMemo(
        () => (isControlled ? new Set(controlledIds) : internalIds),
        [isControlled, controlledIds, internalIds]
    )

    const anchorRef = useRef<string | null>(null)

    const applyChange = useCallback(
        (nextIds: Set<string>) => {
            if (isControlled) {
                onSelectionChange?.(Array.from(nextIds))
            } else {
                setInternalIds(new Set(nextIds))
            }
        },
        [isControlled, onSelectionChange]
    )

    const toggle = useCallback(
        (id: string) => {
            const next = new Set(selectedIds)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            anchorRef.current = id
            applyChange(next)
        },
        [selectedIds, applyChange]
    )

    const selectAll = useCallback(() => {
        const allIds = collectRealIds(flatIds)
        applyChange(new Set(allIds))
    }, [flatIds, applyChange])

    const deselectAll = useCallback(() => {
        anchorRef.current = null
        applyChange(new Set())
    }, [applyChange])

    const selectRange = useCallback(
        (fromId: string, toId: string) => {
            const fromIndex = tree.getIndexById(fromId)
            const toIndex = tree.getIndexById(toId)
            if (fromIndex === undefined || toIndex === undefined) {
                return
            }

            const start = Math.min(fromIndex, toIndex)
            const end = Math.max(fromIndex, toIndex)

            const next = new Set(selectedIds)
            for (let i = start; i <= end; i++) {
                const id = flatIds[i]
                if (id && !Tree.isSkeleton(id)) {
                    next.add(id)
                }
            }
            anchorRef.current = fromId
            applyChange(next)
        },
        [flatIds, selectedIds, tree, applyChange]
    )

    const isSelected = useCallback(
        (id: string) => selectedIds.has(id),
        [selectedIds]
    )

    const isIndeterminate = useCallback(
        (id: string) => {
            if (selectedIds.has(id)) {
                return false
            }
            const node = tree.getNode(id)
            if (!node || node.childrenIds.size === 0) {
                return false
            }
            for (const childId of node.childrenIds) {
                if (selectedIds.has(childId)) {
                    return true
                }
            }
            return false
        },
        [selectedIds, tree]
    )

    return {
        selectedIds,
        toggle,
        selectAll,
        deselectAll,
        selectRange,
        isSelected,
        isIndeterminate,
        count: selectedIds.size,
    }
}
