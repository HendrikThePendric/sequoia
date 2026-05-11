import { useContext } from 'react'
import { useNodeStore } from '../node-store'
import type { StoreNode } from '../node-store'
import { TreeContext } from '../tree/tree-provider'

export type NodeState = StoreNode & {
    isOpen: boolean
    hasAllChildren: boolean
}

export function useNode(id: string): NodeState | undefined {
    const tree = useContext(TreeContext)
    if (!tree) {
        throw new Error('useNode must be used within a TreeProvider')
    }

    const nodeStore = useNodeStore()
    const node = nodeStore.getNode(id)

    if (!node) {
        return undefined
    }

    return {
        ...node,
        isOpen: tree.isOpen(id),
        hasAllChildren: nodeStore.hasAllChildren(id),
    }
}
