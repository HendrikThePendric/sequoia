import { createContext, useEffect, useState, type ReactNode } from 'react'
import { useNodeStore } from '../node-store'
import { Tree } from './tree'

export const TreeContext = createContext<Tree | null>(null)

type TreeProviderProps = {
    rootIds: string[]
    children: ReactNode
}

const rootKey = (ids: string[]) => ids.join(',')

export function TreeProvider({ rootIds, children }: TreeProviderProps) {
    const nodeStore = useNodeStore()
    const [tree, setTree] = useState(() => new Tree(nodeStore, rootIds))
    const key = rootKey(rootIds)

    useEffect(() => {
        nodeStore.fetchNodesByIds(rootIds).then(() => {
            setTree(new Tree(nodeStore, rootIds))
        })
        // key = rootIds.join(',') is a stable string derived from rootIds,
        // avoiding referential inequality that would cause infinite loops.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeStore, key])

    return <TreeContext.Provider value={tree}>{children}</TreeContext.Provider>
}
