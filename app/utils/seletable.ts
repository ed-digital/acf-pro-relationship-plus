import produce from 'immer'

type Callback<T = any, R = any> = (arg?: T) => R

export type Selectable<T> = {
  subscribe(fn: Callback<T>): () => any
  state(): T
  select<V>(selector: Callback<T, V>, onChange: Callback<V>): () => any
  getSnapshot(): number
  set(fn: Callback<T>): any
  destroy(): any
  clone(): Selectable<T>
}

export function selectable<T = any>(originalState: T): Selectable<T> {
  let currentState = originalState
  let listeners = new Set<Callback>()
  let version = 0

  function update() {
    listeners.forEach((listener) => {
      listener(currentState)
    })
  }

  function set(fn: Callback<T>) {
    let prevState = currentState
    currentState = produce(currentState, fn)
    if (currentState !== prevState) {
      version++
      update()
    }
  }

  /* get new state */
  function subscribe(fn: Callback<T>) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }

  /* Get current state */
  function state() {
    return currentState
  }

  function select<R, V extends Callback<T, R>>(
    selector: V,
    onChange: Callback<R>
  ) {
    let prev = selector(currentState)
    onChange(prev)
    return subscribe((s) => {
      let val = selector(s)
      if (val !== prev) {
        prev = val
        onChange(val)
      }
    })
  }

  function getSnapshot() {
    return version
  }

  function clone() {
    return selectable(currentState)
  }

  function destroy() {
    listeners.clear()
  }

  return { state, set, subscribe, select, getSnapshot, destroy, clone }
}
