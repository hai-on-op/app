export const REWARDS = {
    vaults: {
        WETH: {
            OP: 25,
            KITE: 20,
        },
        WSTETH: {
            OP: 25,
            KITE: 20,
        },
        OP: {
            OP: 50,
            KITE: 20,
        },
        // Testnet
        WBTC: {
            OP: 10,
            KITE: 10,
        },
        STN: {
            OP: 20,
            KITE: 20,
        },
        TTM: {
            OP: 30,
            KITE: 30,
        },
    },
    uniswap: {
        ['0x146b020399769339509c98b7b353d19130c150ec'.toLowerCase()]: {
            OP: 200,
            KITE: 30,
        },
    },
    velodrome: {
        ['0xbdED651C03E2bC332AA49C1ffCa391eAA3ea6B86'.toLowerCase()]: {
            OP: 100,
            KITE: 30,
        },
        ['0xf4638dC488F9C826DC40250515592E678E447238'.toLowerCase()]: {
            OP: 0,
            KITE: 50,
        },
    },
    default: {
        OP: 0,
        KITE: 0,
    },
}

// const veloPools = [
// 	{
// 			pair: ['HAI', 'SUSD'] as any,
// 			rewards: {
// 					OP: 100,
// 					KITE: 30,
// 			},
// 			earnLink:
// 					'https://velodrome.finance/deposit?token0=0x10398AbC267496E49106B07dd6BE13364D10dC71&token1=0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9&type=0',
// 	},
// 	{
// 			pair: ['KITE', 'OP'] as any,
// 			rewards: {
// 					OP: 0,
// 					KITE: 50,
// 			},
// 			earnLink:
// 					'https://velodrome.finance/deposit?token0=0x4200000000000000000000000000000000000042&token1=0xf467C7d5a4A9C4687fFc7986aC6aD5A4c81E1404&type=-1',
// 	},
// ]
