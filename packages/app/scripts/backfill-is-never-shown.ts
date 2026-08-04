const checkOnly = process.argv.includes('--check')
const vaultsDirectory = new URL('../../cdn/vaults/', import.meta.url).pathname
const vaultFiles = Array.fromAsync(
  new Bun.Glob('*.json').scan({
    cwd: vaultsDirectory,
    absolute: true,
  }),
)

let vaultCount = 0
let hiddenCount = 0

for (const filePath of (await vaultFiles).sort()) {
  const vaults = (await Bun.file(filePath).json()) as Record<string, unknown>[]

  const updatedVaults = vaults.map((vault, index) => {
    if (typeof vault.isHidden !== 'boolean') {
      throw new Error(`${filePath}: vault ${index} has no boolean isHidden value`)
    }

    if (checkOnly) {
      if (vault.isNeverShown !== vault.isHidden) {
        throw new Error(`${filePath}: vault ${index} has mismatched visibility values`)
      }

      return vault
    }

    if ('isNeverShown' in vault) {
      throw new Error(`${filePath}: vault ${index} already has an isNeverShown value`)
    }

    const entries = Object.entries(vault)
    const isHiddenIndex = entries.findIndex(([key]) => key === 'isHidden')
    entries.splice(isHiddenIndex + 1, 0, ['isNeverShown', vault.isHidden])

    return Object.fromEntries(entries)
  })

  vaultCount += updatedVaults.length
  hiddenCount += updatedVaults.filter((vault) => vault.isNeverShown === true).length

  if (!checkOnly) {
    await Bun.write(filePath, `${JSON.stringify(updatedVaults, null, 2)}\n`)
  }
}

const action = checkOnly ? 'Verified' : 'Backfilled'
console.log(`${action} ${vaultCount} vaults (${hiddenCount} never shown)`)
