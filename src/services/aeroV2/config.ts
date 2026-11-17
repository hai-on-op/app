import { ethers } from 'ethers'

import type { AeroV2ChainId, AeroV2Config, LegacySourceId } from './types'

export const LEGACY_SOURCES: Record<
    LegacySourceId,
    { id: LegacySourceId; label: string; address: string; numerator: number; denominator: number }
> = {
    haiVeloV1: {
        id: 'haiVeloV1',
        label: 'haiVELO v1',
        address: '0x70f3713512089736661F928B291d1443C8b1BB6A',
        numerator: 44,
        denominator: 1000,
    },
    haiVeloV2: {
        id: 'haiVeloV2',
        label: 'haiVELO v2',
        address: '0x20A7EaF4a922DF50b312ef61AeA8B6E1deb5DdD6',
        numerator: 44,
        denominator: 1000,
    },
    haiAeroV1: {
        id: 'haiAeroV1',
        label: 'haiAERO v1',
        address: '0xbdF4A4Cc124d9A83a5774574fcBE45DC5d1f1152',
        numerator: 1,
        denominator: 1,
    },
}

const CHAIN_CONFIG: Record<AeroV2ChainId, Omit<AeroV2Config, 'wrapperAddress'>> = {
    10: {
        chainId: 10,
        chainName: 'Optimism',
        underlyingSymbol: 'xAERO',
        underlyingAddress: '0xbdEaeA5205d16f34Cb40038052d91235D87B4C54',
    },
    8453: {
        chainId: 8453,
        chainName: 'Base',
        underlyingSymbol: 'AERO',
        underlyingAddress: '0x3f5bF3EdAc59d650D8fDf9657a71F2f904A3a4Ee',
        nftAddress: '0xBF7977E1521e9a3032bf7243Ee4712f311f13915',
    },
}

const EXCLUDED_ADDRESSES = [
    ethers.constants.AddressZero,
    '0x000000000000000000000000000000000000dEaD',
    ...Object.values(LEGACY_SOURCES).map((source) => source.address),
    // The existing Base token and collateral router are not V3 deployments.
    '0x10398AbC267496E49106B07dd6BE13364D10dC71',
    '0xd605046d24cdad37ca2dff3aa8ebf254ceee86d5',
    ...Object.values(CHAIN_CONFIG).flatMap((config) => [config.underlyingAddress, config.nftAddress || '']),
].map((address) => address.toLowerCase())

export function getAeroV2Config(chainId: AeroV2ChainId): AeroV2Config {
    const config = CHAIN_CONFIG[chainId]
    if (!config) throw new Error('haiAERO v2 supports Optimism and Base only.')

    const configuredAddress = (
        chainId === 10 ? import.meta.env.VITE_HAI_AERO_V2_OP_ADDRESS : import.meta.env.VITE_HAI_AERO_V2_BASE_ADDRESS
    )?.trim()
    if (!configuredAddress) return { ...config }
    if (!ethers.utils.isAddress(configuredAddress) || EXCLUDED_ADDRESSES.includes(configuredAddress.toLowerCase())) {
        throw new Error(`Invalid haiAERO v2 address configured for ${config.chainName}.`)
    }

    return { ...config, wrapperAddress: ethers.utils.getAddress(configuredAddress) }
}
