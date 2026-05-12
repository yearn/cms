import { getCollection } from '../../schemas/cms'
import { HoverSelect } from './eg/HoverSelect'

const collectionConfig = getCollection('vaults')
const selectId = 'collection-filters-vaults'

export default function VaultBooleanFilters() {
  const options = (collectionConfig.filterableBooleanFields ?? []).map((field) => ({
    value: field,
    label: field,
  }))

  return (
    <div className="mb-6 flex items-center gap-4">
      <div className="text-sm uppercase tracking-wide opacity-60">Filters</div>
      <HoverSelect
        selectId={selectId}
        options={options}
        multiple
        placeholder="Select vault flags..."
        triggerClassName="w-96 justify-start"
      />
    </div>
  )
}
