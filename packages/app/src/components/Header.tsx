import { PiCaretDownBold } from 'react-icons/pi'
import { useNavigate } from 'react-router-dom'
import { getCollection, getCollectionKeys } from '../../schemas/cms'
import GithubSignIn from './GithubSignIn'
import { HoverSelect, type SelectOption } from './HoverSelect'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  const navigate = useNavigate()

  // Create collection options
  const collectionOptions: SelectOption<string>[] = getCollectionKeys().map((key) => ({
    value: key,
    label: getCollection(key).displayName,
  }))

  // Create globals options
  const globalOptions: SelectOption<string>[] = [{ value: 'globals/yearnFi', label: 'YearnFi' }]

  // Combine all options
  const allOptions = [...collectionOptions, ...globalOptions]

  return (
    <header className="px-8 w-full sticky top-0 z-10 flex items-center justify-between border-b border-secondary-800 backdrop-blur-lg bg-black/20">
      <div className="flex items-center gap-8">
        <h1
          onClick={() => navigate('/')}
          onKeyDown={() => navigate('/')}
          className="my-6 text-5xl font-bold cursor-pointer"
        >
          yCMS
        </h1>

        <HoverSelect
          selectId="navigation"
          options={allOptions}
          defaultValue="vaults"
          className="w-64"
          onChange={(value) => {
            if (value) navigate(`/${value}`)
          }}
          renderTrigger={({ value, options }) => {
            // Don't allow clearing selection, always show current selection
            const currentOption =
              options.find((opt) => opt.value === value) || options.find((opt) => opt.value === 'vaults')
            return (
              <div className="relative h-8 px-8 py-5 flex items-center gap-2 bg-interactive-secondary text-interactive-secondary-text text-2xl rounded-primary cursor-pointer border border-interactive-secondary-border group-hover:bg-interactive-secondary-hover active:bg-interactive-secondary-active">
                <span className="flex-1 flex items-center gap-2">
                  {currentOption?.icon}
                  {currentOption?.label}
                </span>
                <PiCaretDownBold className="ml-2 opacity-40" size={16} />
              </div>
            )
          }}
        />
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <GithubSignIn />
      </div>
    </header>
  )
}
