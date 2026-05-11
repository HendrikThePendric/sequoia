import { useVirtualTree } from '../virtual-tree'
import type { UseVirtualTreeOptions } from '../virtual-tree'
import { TreeRow } from './tree-row'
import styles from './tree-view.module.css'

type TreeViewProps = UseVirtualTreeOptions

export function TreeView(props: TreeViewProps) {
    const { flatIds, virtualItems, parentRef, totalSize } =
        useVirtualTree(props)

    return (
        <div ref={parentRef} className={styles.tree}>
            <ul
                className={styles.list}
                style={{
                    height: `${totalSize}px`,
                    position: 'relative',
                }}
            >
                {virtualItems.map((virtualItem) => {
                    const id = flatIds[virtualItem.index]
                    if (!id) {
                        return (
                            <li
                                key={`placeholder-${virtualItem.index}`}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualItem.size}px`,
                                    transform: `translateY(${virtualItem.start}px)`,
                                }}
                            />
                        )
                    }
                    return (
                        <TreeRow
                            key={id}
                            id={id}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualItem.size}px`,
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                        />
                    )
                })}
            </ul>
        </div>
    )
}
