import { useEffect, useState } from 'react';

type SetState<T> = (s: T) => void;
type SetStateAction<T> = T | ((prev: T) => T)
type InitialAction<T> = T | (() => T)

interface Config {
    suspendable?: boolean;
}
const defaultConfig = {
    suspendable: false
} as const;

function makeDeferred<T>() {
    type D = { resolve: (v: T) => void, reject: (e: Error) => void };
    const p: Promise<T> & Partial<D> = new Promise<T>((resolve, reject) => {
        p.resolve = resolve;
        p.reject = reject;
    });
    return p as Promise<T> & D;
}

function createSuspendHandler<T>() {
    let deferred: ReturnType<typeof makeDeferred> | null = null;
    let state: T | undefined;
    function getOrSuspend() {
        if (state !== undefined && deferred) {
            deferred.resolve(state);
            deferred = null;
        } else if(state === undefined && !deferred)
            deferred = makeDeferred<T>();

        if (deferred) {
            throw deferred;
        } else {
            return state as T;
        }
    }
    function updateSuspender(_state: T) {
       state = _state;
    }

    return [getOrSuspend, updateSuspender] as const;
}

function createUpdater<T>() {
    const listeners = new Set<SetState<T>>();

    function updateComponents(state: T) {
        return listeners.forEach(fn => fn(state));
    }

    function useListen<C extends Config>(initialValue: T) {
        const [state, setState] = useState(initialValue);
        useEffect(() => {
            listeners.add(setState);
            return () => {
                listeners.delete(setState);
            };
        }, []);
        return state;
    }

    return { updateComponents, useListen };
}

function isFuncState<T>(action: SetStateAction<T>): action is ((prev: T) => T);
function isFuncState<T>(action: InitialAction<T>): action is (() => T);
function isFuncState<T>(action: SetStateAction<T> | InitialAction<T>) {
    return typeof action === 'function'
}

export function createGlobalState<T, C extends Config>(initial: InitialAction<T>, config?: C) {
    const {updateComponents, useListen} = createUpdater<T>();
    const [getOrSuspend, updateSuspender] = createSuspendHandler<T>();

    let _private_state;
    const store = {
        get state() {
            return _private_state;
        },
        set state(value: T) {
            _private_state = value;
            updateSuspender(value);
            updateComponents(value);
        },
        get() {
            return store.state
        },
        set(value: SetStateAction<T>) {
            store.state = isFuncState(value) ? value(store.state) : value;
        }
    };

    store.state = isFuncState(initial) ? initial() : initial;

    function useStore<OC extends Config>(overrideConfig?: OC): MixedConditions3<typeof defaultConfig['suspendable'], C['suspendable'], OC['suspendable']> extends true ? NonNullable<T> : T {
        const state = useListen(store.state);
        const c = {...defaultConfig, ...config, ...overrideConfig};
        if (c.suspendable) {
            return getOrSuspend() as any;
        } else {
            return state as any;
        }
    }

    return [useStore, store] as const;
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

type MixedConditions2<A, B> = B extends boolean ? B : A;
type MixedConditions3<A, B, C> = C extends boolean ? C : MixedConditions2<A, B>;
