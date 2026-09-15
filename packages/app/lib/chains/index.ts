import { arbitrum, base, type Chain, fantom, gnosis, mainnet, optimism, polygon, sonic, robinhood, katana } from 'viem/chains'

export const chains: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [optimism.id]: optimism,
  [gnosis.id]: gnosis,
  [polygon.id]: polygon,
  [sonic.id]: sonic,
  [fantom.id]: fantom,
  [base.id]: base,
  [arbitrum.id]: arbitrum,
  [katana.id]: katana,
  [robinhood.id]: robinhood,
}
