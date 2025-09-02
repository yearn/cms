import { useNavigate } from 'react-router-dom'
import { getCollection, getCollectionKeys } from '../../schemas/cms'
import Button from './elements/Button'
import GithubSignIn from './GithubSignIn'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  const navigate = useNavigate()

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
        {getCollectionKeys().map((key) => (
          <Button key={key} variant="secondary" onClick={() => navigate(`/${key}`)}>
            {getCollection(key).displayName.toLowerCase()}
          </Button>
        ))}
        <Button variant="secondary" onClick={() => navigate('/globals/yearnFi')}>
          YearnFi
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <GithubSignIn />
      </div>
    </header>
  )
}
