import { useNavigate } from 'react-router-dom'
import Button from './elements/Button'
import GithubSignIn from './GithubSignIn'

export default function Header() {
  const navigate = useNavigate()

  return <header className="px-8 w-full sticky top-0 z-10 flex items-center justify-between border-b border-primary-800 backdrop-blur-lg bg-black/20">
    <div className="flex items-center gap-8">
      <h1 onClick={() => navigate('/')} onKeyDown={() => navigate('/')} className="my-6 text-5xl font-bold font-fancy text-primary-200 cursor-pointer">
        yCMS
      </h1>
      <Button onClick={() => navigate('/vaults')}>vaults</Button>
      <Button onClick={() => navigate('/strategies')}>strategies</Button>
    </div>
    <div>
      <GithubSignIn />
    </div>
  </header>
}
