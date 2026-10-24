import { ethers } from 'ethers'

export type MigrationChainId = 10 | 8453
export type LegacyAssetId = 'haivelo-v1' | 'haivelo-v2' | 'haiaero-base-v1' | 'haiaero-optimism-v1'

export const LEGACY_MIGRATION_ASSETS: Record<
    LegacyAssetId,
    {
        label: string
        chainId: MigrationChainId
        address: string
        decimals: number
    }
> = {
    'haivelo-v1': {
        label: 'haiVELO v1',
        chainId: 10,
        address: '0x70f3713512089736661F928B291d1443C8b1BB6A',
        decimals: 18,
    },
    'haivelo-v2': {
        label: 'haiVELO v2',
        chainId: 10,
        address: '0x20A7EaF4a922DF50b312ef61AeA8B6E1deb5DdD6',
        decimals: 18,
    },
    'haiaero-base-v1': {
        label: 'Legacy haiAERO on Base',
        chainId: 8453,
        address: '0x10398AbC267496E49106B07dd6BE13364D10dC71',
        decimals: 18,
    },
    'haiaero-optimism-v1': {
        label: 'Legacy haiAERO on Optimism',
        chainId: 10,
        address: '0xbdF4A4Cc124d9A83a5774574fcBE45DC5d1f1152',
        decimals: 18,
    },
}

export interface ContractCodeIdentity {
    address: string
    runtimeCodeHash: string
    implementation?: { address: string; runtimeCodeHash: string }
}

export interface VerifiedContractDeployment extends ContractCodeIdentity {
    /** Required for factory-created deployments whose receipt.contractAddress is null. */
    factoryDeployment?: {
        factory: ContractCodeIdentity
        eventAbi: string
        addressArgument: string
    }
    deploymentTransactionHash: string
    deploymentBlockNumber: number
    deploymentBlockHash: string
}

export interface AeroMigrationDeployment {
    id: string
    version: 'haiAERO-v2'
    chainId: MigrationChainId
    migrator: VerifiedContractDeployment
    outputToken: VerifiedContractDeployment
    outputDecimals: 18
    assets: LegacyAssetId[]
    /** Commit of the reviewed contracts used to produce these deployment artifacts. */
    contractsCommit: string
    /** Reviewed governance execution transaction that activated this route. */
    activationTransactionHash: string
}

/**
 * Production adoption is deliberately empty until HAI's own deployments, runtime
 * hashes, receipts, governance activation and funded backing have been verified.
 * Upstream AERO/sAERO addresses are not HAI wrapper or migrator deployments.
 * No environment variable or local storage setting can enable an unreviewed route.
 */
export const AERO_MIGRATION_DEPLOYMENTS: readonly AeroMigrationDeployment[] = Object.freeze([])

export function assertDeploymentShape(deployment: AeroMigrationDeployment) {
    const hash = /^0x[0-9a-f]{64}$/i
    if (!deployment.id || deployment.version !== 'haiAERO-v2' || ![10, 8453].includes(deployment.chainId)) {
        throw new Error('Unsupported migration deployment.')
    }
    if (!/^[0-9a-f]{40}$/i.test(deployment.contractsCommit) || !hash.test(deployment.activationTransactionHash)) {
        throw new Error('Missing reviewed migration activation evidence.')
    }
    if (
        deployment.outputDecimals !== 18 ||
        !deployment.assets.length ||
        new Set(deployment.assets).size !== deployment.assets.length
    ) {
        throw new Error('Invalid migration asset configuration.')
    }
    for (const contract of [deployment.migrator, deployment.outputToken]) {
        if (
            !ethers.utils.isAddress(contract.address) ||
            contract.address === ethers.constants.AddressZero ||
            !hash.test(contract.runtimeCodeHash) ||
            !hash.test(contract.deploymentTransactionHash) ||
            !hash.test(contract.deploymentBlockHash) ||
            !Number.isSafeInteger(contract.deploymentBlockNumber) ||
            contract.deploymentBlockNumber <= 0
        ) {
            throw new Error('Missing verified migration deployment evidence.')
        }
    }
    if (deployment.migrator.address.toLowerCase() === deployment.outputToken.address.toLowerCase()) {
        throw new Error('Migrator and output token must be different contracts.')
    }
    for (const id of deployment.assets) {
        const asset = LEGACY_MIGRATION_ASSETS[id]
        if (
            !asset ||
            asset.chainId !== deployment.chainId ||
            asset.address.toLowerCase() === deployment.outputToken.address.toLowerCase()
        ) {
            throw new Error('Migration asset is on the wrong chain or is not a legacy token.')
        }
    }
}

export function getReviewedDeployment(id: string): AeroMigrationDeployment {
    const deployment = AERO_MIGRATION_DEPLOYMENTS.find((entry) => entry.id === id)
    if (!deployment) throw new Error('Migration is not open: no verified HAI deployment is available.')
    assertDeploymentShape(deployment)
    return deployment
}
