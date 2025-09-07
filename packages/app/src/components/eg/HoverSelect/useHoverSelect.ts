import { useCallback, useMemo } from 'react'
import { create } from 'zustand'

export type SelectOption<T = string> = {
  value: T
  label: string
  icon?: React.ReactNode
  disabled?: boolean
}

type HoverSelectStore = {
  values: {
    [key: string]: any
  }
  multiValues: {
    [key: string]: Set<any>
  }
  isOpen: {
    [key: string]: boolean
  }
  setValue: (selectId: string, value: any) => void
  setMultiValue: (selectId: string, values: Set<any>) => void
  toggleMultiValue: (selectId: string, value: any) => void
  clearMultiValues: (selectId: string) => void
  selectAllMultiValues: (selectId: string, values: any[]) => void
  openSelect: (selectId: string) => void
  closeSelect: (selectId: string) => void
}

const useHoverSelectStore = create<HoverSelectStore>((set) => ({
  values: {},
  multiValues: {},
  isOpen: {},
  setValue: (selectId: string, value: any) => set((state) => ({ values: { ...state.values, [selectId]: value } })),
  setMultiValue: (selectId: string, values: Set<any>) =>
    set((state) => ({ multiValues: { ...state.multiValues, [selectId]: values } })),
  toggleMultiValue: (selectId: string, value: any) =>
    set((state) => {
      const current = state.multiValues[selectId] || new Set()
      const newSet = new Set(current)
      if (newSet.has(value)) {
        newSet.delete(value)
      } else {
        newSet.add(value)
      }
      return { multiValues: { ...state.multiValues, [selectId]: newSet } }
    }),
  clearMultiValues: (selectId: string) =>
    set((state) => ({ multiValues: { ...state.multiValues, [selectId]: new Set() } })),
  selectAllMultiValues: (selectId: string, values: any[]) =>
    set((state) => ({ multiValues: { ...state.multiValues, [selectId]: new Set(values) } })),
  openSelect: (selectId: string) => set((state) => ({ isOpen: { ...state.isOpen, [selectId]: true } })),
  closeSelect: (selectId: string) => set((state) => ({ isOpen: { ...state.isOpen, [selectId]: false } })),
}))

export function useHoverSelect<T = string>(
  selectId: string,
  options?: {
    defaultValue?: T
    defaultValues?: T[]
    multiple?: boolean
  },
) {
  const store = useHoverSelectStore()
  const isOpen = useMemo(() => store.isOpen[selectId] === true, [store.isOpen, selectId])
  const value = useMemo(
    () => store.values[selectId] ?? options?.defaultValue,
    [store.values, selectId, options?.defaultValue],
  )
  const multiValues = useMemo(
    () => store.multiValues[selectId] ?? new Set(options?.defaultValues || []),
    [store.multiValues, selectId, options?.defaultValues],
  )

  const openSelect = useCallback(() => store.openSelect(selectId), [store, selectId])
  const closeSelect = useCallback(() => store.closeSelect(selectId), [store, selectId])
  const setValue = useCallback((value: T) => store.setValue(selectId, value), [store, selectId])
  const toggleMultiValue = useCallback((value: T) => store.toggleMultiValue(selectId, value), [store, selectId])
  const clearMultiValues = useCallback(() => store.clearMultiValues(selectId), [store, selectId])
  const selectAllMultiValues = useCallback(
    (values: T[]) => store.selectAllMultiValues(selectId, values),
    [store, selectId],
  )

  const isSelected = useCallback(
    (checkValue: T) => {
      if (options?.multiple) {
        return multiValues.has(checkValue)
      }
      return value === checkValue
    },
    [value, multiValues, options?.multiple],
  )

  return {
    isOpen,
    openSelect,
    closeSelect,
    value,
    setValue,
    multiValues,
    toggleMultiValue,
    clearMultiValues,
    selectAllMultiValues,
    isSelected,
  }
}