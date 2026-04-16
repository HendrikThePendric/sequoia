import { useContext } from 'react'
import type { NodeStore } from './node-store'
import { NodeStoreContext } from './node-store-provider'

export function useNodeStore(): NodeStore {
    const store = useContext(NodeStoreContext)
    if (!store) {
        throw new Error('useNodeStore must be used within a NodeStoreProvider')
    }
    return store
}
