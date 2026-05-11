import type { CSSProperties } from 'react'
import { useNode } from '../node'
import { Tree, useTree } from '../tree'
import type { SkeletonId } from '../tree'
import styles from './tree-row.module.css'

type TreeRowProps = {
    id: string
    style?: CSSProperties
}

function SkeletonRow({
    skeleton,
    style,
}: {
    skeleton: SkeletonId
    style?: CSSProperties
}) {
    const nodeState = useNode(skeleton.parentId)
    const level = nodeState ? nodeState.level + 1 : 1
    const indent = (level - 1) * 24

    return (
        <li
            className={`${styles.row} ${styles.skeleton}`}
            style={{ ...style, paddingLeft: `${indent}px` }}
        >
            <div className={styles.toggler} />
            <div className={styles.icon} />
            <span className={styles.label}>
                <span className={styles.skeletonBar} />
            </span>
        </li>
    )
}

export function TreeRow({ id, style }: TreeRowProps) {
    const tree = useTree()

    if (Tree.isSkeleton(id)) {
        const skeleton = Tree.parseSkeletonId(id)
        if (!skeleton) {
            return null
        }
        return <SkeletonRow skeleton={skeleton} style={style} />
    }

    return <RealTreeRow id={id} tree={tree} style={style} />
}

function RealTreeRow({
    id,
    tree,
    style,
}: {
    id: string
    tree: ReturnType<typeof useTree>
    style?: CSSProperties
}) {
    const nodeState = useNode(id)

    if (!nodeState) {
        return null
    }

    const { displayName, level, childrenCount, isOpen } = nodeState
    const isLeaf = childrenCount === 0
    const indent = (level - 1) * 24

    return (
        <li
            className={styles.row}
            style={{ ...style, paddingLeft: `${indent}px` }}
        >
            <div
                className={`${styles.toggler} ${!isLeaf ? styles.hasChildren : ''}`}
                onClick={!isLeaf ? () => tree.toggle(id) : undefined}
            >
                {!isLeaf && (
                    <svg
                        className={`${styles.arrow} ${isOpen ? styles.open : ''}`}
                        viewBox="0 0 48 48"
                    >
                        <path d="M14 20l10 10 10-10z" />
                    </svg>
                )}
            </div>
            <div className={styles.icon}>
                {isLeaf ? (
                    <svg viewBox="0 0 16 16">
                        <circle cx="8" cy="8" r="3" />
                    </svg>
                ) : isOpen ? (
                    <svg viewBox="0 0 16 16">
                        <path d="M1 3h14v2H1zM1 7h8v8H1z" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 16 16">
                        <path d="M1 3h6l2 2h6v10H1z" />
                    </svg>
                )}
            </div>
            <span className={styles.label}>{displayName}</span>
        </li>
    )
}
