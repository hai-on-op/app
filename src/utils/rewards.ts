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
        SNX: {
            OP: 0,
            KITE: 0,
        },
        RETH: {
            OP: 0,
            KITE: 0,
        },
        APXETH: {
            OP: 0,
            KITE: 0,
        },
        // Testnet
        WBTC: {
            OP: 0,
            KITE: 0,
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
        // sAMMV2-HAI/sUSD
        ['0xbdED651C03E2bC332AA49C1ffCa391eAA3ea6B86'.toLowerCase()]: {
            OP: 100,
            KITE: 30,
        },
        // vAMMV2-OP/KITE
        ['0xf4638dC488F9C826DC40250515592E678E447238'.toLowerCase()]: {
            OP: 0,
            KITE: 50,
        },
        // sAMMV2-HAI/LUSD
        ['0x588f26d5BefE74dC61694a7B36227C0e0C52C0f9'.toLowerCase()]: {
            OP: 0,
            KITE: 0,
        },
        // CL50-HAI/LUSD
        ['0xA61FBA486e2d04C4D865183A47fc1C9F6F4Cec1f'.toLowerCase()]: {
            OP: 0,
            KITE: 0,
        },
        // vAMMV2-HAI/KITE
        ['0xf2d3941b6E1cbD3616061E556Eb06986147715d1'.toLowerCase()]: {
            OP: 0,
            KITE: 0,
        },
        // vAMMV2-SAIL/KITE
        ['0xB5cD4bD4bdB5C97020FBE192258e6F08333990E2'.toLowerCase()]: {
            OP: 0,
            KITE: 0,
        },
    },
    default: {
        OP: 0,
        KITE: 0,
    },
}

export const VELO_SUGAR_ADDRESS = '0xF6F6955756Db870258C31B49cB51860b77b53194'

export const KITE_ADDRESS = '0xf467C7d5a4A9C4687fFc7986aC6aD5A4c81E1404'
export const HAI_ADDRESS = '0x10398AbC267496E49106B07dd6BE13364D10dC71'

export const HAI_KITE_SYMBOL = 'vAMMV2-HAI/KITE'

export const CL50_HAI_LUSD_SYMBOL = '0xA61FBA486e2d04C4D865183A47fc1C9F6F4Cec1f'
export const CL50_HAI_LUSD_ADDRESS = '0xA61FBA486e2d04C4D865183A47fc1C9F6F4Cec1f'

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
