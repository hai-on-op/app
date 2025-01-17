import { zeroAddress } from 'viem'
import { css } from 'styled-components'

export const {
    VITE_SYSTEM_STATUS,
    VITE_NETWORK_ID,
    VITE_WALLETCONNECT_ID,
    VITE_ALCHEMY_KEY,
    VITE_GRAPH_API_KEY,
    VITE_MAINNET_PUBLIC_RPC,
    VITE_TESTNET_PUBLIC_RPC,
    VITE_FLAGSMITH_API_KEY,
} = import.meta.env

export enum ChainId {
    MAINNET = 10,
    OPTIMISM_GOERLI = 420,
    OPTIMISM_SEPOLIA = 11155420,
}

export const NETWORK_ID = parseInt(VITE_NETWORK_ID ?? '11155420')

export const getNetworkName = (chainId: ChainId | number) => {
    switch (chainId) {
        case ChainId.MAINNET:
            return 'mainnet'
        case ChainId.OPTIMISM_GOERLI:
            return 'optimism-goerli'
        case ChainId.OPTIMISM_SEPOLIA:
            return 'optimism-sepolia'
        default:
            return 'mainnet'
    }
}

export const NETWORK_NAME = getNetworkName(NETWORK_ID)

export const COIN_TICKER = 'HAI'
export const EMPTY_ADDRESS = zeroAddress
export const SYSTEM_STATUS = VITE_SYSTEM_STATUS || ''

export const ETHERSCAN_PREFIXES: { [chainId in ChainId]: string } = {
    10: 'optimistic.',
    420: 'goerli-optimism.',
    11155420: 'sepolia-optimism.',
}

export const MEDIA_WIDTHS = {
    upToExtraSmall: 576,
    upToSmall: 768,
    upToMedium: 992,
    upToLarge: 1280,
}
export type MediaWidth = keyof typeof MEDIA_WIDTHS

export const mediaWidthTemplates: {
    [width in MediaWidth]: typeof css
} = Object.keys(MEDIA_WIDTHS).reduce((accumulator, size) => {
    ;(accumulator as any)[size] = (a: any, b: any, c: any) => css`
        @media (max-width: ${(MEDIA_WIDTHS as any)[size]}px) {
            ${css(a, b, c)}
        }
    `
    return accumulator
}, {}) as any

export enum Status {
    NO_DEBT = 'NO DEBT',
    SAFE = 'SAFE',
    UNSAFE = 'UNSAFE',
    DANGER = 'DANGER',
    LIVE = 'LIVE',
    COMPLETED = 'COMPLETED',
    RESTARTING = 'RESTARTING',
    SETTLING = 'SETTLING',
    POSITIVE = 'POSITIVE',
    NEGATIVE = 'NEGATIVE',
    NEUTRAL = 'NEUTRAL',
    OKAY = 'OKAY',
    UNKNOWN = 'UNKNOWN',
    CUSTOM = 'CUSTOM',
}

export enum ActionState {
    NONE = '',
    LOADING = 'loading',
    SUCCESS = 'success',
    ERROR = 'error',
}

export const floatsTypes = {
    WAD: 18,
    RAY: 27,
    RAD: 45,
}

export const network_name = VITE_NETWORK_ID === '1' ? 'mainnet' : 'optimism-sepolia'

export const LINK_TO_DOCS = 'https://docs.letsgethai.com/'
export const LINK_TO_MEDIUM = 'https://medium.com/hai-finance'
export const LINK_TO_GOVERNANCE = 'https://gov.letsgethai.com/'
export const LINK_TO_PRIVACY_POLICY =
    'https://docs.google.com/document/d/16MWB3hWZaRmmdQDJjCUe2CHyzgpYDzMpGiYJQdKLzZA/edit?usp=sharing'
export const LINK_TO_TOS =
    'https://docs.google.com/document/d/1ELpRt_xIl4YYePqsdUAlf-kUL-ZNrOuc3NnI20XUWEY/edit?usp=sharing'
export const LINK_TO_TWITTER = 'https://twitter.com/@letsgethai'
export const LINK_TO_TELEGRAM = 'https://t.me/+0iIhX0f9DDAxODE5'
export const LINK_TO_DISCORD = 'https://discord.gg/letsgethai'
// export const LINK_TO_FORUM = 'https://commonwealth.im/lets-get-hai'
export const LINK_TO_FORUM = 'https://dao.letsgethai.com/forum'
// Auctions
export const NUMBER_OF_AUCTIONS_TO_SHOW = 15
export const SURPLUS_BATCH_SIZE = 5_000_000 // blocks
export const DEBT_BATCH_SIZE = 5_000_000 // blocks
export const COLLATERAL_BATCH_SIZE = 5_000_000 // blocks

export const HARDCODED_KITE = 8

export const DEPRECATED_COLLATERALS = ['WBTC']
