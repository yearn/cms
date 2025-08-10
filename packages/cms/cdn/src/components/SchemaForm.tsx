import type React from 'react'
import type { ReactNode } from 'react'
import { createContext, useContext, useState } from 'react'
import z from 'zod'
import { cn } from '../lib/cn'
import Input from './elements/Input'
import Switch from './elements/Switch'
import Textarea from './elements/Textarea'

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
    setFormState(prev => {
      const newState = { ...prev }
      let curr = newState
      path.slice(0, -1).forEach(key => {
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
    isDirty
  }

  return (
    <MetaDataContext.Provider value={value}>
      {children}
    </MetaDataContext.Provider>
  )
}

const renderField = (
  key: string,
  schema: JSONSchema,
  value: any,
  update: (path: string[], value: any) => void,
  path: string[] = []
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
        return (
          <select {...commonProps} className="w-128 h-12 text-primary-600">
            {schema.enum.map((e: string) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        )
      }
      if (TEXTAREA_FIELDS.includes(key)) {
        return <Textarea {...commonProps} className="w-128 h-24 p-3 border rounded" />
      }
      return <Input type="text" {...commonProps} className="w-128" autoComplete="off" />
    case 'boolean':
      return (
        <Switch
          checked={value || false}
          onChange={(checked) => update(fieldPath, checked)}
        />
      )
    case 'object':
      return (
        <fieldset className="flex flex-col gap-3">
          {Object.entries(schema.properties || {}).map(([k, v]) =>
            <div key={k} className="flex items-center justify-between gap-6">
              <label htmlFor={k} className="w-42 text-right text-sm">{k}</label>
              {renderField(k, v, value?.[k], update, fieldPath)}
            </div>
          )}
        </fieldset>
      )
    case 'array':
      return (
        <fieldset>
          <legend>{key}</legend>
          {(value || []).map((item: any, idx: number) =>
            <div key={key}>
              {renderField(`${idx}`, schema.items, item, update, fieldPath)}
            </div>
          )}
          <button
            type="button"
            onClick={() => update(fieldPath, [...(value || []), null])}
          >
            Add
          </button>
        </fieldset>
      )
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
    <form className={cn('flex flex-col gap-6', className)}>
      {Object.entries(jsonSchema.properties || {}).filter(([key]) => !readonlyFields.includes(key)).map(([key, schema]) =>
        <div key={key} className="py-3 flex items-center justify-between border-b border-primary-950">
          <label htmlFor={key}>{key}</label>
          {renderField(key, schema, formState[key], updateField)}
        </div>
      )}
    </form>
  )
}
