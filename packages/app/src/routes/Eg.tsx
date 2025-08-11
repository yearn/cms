import Button from '../components/elements/Button'
import Input from '../components/elements/Input'
import Switch from '../components/elements/Switch'
import Skeleton from '../components/Skeleton'
import ToggleChains from '../components/ToggleChains'

export default function Eg() {
  return <div className="p-6 flex flex-col gap-12">
    <div className="flex items-center gap-3">
      <div className="w-32">{'primary'}</div>
      <div className="flex items-center gap-0">
        <div className="w-16 h-8 bg-primary-50"></div>
        <div className="w-16 h-8 bg-primary-100"></div>
        <div className="w-16 h-8 bg-primary-200"></div>
        <div className="w-16 h-8 bg-primary-300"></div>
        <div className="w-16 h-8 bg-primary-400"></div>
        <div className="w-16 h-8 bg-primary-500"></div>
        <div className="w-16 h-8 bg-primary-600"></div>
        <div className="w-16 h-8 bg-primary-700"></div>
        <div className="w-16 h-8 bg-primary-800"></div>
        <div className="w-16 h-8 bg-primary-900"></div>
        <div className="w-16 h-8 bg-primary-950"></div>
      </div>
    </div>

    <div className="flex items-center gap-3">
      <div className="w-32">{'secondary'}</div>
      <div className="flex items-center gap-0">
        <div className="w-16 h-8 bg-secondary-50"></div>
        <div className="w-16 h-8 bg-secondary-100"></div>
        <div className="w-16 h-8 bg-secondary-200"></div>
        <div className="w-16 h-8 bg-secondary-300"></div>
        <div className="w-16 h-8 bg-secondary-400"></div>
        <div className="w-16 h-8 bg-secondary-500"></div>
        <div className="w-16 h-8 bg-secondary-600"></div>
        <div className="w-16 h-8 bg-secondary-700"></div>
        <div className="w-16 h-8 bg-secondary-800"></div>
        <div className="w-16 h-8 bg-secondary-900"></div>
        <div className="w-16 h-8 bg-secondary-950"></div>
      </div>
    </div>

    <div className="flex items-center gap-3">
      <div>{'<Input>'}</div>
      <div className="grid grid-cols-2 gap-6">
        <Input placeholder="Default" />
        <Input placeholder="Disabled" disabled />
        <Input theme="warn" placeholder="Warn" />
        <Input theme="error" placeholder="Error" />
      </div>
    </div>

    <div className="flex items-center gap-6">
      <div>{'<Button>'}</div>
      <Button>Primary</Button>
      <Button h="secondary">Secondary</Button>
      <Button disabled>Disabled</Button>
      <Button theme="error">Error</Button>
    </div>

    <div className="flex items-center gap-6 w-200">
      <div>{'<Skeleton>'}</div>
      <Skeleton className="grow h-10"></Skeleton>
      <Skeleton className="grow h-10"></Skeleton>
      <Skeleton className="grow h-10"></Skeleton>
    </div>

    <div className="flex items-center gap-3">
      <div>{'<Switch>'}</div>
      <Switch />
    </div>

    <div className="flex items-center gap-3">
      <div>{'<ToggleChains>'}</div>
      <ToggleChains />
    </div>
  </div>
}