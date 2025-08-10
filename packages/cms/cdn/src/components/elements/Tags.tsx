
import type { ReactTagsProps } from 'react-tag-autocomplete'
import { ReactTags } from 'react-tag-autocomplete'
import { cn } from '../../lib/cn'
import { InputClassName } from './Input'

type Props = Omit<ReactTagsProps, 'labelText' | 'classNames'>

export default function Tags(props: Props) {
  return <ReactTags
    {...props}
    labelText=''
    classNames={{
      root: 'relative w-full flex items-center gap-0',
      rootIsActive: '',
      rootIsDisabled: '',
      rootIsInvalid: '',
      label: 'hidden',
      tagList: 'flex items-center',
      tagListItem: '',
      tag: 'mr-3 px-3 py-2 bg-primary-900 rounded-primary cursor-pointer',
      tagName: 'text-xs whitespace-nowrap',
      comboBox: 'relative w-full h-full',
      input: cn(InputClassName, 'w-full!'),
      listBox: 'absolute z-10 mt-2 p-3 bg-black rounded-primary max-h-52 overflow-y-auto',
      option: 'w-full px-3 py-1 cursor-pointer hover:text-primary-900',
      optionIsActive: 'text-primary-900',
      highlight: '',
    }}
  />
}

