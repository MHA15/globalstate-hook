import { useEffect, useState } from 'react';

type SetState<T> = (s: T) => void;
type SetStateAction<T> = T | ((prev: T) => T)
type InitialAction<T> = T | (() => T)

function createUpdater<T>() {
    const listeners = new Set<SetState<T>>();
    const updateComponents = (action: T) => listeners.forEach(fn => fn(action));
    const addListener = (setState: SetState<T>) => {
        listeners.add(setState);
        return () => {
            listeners.delete(setState);
        };
    };
    return {updateComponents, addListener};
}

export function createGlobalState<T>(initial: InitialAction<T>) {
    const {updateComponents, addListener} = createUpdater<T>();

    const store = {
        // @ts-ignore
        state: typeof initial === 'function' ? initial() : initial,
        get() {
            return store.state
        },
        set(value: SetStateAction<T>) {
            // @ts-ignore
            store.state = typeof value === 'function' ? value(store.state) : value;
            updateComponents(store.state);
        }
    };

    function useStore() {
        const [state, setState] = useState(store.state);
        useEffect(() => addListener(setState), []);
        return state;
    }

    return [useStore, store]
}

/*
export function createGlobalReducer<T>(initial: T | (() => T)) {
    const {updateComponents, addListener} = createUpdater();

    // @ts-ignore
    const state: {current: T} = {current: typeof initial === 'function' ? initial() : initial};

    function getState() {
        return state.current;
    }
    getState[updateSymbol] = addListener;

    function setState(value: T | ((s: T) => T)) {
        // @ts-ignore
        state.current = typeof value === 'function' ? value(state.current) : value;
        updateComponents();
    }

    return [getState, setState] as const;
}
*/
