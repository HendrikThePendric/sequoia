import { createContext, useState, type ReactNode } from 'react'
import { NodeStore } from './node-store'
import type { DataAdapter } from './types'

export const NodeStoreContext = createContext<NodeStore | null>(null)

type NodeStoreProviderProps = {
    adapter: DataAdapter
    children: ReactNode
}

export function NodeStoreProvider({
    adapter,
    children,
}: NodeStoreProviderProps) {
    const [nodeStore] = useState(() => new NodeStore(adapter))

    return (
        <NodeStoreContext.Provider value={nodeStore}>
            {children}
        </NodeStoreContext.Provider>
    )
}
