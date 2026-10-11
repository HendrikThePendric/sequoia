import { useCallback, useRef, useState } from 'react'
import { Tree } from '../tree'

export type UseTreeKeyboardOptions = {
    tree: Tree
    flatIds: string[]
    onExpand: (id: string) => void
    onCollapse: (id: string) => void
    onSelect: (id: string) => void
    onSelectRange: (fromId: string, toId: string) => void
    selectAll: () => void
    enabled?: boolean
}

export type UseTreeKeyboardReturn = {
    /** The currently focused node ID. */
    focusedId: string | null
    /** KeyDown handler to attach to the scroll container. */
    onKeyDown: (event: React.KeyboardEvent) => void
}

function findNextRealIndex(flatIds: string[], fromIndex: number): number {
    for (let i = fromIndex + 1; i < flatIds.length; i++) {
        if (flatIds[i] && !Tree.isSkeleton(flatIds[i])) {
            return i
        }
    }
    return -1
}

function findPrevRealIndex(flatIds: string[], fromIndex: number): number {
    for (let i = fromIndex - 1; i >= 0; i--) {
        if (flatIds[i] && !Tree.isSkeleton(flatIds[i])) {
            return i
        }
    }
    return -1
}

/**
 * Manages keyboard navigation within the tree.
 *
 * Binds Arrow keys, Space, Enter, Home/End, and Ctrl+A.
 * Does not wrap at boundaries.
 */
export function useTreeKeyboard(
    options: UseTreeKeyboardOptions
): UseTreeKeyboardReturn {
    const {
        tree,
        flatIds,
        onExpand,
        onCollapse,
        onSelect,
        onSelectRange,
        selectAll,
        enabled = true,
    } = options
    const [focusedId, setFocusedId] = useState<string | null>(null)
    const anchorRef = useRef<string | null>(null)

    const onKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            if (!enabled) {
                return
            }

            const currentId = focusedId
            const currentIndex = currentId
                ? tree.getIndexById(currentId)
                : undefined

            if (currentIndex === undefined || !currentId) {
                // No focus yet — set focus to first real node
                if (flatIds.length > 0) {
                    const firstReal = flatIds.find((id) => !Tree.isSkeleton(id))
                    if (firstReal) {
                        setFocusedId(firstReal)
                        anchorRef.current = firstReal
                    }
                }
                return
            }

            const shift = event.shiftKey
            const ctrl = event.ctrlKey || event.metaKey

            switch (event.key) {
                case 'ArrowDown': {
                    event.preventDefault()
                    const nextIndex = findNextRealIndex(flatIds, currentIndex)
                    if (nextIndex === -1) {
                        return
                    }
                    const nextId = flatIds[nextIndex]

                    if (shift && anchorRef.current) {
                        onSelectRange(anchorRef.current, nextId)
                    }

                    setFocusedId(nextId)
                    break
                }

                case 'ArrowUp': {
                    event.preventDefault()
                    const prevIndex = findPrevRealIndex(flatIds, currentIndex)
                    if (prevIndex === -1) {
                        return
                    }
                    const prevId = flatIds[prevIndex]

                    if (shift && anchorRef.current) {
                        onSelectRange(anchorRef.current, prevId)
                    }

                    setFocusedId(prevId)
                    break
                }

                case 'ArrowRight': {
                    event.preventDefault()
                    const node = tree.getNode(currentId)
                    if (!node || node.childrenCount === 0) {
                        return
                    }

                    if (!tree.isOpen(currentId)) {
                        onExpand(currentId)
                    } else {
                        const nextIndex = findNextRealIndex(
                            flatIds,
                            currentIndex
                        )
                        if (nextIndex !== -1) {
                            setFocusedId(flatIds[nextIndex])
                        }
                    }
                    break
                }

                case 'ArrowLeft': {
                    event.preventDefault()
                    if (tree.isOpen(currentId)) {
                        onCollapse(currentId)
                    } else {
                        const node = tree.getNode(currentId)
                        if (node?.parent) {
                            const parentIndex = tree.getIndexById(node.parent)
                            if (parentIndex !== undefined) {
                                setFocusedId(node.parent)
                            }
                        }
                    }
                    break
                }

                case ' ': {
                    event.preventDefault()
                    onSelect(currentId)
                    anchorRef.current = currentId
                    break
                }

                case 'Enter': {
                    event.preventDefault()
                    const node = tree.getNode(currentId)
                    if (node && node.childrenCount > 0) {
                        if (tree.isOpen(currentId)) {
                            onCollapse(currentId)
                        } else {
                            onExpand(currentId)
                        }
                    }
                    break
                }

                case 'Home': {
                    event.preventDefault()
                    const firstReal = flatIds.find((id) => !Tree.isSkeleton(id))
                    if (firstReal) {
                        if (shift && anchorRef.current) {
                            onSelectRange(anchorRef.current, firstReal)
                        }
                        setFocusedId(firstReal)
                    }
                    break
                }

                case 'End': {
                    event.preventDefault()
                    let lastReal: string | null = null
                    for (let i = flatIds.length - 1; i >= 0; i--) {
                        if (!Tree.isSkeleton(flatIds[i])) {
                            lastReal = flatIds[i]
                            break
                        }
                    }
                    if (lastReal) {
                        if (shift && anchorRef.current) {
                            onSelectRange(anchorRef.current, lastReal)
                        }
                        setFocusedId(lastReal)
                    }
                    break
                }

                case 'a': {
                    if (ctrl) {
                        event.preventDefault()
                        selectAll()
                    }
                    break
                }

                default:
                    break
            }
        },
        [
            enabled,
            focusedId,
            flatIds,
            tree,
            onExpand,
            onCollapse,
            onSelect,
            onSelectRange,
            selectAll,
        ]
    )

    return {
        focusedId,
        onKeyDown,
    }
}
