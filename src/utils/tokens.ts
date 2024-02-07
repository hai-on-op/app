import haiImg from '~/assets/hai-logo.svg'
import kiteImg from '~/assets/kite-img.svg'
import opImg from '~/assets/op-img.svg'
import snxImg from '~/assets/snx-img.png'
import stnImg from '~/assets/stn-img.png'
import ttmImg from '~/assets/ttm-img.png'
import wbtcImg from '~/assets/wbtc-img.svg'
import wethImg from '~/assets/eth-img.svg'
import wstethImg from '~/assets/wsteth-img.png'

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
    HAI: haiImg,
    KITE: kiteImg,
    OP: opImg,
    SNX: snxImg,
    STN: stnImg,
    TTM: ttmImg,
    WBTC: wbtcImg,
    WETH: wethImg,
    WSTETH: wstethImg,
}

export const tokenMap: Record<string, string> = {
    PROTOCOL_TOKEN: 'HAI',
    COIN: 'KITE',
    PROTOCOL_TOKEN_LP: 'KITE/ETH LP',
}

export type Token = {
    symbol: string
    name: string
    icon: string
}
export const tokenAssets: Record<string, Token> = {
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
    TTM: {
        symbol: 'TTM',
        name: 'TOTEM',
        icon: ttmImg,
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
