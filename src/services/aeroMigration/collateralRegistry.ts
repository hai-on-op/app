import type { TokenData } from '@hai-on-op/sdk'
import { ethers } from 'ethers'

export type ReviewedAdditionalCollateral = {
    deployment: 'mainnet'
    chainId: 10
    metadata: TokenData
    contractsCommit: string
    governanceTransactionHash: string
}

/** Add only after the distinct Optimism collateral, join, auction and live oracle binding are adopted and reviewed. */
export const REVIEWED_ADDITIONAL_COLLATERALS: readonly ReviewedAdditionalCollateral[] = Object.freeze([])

export function getReviewedAdditionalCollaterals(network: string) {
    return REVIEWED_ADDITIONAL_COLLATERALS.filter((entry) => entry.deployment === network).map((entry) => {
        if (
            entry.chainId !== 10 ||
            entry.deployment !== 'mainnet' ||
            !/^[0-9a-f]{40}$/i.test(entry.contractsCommit) ||
            !ethers.utils.isHexString(entry.governanceTransactionHash, 32) ||
            entry.governanceTransactionHash === ethers.constants.HashZero
        )
            throw new Error('Additional collateral is missing reviewed governance adoption evidence.')
        return { ...entry.metadata, deployment: entry.deployment }
    })
}
