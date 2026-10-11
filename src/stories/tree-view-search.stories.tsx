import { AsyncMockTreeApi } from '../../tools/mock-tree-api/async-mock-tree-api'
import type { Tree as TreeData } from '../../tools/tree-generator/generators/generate-tree'
import treeData from '../__fixtures__/deep-tree.json'
import type {
    DataAdapter,
    AdapterNode,
    FilteredResponse,
    PagedResponse,
} from '../node-store'
import { NodeStoreProvider } from '../node-store'
import { Tree, TreeProvider, useTree } from '../tree'
import { useTreeSearch } from '../tree-search'

function createMockDataAdapter(api: AsyncMockTreeApi): DataAdapter {
    return {
        async getNodesByIds(ids: string[]): Promise<AdapterNode[]> {
            return api.getNodesByIds(ids)
        },
        async getNodeChildren(
            id: string,
            page: number
        ): Promise<PagedResponse<AdapterNode>> {
            const result = await api.getNodeChildren(id, page)
            return { pager: result.pager, data: result.results }
        },
        async getNodeDescendants(
            id: string,
            page: number,
            maxLevel?: number
        ): Promise<PagedResponse<AdapterNode>> {
            const result = await api.getNodeDescendants(id, page, maxLevel)
            return { pager: result.pager, data: result.results }
        },
        async getFilteredNodes(
            filter: string,
            page: number,
            options?: { rootIds?: string[]; includeAncestors?: boolean }
        ): Promise<FilteredResponse<AdapterNode>> {
            const result = await api.getFilteredNodes(
                (node) =>
                    node.displayName
                        .toLowerCase()
                        .includes(filter.toLowerCase()),
                page,
                options
            )
            return {
                pager: result.pager,
                data: result.results,
                matchedIds: result.matchedIds,
                ancestorIds: result.ancestorIds,
            }
        },
    }
}

const api = new AsyncMockTreeApi(treeData as TreeData, { delay: 800 })
const adapter = createMockDataAdapter(api)

const rootIds = (treeData as TreeData).map((node) => node.id)

function SearchBar({
    value,
    onChange,
    onClear,
    searching,
    total,
}: {
    value: string
    onChange: (v: string) => void
    onClear: () => void
    searching: boolean
    total: number
}) {
    return (
        <div style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
            <div style={{ display: 'flex', gap: 8 }}>
                <input
                    type="text"
                    placeholder="Search displayName..."
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{
                        flex: 1,
                        padding: '4px 8px',
                        fontSize: 13,
                        border: '1px solid #ccc',
                        borderRadius: 3,
                    }}
                />
                {searching && (
                    <button
                        onClick={onClear}
                        style={{
                            padding: '4px 8px',
                            fontSize: 12,
                            border: '1px solid #ccc',
                            borderRadius: 3,
                            background: '#eee',
                            cursor: 'pointer',
                        }}
                    >
                        clear
                    </button>
                )}
            </div>
            {searching && (
                <div
                    style={{
                        fontSize: 11,
                        color: '#666',
                        marginTop: 4,
                    }}
                >
                    {total} total results — click to expand/collapse branches
                </div>
            )}
        </div>
    )
}

function SearchableTreeStory() {
    const { tree, flatIds, virtualItems, parentRef, totalSize } = useTree()
    const search = useTreeSearch({ tree, virtualItems })

    return (
        <div
            style={{
                height: '600px',
                width: '400px',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <SearchBar
                value={search.query}
                onChange={search.setQuery}
                onClear={search.clear}
                searching={search.searching}
                total={search.totalResultCount}
            />
            {search.loading && !search.searching ? (
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'monospace',
                        color: '#666',
                        fontSize: 14,
                    }}
                >
                    Searching...
                </div>
            ) : (
                <div ref={parentRef} style={{ flex: 1, overflow: 'auto' }}>
                    <ul
                        className="tree-list"
                        style={{
                            height: `${totalSize}px`,
                            position: 'relative',
                            margin: 0,
                            padding: 0,
                            listStyle: 'none',
                        }}
                    >
                        {virtualItems.map((virtualItem) => {
                            const id = flatIds[virtualItem.index]
                            if (!id) {
                                return (
                                    <li
                                        key={`ph-${virtualItem.index}`}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualItem.size}px`,
                                            transform: `translateY(${virtualItem.start}px)`,
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: 'block',
                                                height: 12,
                                                margin: '0 12px',
                                                flex: 1,
                                                background: '#f0f0f0',
                                                borderRadius: 3,
                                            }}
                                        />
                                    </li>
                                )
                            }
                            return (
                                <SearchableTreeRow
                                    key={id}
                                    id={id}
                                    tree={tree}
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
            )}
        </div>
    )
}

function SearchableTreeRow({
    id,
    tree,
    style,
}: {
    id: string
    tree: Tree
    style: React.CSSProperties
}) {
    const node = tree.getNode(id)

    if (!node || Tree.isSkeleton(id)) {
        return (
            <li style={style}>
                <span
                    style={{
                        display: 'block',
                        height: '100%',
                        margin: '2px 12px',
                        background: '#f0f0f0',
                        borderRadius: 3,
                    }}
                />
            </li>
        )
    }

    const { displayName, level, childrenCount } = node
    const isLeaf = childrenCount === 0
    const indent = (level - 1) * 20
    const isMatch = tree.isFilterMatch(id)
    const isAncestor = tree.isFilterAncestor(id)
    const isOpen = tree.isOpen(id)
    const showChevron = isOpen || (isAncestor && !isLeaf)
    const needsLoadButton = isAncestor && !isOpen && !isLeaf

    return (
        <li
            style={{
                ...style,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: `${indent}px`,
                fontFamily: 'monospace',
                fontSize: 13,
                boxSizing: 'border-box',
                borderBottom: '1px solid #f0f0f0',
                cursor: !isLeaf ? 'pointer' : 'default',
                background: isMatch ? '#fff3cd' : 'transparent',
            }}
            onClick={
                !isLeaf && !needsLoadButton ? () => tree.toggle(id) : undefined
            }
        >
            <span
                style={{
                    width: 16,
                    fontSize: 10,
                    flexShrink: 0,
                    textAlign: 'center',
                }}
            >
                {showChevron ? 'v' : !isLeaf ? '>' : ''}
            </span>
            <span
                style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: isMatch ? 'bold' : 'normal',
                    color: isAncestor && !isMatch ? '#888' : '#000',
                }}
            >
                {displayName}
            </span>
            {needsLoadButton && (
                <span
                    style={{
                        marginLeft: 12,
                        fontSize: 11,
                        color: '#0066cc',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                    }}
                    onClick={(e) => {
                        e.stopPropagation()
                        tree.toggle(id)
                    }}
                >
                    show all
                </span>
            )}
        </li>
    )
}

export default {
    title: 'Tree/TreeView Search',
    component: SearchableTreeStory,
}

export const Searchable = () => (
    <NodeStoreProvider adapter={adapter}>
        <TreeProvider rootIds={rootIds}>
            <SearchableTreeStory />
        </TreeProvider>
    </NodeStoreProvider>
)
