import { createContext, useState, type ReactNode } from 'react'
import { useNodeStore } from '../node-store'
import { Tree } from './tree'

export const TreeContext = createContext<Tree | null>(null)

type TreeProviderProps = {
    rootIds: string[]
    children: ReactNode
}

export function TreeProvider({ rootIds, children }: TreeProviderProps) {
    const nodeStore = useNodeStore()
    const [tree] = useState(() => new Tree(nodeStore, rootIds))

    return <TreeContext.Provider value={tree}>{children}</TreeContext.Provider>
}
