import * as _Switch from '@radix-ui/react-switch'
import { cn } from '../../../lib/cn'

const Switch = ({ label, checked, onChange, className }: { label?: string, checked?: boolean, onChange?: (checked: boolean) => void, className?: string }) => (
  <div className={cn('h-[60px] flex items-center', className)}>
    <label className="pr-4 text-xl select-none" htmlFor={label}>{label}</label>
    <_Switch.Root id={label} className={`
      relative w-16 h-8 bg-primary-900 
      data-[state=checked]:bg-primary-300 
      rounded-primary`} checked={checked} onCheckedChange={onChange}>
      <_Switch.Thumb className={`
        block w-8 h-8 bg-primary-50 rounded-primary cursor-pointer
        data-[state=checked]:translate-x-8 transition-transform duration-100`} />
    </_Switch.Root>
  </div>
)

export default Switch
