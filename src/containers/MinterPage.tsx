/**
 * MinterPage
 *
 * Generic page component for minter protocols (haiVELO, haiAERO).
 * Generalized from HaiVeloPage to support multiple protocols.
 * Tab navigation (Mint, Bridge) is handled inside ManageVault component.
 */

import { useEffect, useMemo, useState } from 'react'

import type { MinterProtocolId } from '~/types/minterProtocol'
import type { IVault } from '~/types/vaults'
import { VaultAction, DEFAULT_VAULT_DATA } from '~/utils'
import { TREAT_EMPTY_VAULT_AS_NEW } from '~/utils/constants'
import { useStoreActions, useStoreState } from '~/store'
import { VaultProvider } from '~/providers/VaultProvider'
import { getProtocolConfig } from '~/services/minterProtocol'

import { ManageVault } from '~/containers/Vaults/Manage'

interface MinterPageProps {
    protocolId: MinterProtocolId
    useTestnet?: boolean
}

function vaultSize(vault: IVault) {
    return Number(vault.collateral) || Number(vault.totalDebt) || Number(vault.freeCollateral) || 0
}

/**
 * Generic page component for minter protocols.
 * Handles vault initialization and management for the specified protocol.
 * Tab navigation for Mint/Bridge is handled inside ManageVault based on URL path.
 */
export function MinterPage({ protocolId, useTestnet = false }: MinterPageProps) {
    const config = getProtocolConfig(protocolId, useTestnet)
    const collateralId = config.collateral.v2Id

    const { vaultModel: vaultActions } = useStoreActions((actions) => actions)
    const {
        vaultModel: { list: userVaults },
    } = useStoreState((state) => state)
    const [action, setAction] = useState<VaultAction>(VaultAction.CREATE)

    const largestVault = useMemo(() => {
        const matchingVaults = userVaults.filter((vault) => vault.collateralName === collateralId)
        return matchingVaults.reduce<IVault | undefined>((largest, vault) => {
            const size = vaultSize(vault)
            if (TREAT_EMPTY_VAULT_AS_NEW && size === 0) return largest
            return !largest || size > vaultSize(largest) ? vault : largest
        }, undefined)
    }, [userVaults, collateralId])

    useEffect(() => {
        vaultActions.setSingleVault(largestVault)
        vaultActions.setVaultData({
            ...DEFAULT_VAULT_DATA,
            collateral: collateralId,
        })
        setAction(largestVault ? VaultAction.DEPOSIT_BORROW : VaultAction.CREATE)
    }, [vaultActions, collateralId, largestVault])

    return (
        <VaultProvider action={action} setAction={setAction}>
            <ManageVault />
        </VaultProvider>
    )
}

// ============================================================================
// Protocol-Specific Page Components
// ============================================================================

/**
 * HaiVeloPage - Backward compatible wrapper for the /haiVELO route.
 */
export function HaiVeloPage() {
    return <MinterPage protocolId="haiVelo" />
}

/**
 * HaiAeroPage - Page component for the /haiAERO route.
 */
export function HaiAeroPage() {
    return <MinterPage protocolId="haiAero" />
}

// Default export for backward compatibility
export default MinterPage
