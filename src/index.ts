// -- Core: data layer --
export { NodeStore, NodeStoreProvider, useNodeStore } from './node-store'
export type {
    AdapterNode,
    FilteredResponse,
    FilterOptions,
    PagedResponse,
    Pager,
    StoreNode,
    DataAdapter,
} from './node-store'

// -- Core: tree logic --
export { Tree, TreeProvider, useTree } from './tree'
export type {
    SkeletonId,
    TreeSurface,
    UseTreeOptions,
    UseTreeReturn,
} from './tree'

// -- Feature: search --
// useTreeSearch manages the search lifecycle: debounced queries, pagination,
// and feeding incremental results into the Tree's search mode.
export { useTreeSearch } from './tree-search'
export type { UseTreeSearchOptions, UseTreeSearchReturn } from './tree-search'

// -- Feature: multi-select --
export { useTreeSelection } from './tree-selection'
export type {
    UseTreeSelectionOptions,
    UseTreeSelectionReturn,
} from './tree-selection'

// -- Feature: keyboard navigation --
export { useTreeKeyboard } from './tree-keyboard'
export type {
    UseTreeKeyboardOptions,
    UseTreeKeyboardReturn,
} from './tree-keyboard'
