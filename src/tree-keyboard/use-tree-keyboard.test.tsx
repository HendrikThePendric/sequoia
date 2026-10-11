import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NodeStore } from '../node-store'
import type { AdapterNode, DataAdapter } from '../node-store'
import { Tree } from '../tree'
import { useTreeKeyboard } from './use-tree-keyboard'
import type {
    UseTreeKeyboardOptions,
    UseTreeKeyboardReturn,
} from './use-tree-keyboard'

function createAdapterNode(
    overrides: Partial<AdapterNode> & { id: string }
): AdapterNode {
    return {
        displayName: overrides.displayName ?? `Node ${overrides.id}`,
        level: overrides.level ?? 1,
        path: overrides.path ?? `/${overrides.id}`,
        parent: overrides.parent ?? null,
        childrenCount: overrides.childrenCount ?? 0,
        ...overrides,
    }
}

function createMockAdapter(): DataAdapter {
    return {
        getNodesByIds: vi.fn().mockResolvedValue([]),
        getNodeChildren: vi.fn().mockResolvedValue({
            pager: { page: 1, pageSize: 50, total: 0, pages: 0 },
            data: [],
        }),
        getNodeDescendants: vi.fn().mockResolvedValue({
            pager: { page: 1, pageSize: 50, total: 0, pages: 0 },
            data: [],
        }),
        getFilteredNodes: vi.fn().mockResolvedValue({
            pager: { page: 1, pageSize: 50, total: 0, pages: 0 },
            data: [],
            matchedIds: [],
            ancestorIds: [],
        }),
    }
}

async function createStore(nodes: AdapterNode[]): Promise<NodeStore> {
    const adapter = createMockAdapter()
    vi.mocked(adapter.getNodesByIds).mockResolvedValue(nodes)
    const store = new NodeStore(adapter)
    await store.fetchNodesByIds(nodes.map((n) => n.id))
    return store
}

function keyEvent(
    key: string,
    {
        shiftKey = false,
        ctrlKey = false,
    }: { shiftKey?: boolean; ctrlKey?: boolean } = {}
): React.KeyboardEvent {
    return {
        key,
        shiftKey,
        ctrlKey,
        metaKey: false,
        altKey: false,
        code: key,
        locale: '',
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        nativeEvent: {} as KeyboardEvent,
        currentTarget: {} as EventTarget & Element,
        target: {} as EventTarget & Element,
        bubbles: false,
        cancelable: false,
        defaultPrevented: false,
        eventPhase: 0,
        isTrusted: false,
        timeStamp: 0,
        type: 'keydown',
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false,
        persist: () => {},
        detail: 0,
        view: null,
        which: 0,
        charCode: 0,
        keyCode: 0,
        location: 0,
        repeat: false,
        getModifierState: () => false,
    } as unknown as React.KeyboardEvent
}

function renderKeyboardHook(
    tree: Tree,
    options: Partial<Omit<UseTreeKeyboardOptions, 'tree' | 'flatIds'>> = {}
) {
    const callbacks = {
        onExpand: vi.fn(),
        onCollapse: vi.fn(),
        onSelect: vi.fn(),
        onSelectRange: vi.fn(),
        selectAll: vi.fn(),
        ...options,
    }

    const hookResult = renderHook<
        UseTreeKeyboardReturn,
        Omit<UseTreeKeyboardOptions, 'tree' | 'flatIds'>
    >((opts) => {
        const merged = { ...callbacks, ...opts }
        return useTreeKeyboard({
            tree,
            flatIds: tree.getFlatIds(),
            onExpand: merged.onExpand,
            onCollapse: merged.onCollapse,
            onSelect: merged.onSelect,
            onSelectRange: merged.onSelectRange,
            selectAll: merged.selectAll,
            enabled: merged.enabled,
        })
    })

    return { ...hookResult, callbacks }
}

