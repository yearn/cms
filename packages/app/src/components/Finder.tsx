import { create } from 'zustand'
import Input from './elements/Input'

export const useFinder = create<{
  finderString: string
  setFinderString: (text: string) => void
}>((set) => ({
  finderString: '',
  setFinderString: (text: string) => set({ finderString: text }),
}))

export default function Finder({ className }: { className?: string }) {
  const { finderString, setFinderString } = useFinder()

  return (
    <div className={className}>
      <Input
        type="text"
        placeholder="Search by name or address"
        value={finderString}
        onChange={(e) => setFinderString(e.target.value)}
        className="w-full"
      />
    </div>
  )
}
