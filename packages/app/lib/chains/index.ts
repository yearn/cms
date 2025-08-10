import { arbitrum, base, type Chain, fantom, gnosis, mainnet, optimism, polygon, sonic } from 'viem/chains'
import katana from './katana'

export const chains: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [optimism.id]: optimism,
  [gnosis.id]: gnosis,
  [polygon.id]: polygon,
  [sonic.id]: sonic,
  [fantom.id]: fantom,
  [base.id]: base,
  [arbitrum.id]: arbitrum,
  [katana.id]: katana
}
