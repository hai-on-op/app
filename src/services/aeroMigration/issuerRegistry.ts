import type { VerifiedContractDeployment } from './registry'

export const NEW_AERO_BASE_ADDRESS = '0x3f5bF3EdAc59d650D8fDf9657a71F2f904A3a4Ee'
export const NEW_SAERO_BASE_ADDRESS = '0xBF7977E1521e9a3032bf7243Ee4712f311f13915'

export interface HaiAeroIssuerDeployment {
    id: string
    version: 'haiAERO-v2'
    chainId: 8453
    wrapper: VerifiedContractDeployment
    contractsCommit: string
    activationTransactionHash: string
    voter: string
    treasury: string
}

/** Separate from legacy tokens and migrators. Never populate with upstream AERO or sAERO addresses. */
export const HAI_AERO_ISSUER_DEPLOYMENTS: readonly HaiAeroIssuerDeployment[] = Object.freeze([])

export function getReviewedIssuer(id: string) {
    const issuer = HAI_AERO_ISSUER_DEPLOYMENTS.find((entry) => entry.id === id)
    if (!issuer) throw new Error('New haiAERO minting is not open: no verified issuer is available.')
    return issuer
}
