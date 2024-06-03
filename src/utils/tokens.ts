import ethImg from '~/assets/eth-img.svg'
import haiImg from '~/assets/hai-logo.svg'
import kiteImg from '~/assets/kite-img.svg'
import opImg from '~/assets/op-img.svg'
import snxImg from '~/assets/snx-img.png'
import stnImg from '~/assets/stn-img.png'
import susdImg from '~/assets/susd-img.svg'
import ttmImg from '~/assets/ttm-img.png'
import velodromeImg from '~/assets/velodrome-img.svg'
import wbtcImg from '~/assets/wbtc-img.svg'
import wethImg from '~/assets/weth-img.svg'
import wstethImg from '~/assets/wsteth-img.svg'
import lusdImg from '~/assets/lusd-img.svg'
import rethImg from '~/assets/reth-img.png'
import linkImg from '~/assets/link-img.png'
import ldoImg from '~/assets/ldo-img.png'
import uniImg from '~/assets/uniswap-icon.svg'
import frxethImg from '~/assets/frxeth-img.svg'
import sfrxethImg from '~/assets/sfrxeth-img.svg'
import pendleImg from '~/assets/pendle-img.png'

export type Tokens = {
    [key: string]: {
        name: string
        icon: string
        gebName: string
        balance: string
        address: string
    }
}

export const TOKEN_LOGOS = {
    ETH: ethImg,
    HAI: haiImg,
    KITE: kiteImg,
    OP: opImg,
    SNX: snxImg,
    STN: stnImg,
    SUSD: susdImg,
    TTM: ttmImg,
    VELO: velodromeImg,
    WBTC: wbtcImg,
    WETH: wethImg,
    WSTETH: wstethImg,
    LUSD: lusdImg,
    RETH: rethImg,
    LINK: linkImg,
    LDO: ldoImg,
    UNI: uniImg,
    FRXETH: frxethImg,
    SFRXETH: sfrxethImg,
    PENDLE: pendleImg,
}

export const tokenMap: Record<string, string> = {
    PROTOCOL_TOKEN: 'KITE',
    COIN: 'HAI',
    PROTOCOL_TOKEN_LP: 'KITE/ETH LP',
}

export type Token = {
    symbol: string
    name: string
    icon: string
}
export const tokenAssets: Record<string, Token> = {
    ETH: {
        symbol: 'ETH',
        name: 'Ethereum',
        icon: ethImg,
    },
    HAI: {
        symbol: 'HAI',
        name: 'Hai',
        icon: haiImg,
    },
    KITE: {
        symbol: 'KITE',
        name: 'Kite',
        icon: kiteImg,
    },
    OP: {
        symbol: 'OP',
        name: 'Optimism Token',
        icon: opImg,
    },
    SNX: {
        symbol: 'SNX',
        name: 'SNX',
        icon: snxImg,
    },
    STN: {
        symbol: 'STN',
        name: 'STONES',
        icon: stnImg,
    },
    SUSD: {
        symbol: 'SUSD',
        name: 'sUSD',
        icon: susdImg,
    },
    TTM: {
        symbol: 'TTM',
        name: 'TOTEM',
        icon: ttmImg,
    },
    VELO: {
        symbol: 'VELO',
        name: 'VELO',
        icon: velodromeImg,
    },
    WBTC: {
        symbol: 'WBTC',
        name: 'Wrapped Bitcoin',
        icon: wbtcImg,
    },
    WETH: {
        symbol: 'WETH',
        name: 'Wrapped Ethereum',
        icon: wethImg,
    },
    WSTETH: {
        symbol: 'WSTETH',
        name: 'Wrapped Staked Ethereum',
        icon: wstethImg,
    },
    RETH: {
        symbol: 'RTETH',
        name: 'Rocket Pool ETH',
        icon: rethImg,
    },
    LINK: {
        symbol: 'LINK',
        name: 'Chainlink',
        icon: linkImg,
    },
    LDO: {
        symbol: 'LDO',
        name: 'Lido DAO',
        icon: ldoImg,
    },
    UNI: {
        symbol: 'UNI',
        name: 'Uniswap',
        icon: uniImg,
    },
    FRXETH: {
        symbol: 'FRXETH',
        name: 'Frax Ether',
        icon: frxethImg,
    },
    SFRXETH: {
        symbol: 'SFRXETH',
        name: 'Frax Staked Ether',
        icon: sfrxethImg,
    },
    PENDLE: {
        symbol: 'PENDLE',
        name: 'Pendle',
        icon: pendleImg,
    },
}

type TokenDetails = {
    type: 'ERC20' | 'ERC721'
    options: {
        address: string
        symbol: string
        decimals: number
        image?: string
    }
}
export const addTokensToMetamask = (tokens: TokenDetails | TokenDetails[]) => {
    tokens = Array.isArray(tokens) ? tokens : [tokens]
    const provider = window.ethereum as any
    if (!provider?.request) throw new Error(`No injected provider found`)
    return Promise.all(
        tokens.map((params) =>
            provider.request({
                method: 'wallet_watchAsset',
                params,
            })
        )
    ).then((successes: boolean[]) => successes.every((isSuccess) => isSuccess))
}
