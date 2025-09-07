import { useMemo } from 'react'
import { PiDatabase, PiGlobe } from 'react-icons/pi'
import { useLocation, useNavigate } from 'react-router-dom'
import { getCollection, getCollectionKeys } from '../../schemas/cms'
import { ChainSelect } from './eg/ChainSelect'
import Button from './eg/elements/Button'
import { HoverSelect } from './eg/HoverSelect'
import ThemeToggle from './eg/ThemeToggle'
import { Yearn } from './eg/Yearn'
import Finder from './Finder'
import GithubSignIn from './GithubSignIn'

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()

  const navigationOptions = useMemo(() => {
    const collections = getCollectionKeys().map((key) => ({
      value: `/${key}`,
      label: getCollection(key).displayName,
      icon: <PiDatabase />,
    }))
    
    return [
      ...collections,
      {
        value: '/globals/yearnFi',
        label: 'YearnFi',
        icon: <PiGlobe />,
      },
    ]
  }, [])

  const currentOption = useMemo(() => {
    return navigationOptions.find(option => location.pathname.startsWith(option.value))?.value
  }, [navigationOptions, location.pathname])

  // Check if current route should show chain filtering
  const shouldShowChainSelect = useMemo(() => {
    return location.pathname.includes('/vaults') || 
           location.pathname.includes('/strategies') || 
           location.pathname.includes('/tokens')
  }, [location.pathname])

  // Check if current route should show finder
  const shouldShowFinder = useMemo(() => {
    return location.pathname.includes('/vaults') || 
           location.pathname.includes('/strategies') || 
           location.pathname.includes('/tokens')
  }, [location.pathname])

  return (
    <header className="px-8 w-full min-h-20 sticky top-0 z-10 flex items-center gap-8 justify-between border-b border-interactive-secondary-border backdrop-blur-lg">
      <div className="flex items-center gap-8 grow">
        <Button
          variant="primary"
          onClick={() => navigate('/')}
          className="!p-0 !h-auto !rounded-full !border-none"
          aria-label="Navigate to home"
        >
          <Yearn back="text-transparent" front="text-primary-50" size={52} />
        </Button>
        
        <HoverSelect
          selectId="navigation"
          options={navigationOptions}
          placeholder="Navigate to..."
          defaultValue={currentOption}
          onChange={(value) => value && navigate(value as string)}
          triggerClassName="w-58"
        />
        
        {shouldShowChainSelect && <ChainSelect />}
        
        {shouldShowFinder && (
          <div className="flex-1">
            <Finder />
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <GithubSignIn />
      </div>
    </header>
  )
}
