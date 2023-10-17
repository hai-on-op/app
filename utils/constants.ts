import { css } from 'styled-components'
import { ChainId } from './interfaces'

export const SYSTEM_STATUS = process.env.NEXT_PUBLIC_SYSTEM_STATUS || ''
export const NETWORK_ID = parseInt(process.env.NEXT_PUBLIC_NETWORK_ID ?? '1')
export const WALLETCONNECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || ''
export const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''
export const PUBLIC_RPC = process.env.NEXT_PUBLIC_PUBLIC_RPC || ''

export enum Network {
    OPTIMISM_GOERLI = 'optimism-goerli',
}

export const ETH_NETWORK = Network.OPTIMISM_GOERLI
export const COIN_TICKER = 'HAI'
export const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

export const NetworkContextName = 'NETWORK'

export const ETHERSCAN_PREFIXES: { [chainId in ChainId]: string } = {
    1: '',
    5: 'goerli.',
    420: 'goerli-optimism.',
}

const MEDIA_WIDTHS = {
    upToExtraSmall: 576,
    upToSmall: 768,
    upToMedium: 992,
    upToLarge: 1280,
}

type MediaWidthTemplates = Record<keyof typeof MEDIA_WIDTHS, typeof css>
export const mediaWidthTemplates: MediaWidthTemplates = Object.keys(MEDIA_WIDTHS)
    .reduce((accumulator, size) => {
        (accumulator as any)[size] = (a: any, b: any, c: any) => css`
            @media (max-width: ${(MEDIA_WIDTHS as any)[size]}px) {
                ${css(a, b, c)}
            }
        `
        return accumulator
    }, {} as MediaWidthTemplates)

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

export const network_name = NETWORK_ID === 1 ? 'mainnet' : 'optimism-goerli'