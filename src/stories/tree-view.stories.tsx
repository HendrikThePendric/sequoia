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
import { TreeProvider, useTree } from '../tree'
import { TreeView } from '../ui'

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

function TreeStory() {
    return (
        <NodeStoreProvider adapter={adapter}>
            <TreeProvider rootIds={rootIds}>
                <TreeStoryInner />
            </TreeProvider>
        </NodeStoreProvider>
    )
}

function TreeStoryInner() {
    const { flatIds } = useTree()

    if (flatIds.length === 0) {
        return <div>Loading...</div>
    }

    return (
        <div style={{ height: '600px', width: '400px' }}>
            <TreeView />
        </div>
    )
}

export default {
    title: 'Tree/TreeView',
    component: TreeStory,
}

export const Default = {}
