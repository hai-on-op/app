export const REWARDS = {
    vaults: {
        WETH: {
            KITE: 0,
            OP: 0,
        },
        WSTETH: {
            KITE: 0,
            OP: 0,
        },
        APXETH: {
            KITE: 0,
            OP: 0,
        },
        ALETH: {
            KITE: 50,
            OP: 0,
        },
        'YV-VELO-ALETH-WETH': {
            KITE: 25,
            OP: 0,
        },
        'YV-VELO-MSETH-WETH': {
            KITE: 50,
            OP: 0,
        },
        MSETH: {
            KITE: 25,
            OP: 0,
        },

        RETH: {
            KITE: 0,
            OP: 0,
        },
        OP: {
            KITE: 0,
            OP: 0,
        },
        TBTC: {
            KITE: 0,
            OP: 0,
        },
        SNX: {
            KITE: 0,
            OP: 0,
        },
        HAIVELO: {
            KITE: 0,
            OP: 0,
        },
        HAIVELOV2: {
            KITE: 50,
            OP: 0,
        },
        // Testnet
        WBTC: {
            KITE: 0,
            OP: 0,
        },
        STN: {
            KITE: 0,
            OP: 0,
        },
        TTM: {
            KITE: 0,
            OP: 0,
        },
    },
    uniswap: {
        ['0x146b020399769339509c98b7b353d19130c150ec'.toLowerCase()]: {
            KITE: 0,
            OP: 100,
        },
    },
    velodrome: {
        // vAMMV2-KITE/HAI
        ['0xf2d3941b6E1cbD3616061E556Eb06986147715d1'.toLowerCase()]: {
            KITE: 0,
            OP: 0,
        },
        // vAMMV2-ALETH/HAI
        ['0x056B153132F105356d95CcF34a0065A28617DaC4'.toLowerCase()]: {
            KITE: 0,
            OP: 0,
        },
        // vAMMV2-ALUSD/HAI
        ['0x2408DC2B6CAD3af2Bd65474F0167a107b8b0Be0b'.toLowerCase()]: {
            KITE: 0,
            OP: 0,
        },
    },
    default: {
        OP: 0,
        KITE: 0,
    },
}

// export const VELO_SUGAR_ADDRESS = '0xC8229d65581afE8f04344A6706FF45faECC426f9'
export const VELO_SUGAR_ADDRESS = '0x3b919747b46b13cffd9f16629cff951c0b7ea1e2'

export const KITE_ADDRESS = '0xf467C7d5a4A9C4687fFc7986aC6aD5A4c81E1404'
export const HAI_ADDRESS = '0x10398AbC267496E49106B07dd6BE13364D10dC71'

export const HAI_KITE_SYMBOL = 'vAMMV2-HAI/KITE'

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
