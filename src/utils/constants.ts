import { css } from 'styled-components'
import { ChainId } from './interfaces'

export const {
    VITE_SYSTEM_STATUS,
    VITE_NETWORK_ID,
    VITE_WALLETCONNECT_ID,
    VITE_ALCHEMY_KEY,
    VITE_MAINNET_PUBLIC_RPC,
    VITE_TESTNET_PUBLIC_RPC,
} = import.meta.env

export const NETWORK_ID = parseInt(VITE_NETWORK_ID ?? '10')
export const DEFAULT_NETWORK_ID = 10

export const getNetworkName = (chainId: number) => {
    switch (chainId) {
        case 10:
            return 'mainnet'
        case 420:
            return 'optimism-goerli'
        default:
            return 'mainnet'
    }
}

export const COIN_TICKER = 'HAI'
export const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'
export const SYSTEM_STATUS = VITE_SYSTEM_STATUS || ''

export const ETHERSCAN_PREFIXES: { [chainId in ChainId]: string } = {
    10: 'optimistic.',
    420: 'goerli-optimism.',
}

export const MEDIA_WIDTHS = {
    upToExtraSmall: 576,
    upToSmall: 768,
    upToMedium: 992,
    upToLarge: 1280,
}

export const mediaWidthTemplates: {
    [width in keyof typeof MEDIA_WIDTHS]: typeof css
} = Object.keys(MEDIA_WIDTHS).reduce((accumulator, size) => {
    (accumulator as any)[size] = (a: any, b: any, c: any) => css`
        @media (max-width: ${(MEDIA_WIDTHS as any)[size]}px) {
            ${css(a, b, c)}
        }
    `
    return accumulator
}, {}) as any

export enum Status {
    SAFE = 'SAFE',
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
    CUSTOM = 'CUSTOM'
}

export const DEFAULT_SAFE_STATE = {
    totalCollateral: '',
    totalDebt: '',
    leftInput: '',
    rightInput: '',
    collateralRatio: 0,
    liquidationPrice: 0,
    collateral: '',
}

export const floatsTypes = {
    WAD: 18,
    RAY: 27,
    RAD: 45,
}

export const network_name = VITE_NETWORK_ID === '1' ? 'mainnet' : 'optimism-goerli'

export const LINK_TO_DOCS = 'https://docs.letsgethai.com/'
export const LINK_TO_TWITTER = 'https://twitter.com/@letsgethai'
// TODO: replace link
export const LINK_TO_TELEGRAM = 'https://twitter.com/@letsgethai'
// Auctions
export const NUMBER_OF_AUCTIONS_TO_SHOW = 15
export const SURPLUS_BATCH_SIZE = 5_000_000 // blocks
export const DEBT_BATCH_SIZE = 200_000 // blocks
export const COLLATERAL_BATCH_SIZE = 200_000 // blocks
