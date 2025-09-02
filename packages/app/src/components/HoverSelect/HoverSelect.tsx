import { type ReactNode, useCallback, useMemo } from 'react'
import { PiCaretDownBold } from 'react-icons/pi'
import { cn } from '../../lib/cn'
import { HoverCard, HoverCardTrigger } from '../HoverCard'
import { useHoverCard } from '../HoverCard/useHoverCard'
import { type SelectOption, useHoverSelect } from './useHoverSelect'

interface HoverSelectProps<T = string> {
  selectId: string
  options: SelectOption<T>[]
  placeholder?: string
  className?: string
  triggerClassName?: string
  cardClassName?: string
  itemClassName?: string
  multiple?: boolean
  defaultValue?: T
  defaultValues?: T[]
  onChange?: (value: T | undefined | Set<T>) => void
  renderTrigger?: (props: {
    value: T | undefined
    values: Set<T>
    options: SelectOption<T>[]
    placeholder?: string
  }) => ReactNode
  renderOption?: (option: SelectOption<T>, isSelected: boolean) => ReactNode
  showSelectAll?: boolean
  selectAllLabel?: string
  clearAllLabel?: string
}

export function HoverSelectTrigger({
  className,
  children,
  onClick,
  showCaret = true,
}: {
  className?: string
  children: ReactNode
  onClick?: () => void
  showCaret?: boolean
}) {
  return (
    <HoverCardTrigger className={cn('whitespace-nowrap', className)} onClick={onClick}>
      <span className="flex-1 flex items-center gap-2">{children}</span>
      {showCaret && <PiCaretDownBold className="ml-2 opacity-40" size={16} />}
    </HoverCardTrigger>
  )
}

export function HoverSelect<T = string>({
  selectId,
  options,
  placeholder = 'Select...',
  className,
  triggerClassName,
  cardClassName,
  itemClassName,
  multiple = false,
  defaultValue,
  defaultValues,
  onChange,
  renderTrigger,
  renderOption,
  showSelectAll = false,
  selectAllLabel = 'Select all',
  clearAllLabel = 'Clear all',
}: HoverSelectProps<T>) {
  const { value, setValue, multiValues, toggleMultiValue, clearMultiValues, selectAllMultiValues, isSelected } =
    useHoverSelect<T | undefined>(selectId, { defaultValue, defaultValues, multiple })
  
  const { closeHoverCard } = useHoverCard(`hover-select-${selectId}`)

  const handleSelect = useCallback(
    (option: SelectOption<T>) => {
      if (option.disabled) return

      if (multiple) {
        toggleMultiValue(option.value)
        onChange?.(multiValues)
      } else {
        // Only allow clearing if no defaultValue is set
        if (value === option.value && defaultValue === undefined) {
          setValue(undefined)
          onChange?.(undefined)
        } else {
          setValue(option.value)
          onChange?.(option.value)
        }
        // Close the dropdown after selection for single select
        closeHoverCard()
      }
    },
    [multiple, setValue, toggleMultiValue, onChange, multiValues, value, defaultValue, closeHoverCard],
  )

  const handleSelectAll = useCallback(() => {
    const allValues = options.filter((o) => !o.disabled).map((o) => o.value)
    if (multiValues.size === allValues.length) {
      clearMultiValues()
      onChange?.(new Set())
    } else {
      selectAllMultiValues(allValues)
      onChange?.(new Set(allValues))
    }
  }, [options, multiValues, clearMultiValues, selectAllMultiValues, onChange])

  const selectedOptions = useMemo(() => {
    if (multiple) {
      return options.filter((o) => multiValues.has(o.value))
    }
    return options.filter((o) => o.value === value)
  }, [multiple, options, value, multiValues])

  const allSelected = useMemo(() => {
    if (!multiple) return false
    const selectableOptions = options.filter((o) => !o.disabled)
    return selectableOptions.length > 0 && selectableOptions.every((o) => multiValues.has(o.value))
  }, [multiple, options, multiValues])

  const defaultRenderTrigger = () => {
    if (multiple) {
      if (selectedOptions.length === 0) {
        return <span className="opacity-60">{placeholder}</span>
      }
      if (selectedOptions.length === 1) {
        return (
          <span className="flex items-center gap-4">
            {selectedOptions[0].icon}
            {selectedOptions[0].label}
          </span>
        )
      }
      return <span className="flex items-center">{selectedOptions.length} selected</span>
    }

    const selectedOption = selectedOptions[0]
    if (!selectedOption) {
      return <span className="opacity-60">{placeholder}</span>
    }
    return (
      <span className="flex items-center gap-4">
        {selectedOption.icon}
        {selectedOption.label}
      </span>
    )
  }

  return (
    <HoverCard
      hoverCardId={`hover-select-${selectId}`}
      trigger={
        renderTrigger ? (
          renderTrigger({ value, values: multiValues, options, placeholder })
        ) : (
          <HoverSelectTrigger
            className={triggerClassName}
            onClick={() => {
              if (multiple && showSelectAll) {
                handleSelectAll()
              } else if (!multiple && value !== undefined && defaultValue === undefined) {
                setValue(undefined)
                onChange?.(undefined)
              }
            }}
          >
            {defaultRenderTrigger()}
          </HoverSelectTrigger>
        )
      }
      className={cn('select-none', className)}
      cardClassName={cn('p-0 max-h-96 overflow-y-auto', cardClassName)}
    >
      <div>
        {multiple && showSelectAll && (
          <button
            onClick={handleSelectAll}
            className={cn(
              'w-full px-8 py-3 flex items-center',
              'hover:bg-interactive-secondary-hover transition-colors',
              'active:bg-interactive-secondary-active',
              'text-left text-xl cursor-pointer',
              'text-[var(--foreground)] border-b border-interactive-secondary-border',
            )}
          >
            <span className="flex-1">{allSelected ? clearAllLabel : selectAllLabel}</span>
            {allSelected && <div className="w-3 h-3 rounded-full bg-interactive-secondary-active" />}
          </button>
        )}

        {options.map((option) => {
          const selected = isSelected(option.value)

          if (renderOption) {
            return (
              <div key={String(option.value)} onClick={() => handleSelect(option)}>
                {renderOption(option, selected)}
              </div>
            )
          }

          return (
            <button
              key={String(option.value)}
              onClick={() => handleSelect(option)}
              disabled={option.disabled}
              className={cn(
                'w-full px-8 py-3 flex items-center',
                'hover:bg-interactive-secondary-hover transition-colors',
                'active:bg-interactive-secondary-active',
                'text-left text-xl cursor-pointer',
                'text-[var(--foreground)]',
                option.disabled && 'opacity-50 cursor-not-allowed',
                itemClassName,
              )}
            >
              <span className="flex-1 flex items-center gap-4">
                {option.icon}
                {option.label}
              </span>
              {selected && <div className="w-3 h-3 rounded-full bg-interactive-secondary-active" />}
            </button>
          )
        })}
      </div>
    </HoverCard>
  )
}
