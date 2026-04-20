import type React from 'react'
import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { z } from 'zod'
import { cn } from '../../lib/cn'
import Input from './eg/elements/Input'
import Switch from './eg/elements/Switch'
import Textarea from './eg/elements/Textarea'
import { HoverSelect } from './eg/HoverSelect'
import Tags from './elements/Tags'

const TEXTAREA_FIELDS = ['description', 'uiNotice']
const READ_ONLY_FIELDS = ['chainId', 'address', 'name', 'registry']

type JSONSchema = any
type FieldPath = string[]
type FieldUpdater = (path: FieldPath, value: any) => void
type CommonFieldProps = {
  name: string
  value: string | number
  disabled: boolean
  onChange: (event: React.ChangeEvent<any>) => void
}

type MetaDataContextType = {
  formState: Record<string, any>
  updateField: FieldUpdater
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
  initialState?: Record<string, any>
  children: ReactNode
}

function setNestedFieldValue(state: Record<string, any>, path: FieldPath, value: any) {
  const nextState = { ...state }
  let current = nextState

  for (const key of path.slice(0, -1)) {
    current[key] = { ...current[key] }
    current = current[key]
  }

  current[path[path.length - 1]] = value
  return nextState
}

export function MetaDataProvider({ schema, o, initialState, children }: MetaDataProviderProps) {
  const [formState, setFormState] = useState(initialState ?? o)

  useEffect(() => {
    setFormState(initialState ?? o)
  }, [initialState, o])

  const updateField: FieldUpdater = (path, value) => {
    setFormState((prev) => {
      return setNestedFieldValue(prev, path, value)
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

function getEnumOptions(values: string[]) {
  return values.map((value) => ({
    value,
    label: value,
  }))
}

function renderReadOnlyArray(value: string[]) {
  return (
    <div className="w-128 flex flex-wrap gap-2">
      {value.map((item) => (
        <div key={item} className="px-3 py-2 rounded-primary bg-primary-900 text-xs">
          {item}
        </div>
      ))}
    </div>
  )
}

function renderArrayField(
  key: string,
  schema: JSONSchema,
  value: any,
  update: FieldUpdater,
  fieldPath: FieldPath,
  readOnly: boolean,
) {
  if (readOnly) {
    return renderReadOnlyArray(value || [])
  }

  const selected = (value || []).map((item: any) => ({
    value: String(item || ''),
    label: String(item || ''),
  }))
  const suggestions = getEnumOptions(schema.items?.enum || [])

  return (
    <div className="w-128">
      <Tags
        selected={selected}
        suggestions={suggestions}
        onAdd={(tag) => {
          if (value.includes(tag.label)) {
            return
          }

          update(fieldPath, [...(value || []), tag.label])
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

function renderStringField(
  key: string,
  schema: JSONSchema,
  value: any,
  commonProps: CommonFieldProps,
  update: FieldUpdater,
  fieldPath: FieldPath,
  readOnly: boolean,
) {
  if (schema.enum) {
    if (readOnly) {
      return <Input type="text" value={value || ''} disabled readOnly className="w-96" />
    }

    return (
      <HoverSelect
        selectId={`${key}-select`}
        options={getEnumOptions(schema.enum)}
        defaultValue={value}
        onChange={(nextValue) => update(fieldPath, nextValue)}
        triggerClassName="w-96"
        placeholder="Select an option..."
      />
    )
  }

  if (TEXTAREA_FIELDS.includes(key)) {
    return <Textarea {...commonProps} readOnly={readOnly} className="w-128 h-24 p-3 border rounded" />
  }

  return <Input type="text" {...commonProps} className="w-128" autoComplete="off" readOnly={readOnly} />
}

function renderObjectField(
  schema: JSONSchema,
  value: any,
  update: FieldUpdater,
  fieldPath: FieldPath,
  readOnly: boolean,
) {
  return (
    <fieldset className="flex flex-col gap-8">
      {Object.entries(schema.properties || {}).map(([key, childSchema]) => (
        <div key={key} className="flex items-center justify-between gap-6">
          <label htmlFor={key} className="w-42 text-right text-sm">
            {key}
          </label>
          {renderField(key, childSchema, value?.[key], update, fieldPath, readOnly)}
        </div>
      ))}
    </fieldset>
  )
}

function renderField(
  key: string,
  schema: JSONSchema,
  value: any,
  update: FieldUpdater,
  path: FieldPath = [],
  readOnly = false,
) {
  const fieldPath = [...path, key]
  const commonProps = {
    name: key,
    value: value ?? '',
    disabled: readOnly,
    onChange: (e: React.ChangeEvent<any>) => {
      const val = schema.type === 'boolean' ? e.target.checked : e.target.value
      update(fieldPath, schema.type === 'number' ? parseFloat(val) : val)
    },
  }

  switch (schema.type) {
    case 'number':
      return <Input type="number" {...commonProps} readOnly={readOnly} />
    case 'string':
      return renderStringField(key, schema, value, commonProps, update, fieldPath, readOnly)
    case 'boolean':
      return <Switch checked={value || false} onChange={(checked) => update(fieldPath, checked)} disabled={readOnly} />
    case 'object':
      return renderObjectField(schema, value, update, fieldPath, readOnly)
    case 'array':
      return renderArrayField(key, schema, value, update, fieldPath, readOnly)
    default:
      return null
  }
}

type MetaDataProps = {
  className?: string
  readOnly?: boolean
}

export default function MetaData({ className, readOnly = false }: MetaDataProps) {
  const { formState, updateField, schema } = useMetaData()
  const jsonSchema = z.toJSONSchema(schema)

  return (
    <form className={cn('flex flex-col gap-3', className)}>
      {Object.entries(jsonSchema.properties || {})
        .filter(([key]) => !READ_ONLY_FIELDS.includes(key))
        .map(([key, schema]) => (
          <div key={key} className="py-3 flex items-center justify-between">
            <label htmlFor={key}>{key}</label>
            {renderField(key, schema, formState[key], updateField, [], readOnly)}
          </div>
        ))}
    </form>
  )
}
