import * as _Switch from '@radix-ui/react-switch'
import { cn } from '../cn'

const Switch = ({
  label,
  checked,
  onChange,
  className,
  disabled,
}: {
  label?: string
  checked?: boolean
  onChange?: (checked: boolean) => void
  className?: string
  disabled?: boolean
}) => (
  <div className={cn('flex items-center gap-3', className)}>
    {label && (
      <label
        data-disabled={disabled}
        className="select-none cursor-pointer data-[disabled=true]:cursor-default"
        htmlFor={label}
      >
        {label}
      </label>
    )}
    <_Switch.Root
      id={label}
      data-disabled={disabled}
      className={cn(
        'cursor-pointer relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200',
        'bg-secondary-300 data-[state=checked]:bg-primary-500',
        'dark:bg-secondary-700 dark:data-[state=checked]:bg-primary-600',
        'outline-none ring-2 ring-transparent focus-visible:ring-primary-400',
        'data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-default',
      )}
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
    >
      <_Switch.Thumb
        className={cn(
          'block h-5 w-5 rounded-full bg-white shadow-lg',
          'transition-transform duration-200',
          'translate-x-1 data-[state=checked]:translate-x-6',
          'dark:bg-secondary-100',
        )}
      />
    </_Switch.Root>
  </div>
)

export default Switch