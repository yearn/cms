import z from 'zod'

const evmAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/)

export const StrategyMetadataSchema = z.object({
  chainId: z.number(),
  address: evmAddress,
  name: z.string(),
  isRetired: z.boolean().optional(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  protocols: z.array(z.enum([
    '0xDAO', '88 MPH', 'Aave', 'Alpha Homora', 'Angle', 'Arrakis Finance', 'Aura Finance', 'Balancer',
    'Beethoven-X', 'Blockchain Adventurers Guild', 'C.R.E.A.M. Finance', 'Compound Finance',
    'Convex Finance', 'Cream Finance', 'Curve Finance', 'Fiat DAO', 'Flux Finance', 'Frax Finance',
    'Geist Finance', 'Goldfinch Finance', 'Hegic', 'Hop Exchange', 'Idle Finance', 'Inverse Finance',
    'Iron Bank', 'KeeperDAO', 'LIDO', 'League DAO', 'Lido Finance', 'MakerDAO', 'Mushroom Finance',
    'Notional Finance', 'Pool Together', 'Scream', 'Solidex Finance', 'Sonne Finance', 'SpiritSwap',
    'SpookySwap', 'Stargate Finance', 'Sturdy Finance', 'Sushi', 'Synthetix', 'Tokemak', 'Uniswap',
    'Universe', 'Velodrome Finance', 'Vesper Finance', 'Yearn', 'dYdX', 'stMATIC', 'veDAO'
  ])).nullish()
})

export type StrategyMetadata = z.infer<typeof StrategyMetadataSchema>