describe('useTreeKeyboard', () => {
    describe('initial focus', () => {
        it('sets focus to first non-skeleton node on keydown', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'a' }),
                createAdapterNode({ id: 'b' }),
            ])
            const tree = new Tree(store, ['a', 'b'])
            const { result } = renderKeyboardHook(tree)

            expect(result.current.focusedId).toBeNull()

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })

            expect(result.current.focusedId).toBe('a')
        })

        it('skips skeleton rows for initial focus', async () => {
            const store = await createStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 1,
                }),
            ])
            const tree = new Tree(store, ['root'])
            tree.open('root')
            const { result } = renderKeyboardHook(tree)

            // flatIds = ['root', 'skeleton:root:0']
            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })

            expect(result.current.focusedId).toBe('root')
        })
    })

    describe('ArrowDown', () => {
        it('moves focus to the next non-skeleton node', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'a' }),
                createAdapterNode({ id: 'b' }),
                createAdapterNode({ id: 'c' }),
            ])
            const tree = new Tree(store, ['a', 'b', 'c'])
            const { result } = renderKeyboardHook(tree)

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            expect(result.current.focusedId).toBe('a')

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            expect(result.current.focusedId).toBe('b')

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            expect(result.current.focusedId).toBe('c')
        })

        it('does not move past the last node', async () => {
            const store = await createStore([createAdapterNode({ id: 'a' })])
            const tree = new Tree(store, ['a'])
            const { result } = renderKeyboardHook(tree)

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            expect(result.current.focusedId).toBe('a')

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            expect(result.current.focusedId).toBe('a')
        })

        it('skips skeleton rows', async () => {
            const store = await createStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 1,
                }),
                createAdapterNode({
                    id: 'child',
                    parent: 'root',
                    level: 2,
                }),
            ])
            const tree = new Tree(store, ['root'])
            tree.open('root')
            const { result } = renderKeyboardHook(tree)

            // flatIds = ['root', 'child']
            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            expect(result.current.focusedId).toBe('root')

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            expect(result.current.focusedId).toBe('child')
        })
    })

    describe('ArrowUp', () => {
        it('moves focus to the previous non-skeleton node', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'a' }),
                createAdapterNode({ id: 'b' }),
            ])
            const tree = new Tree(store, ['a', 'b'])
            const { result } = renderKeyboardHook(tree)

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            expect(result.current.focusedId).toBe('b')

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowUp'))
            })
            expect(result.current.focusedId).toBe('a')
        })

        it('does not move past the first node', async () => {
            const store = await createStore([createAdapterNode({ id: 'a' })])
            const tree = new Tree(store, ['a'])
            const { result } = renderKeyboardHook(tree)

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            expect(result.current.focusedId).toBe('a')

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowUp'))
            })
            expect(result.current.focusedId).toBe('a')
        })
    })

    describe('ArrowRight', () => {
        it('calls onExpand for a collapsed non-leaf node', async () => {
            const store = await createStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 1,
                }),
            ])
            const tree = new Tree(store, ['root'])
            const { result, callbacks } = renderKeyboardHook(tree)

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            expect(result.current.focusedId).toBe('root')

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowRight'))
            })

            expect(callbacks.onExpand).toHaveBeenCalledWith('root')
        })

        it('moves to first child for an expanded node', async () => {
            const store = await createStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 1,
                }),
                createAdapterNode({
                    id: 'child',
                    parent: 'root',
                    level: 2,
                }),
            ])
            const tree = new Tree(store, ['root'])
            tree.open('root')
            const { result } = renderKeyboardHook(tree)

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            expect(result.current.focusedId).toBe('root')

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowRight'))
            })
            expect(result.current.focusedId).toBe('child')
        })

        it('does nothing for a leaf node', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'a', childrenCount: 0 }),
            ])
            const tree = new Tree(store, ['a'])
            const { result } = renderKeyboardHook(tree)

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            expect(result.current.focusedId).toBe('a')

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowRight'))
            })
            expect(result.current.focusedId).toBe('a')
        })
    })

    describe('ArrowLeft', () => {
        it('calls onCollapse for an expanded node', async () => {
            const store = await createStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 1,
                }),
            ])
            const tree = new Tree(store, ['root'])
            tree.open('root')
            const { result, callbacks } = renderKeyboardHook(tree)

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            expect(result.current.focusedId).toBe('root')

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowLeft'))
            })

            expect(callbacks.onCollapse).toHaveBeenCalledWith('root')
        })

        it('moves to parent for a collapsed node', async () => {
            const store = await createStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 1,
                }),
                createAdapterNode({
                    id: 'child',
                    parent: 'root',
                    level: 2,
                }),
            ])
            const tree = new Tree(store, ['root'])
            tree.open('root')
            const { result, callbacks } = renderKeyboardHook(tree)

            // Navigate to child
            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            act(() => {
                result.current.onKeyDown(keyEvent('ArrowRight'))
            })
            expect(result.current.focusedId).toBe('child')

            // Collapse root so child disappears from flatIds
            // Move focus back to root
            act(() => {
                result.current.onKeyDown(keyEvent('ArrowUp'))
            })
            expect(result.current.focusedId).toBe('root')
            act(() => {
                result.current.onKeyDown(keyEvent('ArrowLeft'))
            })
            ;(callbacks.onCollapse as ReturnType<typeof vi.fn>).mockClear()

            // Now navigate back to child (still in position)
            tree.open('root')
            act(() => {
                result.current.onKeyDown(keyEvent('ArrowRight'))
            })
            expect(result.current.focusedId).toBe('child')

            // ArrowLeft on collapsed child → move to parent
            act(() => {
                result.current.onKeyDown(keyEvent('ArrowLeft'))
            })
            expect(result.current.focusedId).toBe('root')
        })

        it('does nothing for a root node', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'a', childrenCount: 0 }),
            ])
            const tree = new Tree(store, ['a'])
            const { result, callbacks } = renderKeyboardHook(tree)

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            expect(result.current.focusedId).toBe('a')

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowLeft'))
            })
            expect(result.current.focusedId).toBe('a')
            expect(callbacks.onCollapse).not.toHaveBeenCalled()
        })
    })

    describe('Space', () => {
        it('calls onSelect with the focused node', async () => {
            const store = await createStore([createAdapterNode({ id: 'a' })])
            const tree = new Tree(store, ['a'])
            const { result, callbacks } = renderKeyboardHook(tree)

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            act(() => {
                result.current.onKeyDown(keyEvent(' ', { shiftKey: false }))
            })

            expect(callbacks.onSelect).toHaveBeenCalledWith('a')
        })
    })

    describe('Shift+Arrow', () => {
        it('calls onSelectRange from anchor after Space sets anchor', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'a' }),
                createAdapterNode({ id: 'b' }),
                createAdapterNode({ id: 'c' }),
            ])
            const tree = new Tree(store, ['a', 'b', 'c'])
            const { result, callbacks } = renderKeyboardHook(tree)

            // Focus and select 'a' (sets anchor)
            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            act(() => {
                result.current.onKeyDown(keyEvent(' ', { shiftKey: false }))
            })
            expect(callbacks.onSelect).toHaveBeenCalledWith('a')

            // Shift+ArrowDown twice → extend to 'b' and 'c'
            act(() => {
                result.current.onKeyDown(
                    keyEvent('ArrowDown', { shiftKey: true })
                )
            })
            expect(callbacks.onSelectRange).toHaveBeenCalledWith('a', 'b')

            act(() => {
                result.current.onKeyDown(
                    keyEvent('ArrowDown', { shiftKey: true })
                )
            })
            expect(callbacks.onSelectRange).toHaveBeenCalledWith('a', 'c')
        })

        it('Shift+ArrowUp ranges from anchor upward', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'a' }),
                createAdapterNode({ id: 'b' }),
                createAdapterNode({ id: 'c' }),
            ])
            const tree = new Tree(store, ['a', 'b', 'c'])
            const { result, callbacks } = renderKeyboardHook(tree)

            // Focus and select 'b' (sets anchor)
            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            act(() => {
                result.current.onKeyDown(keyEvent(' ', { shiftKey: false }))
            })
            expect(result.current.focusedId).toBe('b')

            // Shift+ArrowUp → range from 'b' to 'a'
            act(() => {
                result.current.onKeyDown(
                    keyEvent('ArrowUp', { shiftKey: true })
                )
            })
            expect(callbacks.onSelectRange).toHaveBeenCalledWith('b', 'a')
        })
    })

    describe('Ctrl+A', () => {
        it('calls selectAll', async () => {
            const store = await createStore([createAdapterNode({ id: 'a' })])
            const tree = new Tree(store, ['a'])
            const { result, callbacks } = renderKeyboardHook(tree)

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            act(() => {
                result.current.onKeyDown(keyEvent('a', { ctrlKey: true }))
            })

            expect(callbacks.selectAll).toHaveBeenCalled()
        })
    })

    describe('Home / End', () => {
        it('Home moves to first node', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'a' }),
                createAdapterNode({ id: 'b' }),
                createAdapterNode({ id: 'c' }),
            ])
            const tree = new Tree(store, ['a', 'b', 'c'])
            const { result } = renderKeyboardHook(tree)

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            expect(result.current.focusedId).toBe('b')

            act(() => {
                result.current.onKeyDown(keyEvent('Home'))
            })
            expect(result.current.focusedId).toBe('a')
        })

        it('End moves to last non-skeleton node', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'a' }),
                createAdapterNode({ id: 'b' }),
            ])
            const tree = new Tree(store, ['a', 'b'])
            const { result } = renderKeyboardHook(tree)

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            expect(result.current.focusedId).toBe('a')

            act(() => {
                result.current.onKeyDown(keyEvent('End'))
            })
            expect(result.current.focusedId).toBe('b')
        })
    })

    describe('Enter', () => {
        it('calls onExpand for a collapsed non-leaf node', async () => {
            const store = await createStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 1,
                }),
            ])
            const tree = new Tree(store, ['root'])
            const { result, callbacks } = renderKeyboardHook(tree)

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            act(() => {
                result.current.onKeyDown(keyEvent('Enter'))
            })

            expect(callbacks.onExpand).toHaveBeenCalledWith('root')
        })

        it('calls onCollapse for an expanded non-leaf node', async () => {
            const store = await createStore([
                createAdapterNode({
                    id: 'root',
                    childrenCount: 1,
                }),
            ])
            const tree = new Tree(store, ['root'])
            tree.open('root')
            const { result, callbacks } = renderKeyboardHook(tree)

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            act(() => {
                result.current.onKeyDown(keyEvent('Enter'))
            })

            expect(callbacks.onCollapse).toHaveBeenCalledWith('root')
        })

        it('does nothing for a leaf node', async () => {
            const store = await createStore([
                createAdapterNode({ id: 'a', childrenCount: 0 }),
            ])
            const tree = new Tree(store, ['a'])
            const { result, callbacks } = renderKeyboardHook(tree)

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })
            act(() => {
                result.current.onKeyDown(keyEvent('Enter'))
            })

            expect(callbacks.onExpand).not.toHaveBeenCalled()
            expect(callbacks.onCollapse).not.toHaveBeenCalled()
        })
    })

    describe('disabled', () => {
        it('does nothing when enabled is false', async () => {
            const store = await createStore([createAdapterNode({ id: 'a' })])
            const tree = new Tree(store, ['a'])
            const { result } = renderKeyboardHook(tree, { enabled: false })

            act(() => {
                result.current.onKeyDown(keyEvent('ArrowDown'))
            })

            expect(result.current.focusedId).toBeNull()
        })
    })
})
