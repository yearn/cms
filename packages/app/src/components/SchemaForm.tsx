import type React from 'react'
import type { ReactNode } from 'react'
import { createContext, useContext, useState } from 'react'
import z from 'zod'
import { cn } from '../../lib/cn'
import Input from './eg/elements/Input'
import Switch from './eg/elements/Switch'
import Textarea from './eg/elements/Textarea'
import { HoverSelect } from './eg/HoverSelect'
import Tags from './elements/Tags'

const TEXTAREA_FIELDS = ['description', 'uiNotice']

type JSONSchema = any

type MetaDataContextType = {
  formState: Record<string, any>
  updateField: (path: string[], value: any) => void
  o: Record<string, any>
  schema: z.ZodType
  isDirty: boolean
}

const MetaDataContext = createContext<MetaDataContextType | null>(null)

export function useMetaData() {
  const context = useContext(MetaDataContext)
  if (!context) {
    throw new Error('useMetaData must be used within a MetaDataProvider')
  }
  return context
}

type MetaDataProviderProps = {
  schema: z.ZodType
  o: Record<string, any>
  children: ReactNode
}

export function MetaDataProvider({ schema, o, children }: MetaDataProviderProps) {
  const [formState, setFormState] = useState(o)

  const updateField = (path: string[], value: any) => {
    setFormState((prev) => {
      const newState = { ...prev }
      let curr = newState
      path.slice(0, -1).forEach((key) => {
        curr[key] = { ...curr[key] }
        curr = curr[key]
      })
      curr[path[path.length - 1]] = value
      return newState
    })
  }

  const isDirty = JSON.stringify(formState) !== JSON.stringify(o)

  const value = {
    formState,
    updateField,
    o,
    schema,
    isDirty,
  }

  return <MetaDataContext.Provider value={value}>{children}</MetaDataContext.Provider>
}

const renderField = (
  key: string,
  schema: JSONSchema,
  value: any,
  update: (path: string[], value: any) => void,
  path: string[] = [],
) => {
  const fieldPath = [...path, key]
  const commonProps = {
    name: key,
    value: value || '',
    onChange: (e: React.ChangeEvent<any>) => {
      const val = schema.type === 'boolean' ? e.target.checked : e.target.value
      update(fieldPath, schema.type === 'number' ? parseFloat(val) : val)
    },
  }

  switch (schema.type) {
    case 'number':
      return <Input type="number" {...commonProps} />
    case 'string':
      if (schema.enum) {
        const options = schema.enum.map((e: string) => ({
          value: e,
          label: e,
        }))
        return (
          <HoverSelect
            selectId={`${key}-select`}
            options={options}
            defaultValue={value}
            onChange={(val) => update(fieldPath, val)}
            triggerClassName="w-96"
            placeholder="Select an option..."
          />
        )
      }
      if (TEXTAREA_FIELDS.includes(key)) {
        return <Textarea {...commonProps} className="w-128 h-24 p-3 border rounded" />
      }
      return <Input type="text" {...commonProps} className="w-128" autoComplete="off" />
    case 'boolean':
      return <Switch checked={value || false} onChange={(checked) => update(fieldPath, checked)} />
    case 'object':
      return (
        <fieldset className="flex flex-col gap-8">
          {Object.entries(schema.properties || {}).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-6">
              <label htmlFor={k} className="w-42 text-right text-sm">
                {k}
              </label>
              {renderField(k, v, value?.[k], update, fieldPath)}
            </div>
          ))}
        </fieldset>
      )
    case 'array': {
      // Convert array items to tag format for react-tag-autocomplete
      const selected = (value || []).map((item: any) => ({
        value: String(item || ''),
        label: String(item || ''),
      }))

      const suggestions =
        schema.items?.enum?.map((item: string) => ({
          value: item,
          label: item,
        })) || []

      return (
        <div className="w-128">
          <Tags
            selected={selected}
            suggestions={suggestions}
            onAdd={(tag) => {
              if (value.includes(tag.label)) {
                return
              }
              const newValue = [...(value || []), tag.label]
              update(fieldPath, newValue)
            }}
            onDelete={(tagIndex) => {
              const tag = value[tagIndex]
              const newValue = (value || []).filter((t: string) => t !== tag)
              update(fieldPath, newValue)
            }}
            allowNew={!schema.items?.enum}
            placeholderText={`${key}..`}
          />
        </div>
      )
    }
    default:
      return null
  }
}

type MetaDataProps = {
  className?: string
}

export default function MetaData({ className }: MetaDataProps) {
  const { formState, updateField, schema } = useMetaData()
  const jsonSchema = z.toJSONSchema(schema)
  const readonlyFields = ['chainId', 'address', 'name', 'registry']
  return (
    <form className={cn('flex flex-col gap-3', className)}>
      {Object.entries(jsonSchema.properties || {})
        .filter(([key]) => !readonlyFields.includes(key))
        .map(([key, schema]) => (
          <div key={key} className="py-3 flex items-center justify-between">
            <label htmlFor={key}>{key}</label>
            {renderField(key, schema, formState[key], updateField)}
          </div>
        ))}
    </form>
  )
}
