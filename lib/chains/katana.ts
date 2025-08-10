import { defineChain } from 'viem/chains/utils'

const chain = /*#__PURE__*/ defineChain({
	id: 747474,
	name: 'Katana',
	nativeCurrency: {
		decimals: 18,
		name: 'Ether',
		symbol: 'ETH'
	},
	rpcUrls: {
		default: {http: ['https://rpc.katanarpc.com']}
	},
	blockExplorers: {
		default: {
			name: 'Katana Explorer',
			url: 'https://explorer.katanarpc.com'
		}
	},
	contracts: {
		multicall3: {
			address: '0xcA11bde05977b3631167028862bE2a173976CA11',
			blockCreated: 1898013
		}
	},
	testnet: false
})

export default chain
