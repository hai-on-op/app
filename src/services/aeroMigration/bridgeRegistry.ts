import type { ContractCodeIdentity, MigrationChainId, VerifiedContractDeployment } from './registry'

export type BridgeCodeIdentity = ContractCodeIdentity

export interface NewHaiAeroBridgeEndpoint {
    chainId: MigrationChainId
    domain: number
    kind: 'collateral' | 'synthetic'
    token: BridgeCodeIdentity
    router: BridgeCodeIdentity & VerifiedContractDeployment
    mailbox: BridgeCodeIdentity
    ism: BridgeCodeIdentity
    /** Address configured on router; zero means the mailbox default ISM. */
    routerIsmAddress: string
    activationTransactionHash: string
}

export interface NewHaiAeroBridgeRoute {
    id: string
    issuerId: string
    version: 'hyperlane-tokenrouter-unscaled-v3'
    contractsCommit: string
    base: NewHaiAeroBridgeEndpoint
    optimism: NewHaiAeroBridgeEndpoint
}

/** No new route is enabled until both HAI routers and their security configuration are deployed and reviewed. */
export const NEW_HAI_AERO_BRIDGE_ROUTES: readonly NewHaiAeroBridgeRoute[] = Object.freeze([])

export function getReviewedBridgeRoute(id: string) {
    const route = NEW_HAI_AERO_BRIDGE_ROUTES.find((entry) => entry.id === id)
    if (!route) throw new Error('The new haiAERO bridge is not open: no verified route is available.')
    return route
}

export type NewBridgeDirection = 'base-to-optimism' | 'optimism-to-base'

export function bridgeEndpoints(route: NewHaiAeroBridgeRoute, direction: NewBridgeDirection) {
    return direction === 'base-to-optimism'
        ? { source: route.base, destination: route.optimism }
        : { source: route.optimism, destination: route.base }
}
