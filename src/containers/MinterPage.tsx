/**
 * MinterPage
 *
 * Generic page component for minter protocols (haiVELO, haiAERO).
 * Generalized from HaiVeloPage to support multiple protocols.
 * Tab navigation (Mint, Bridge) is handled inside ManageVault component.
 */

import { useEffect, useState } from 'react'

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

    useEffect(() => {
        // Initialize create flow with the protocol's V2 collateral selected
        vaultActions.setSingleVault(undefined)
        vaultActions.setVaultData({
            ...DEFAULT_VAULT_DATA,
            collateral: collateralId,
        })
        // Ensure action is set to CREATE
        setAction(VaultAction.CREATE)
    }, [vaultActions, collateralId])

    useEffect(() => {
        if (!userVaults || userVaults.length === 0) return

        // Only switch to manage if the user has a vault for this protocol
        const protocolVaults = userVaults.filter((v: IVault) => v.collateralName === collateralId)
        if (protocolVaults.length === 0) return

        const getSize = (v: IVault) => {
            const col = parseFloat(v.collateral || '0')
            const debt = parseFloat(v.totalDebt || '0')
            return isFinite(col) && col > 0 ? col : debt
        }

        // DEV: When TREAT_EMPTY_VAULT_AS_NEW is on, vaults with no collateral
        // and no debt are considered "empty" and the create-vault flow is shown
        // instead of the manage flow.
        const isVaultEmpty = (v: IVault) => getSize(v) === 0

        if (TREAT_EMPTY_VAULT_AS_NEW && protocolVaults.every(isVaultEmpty)) return

        const largest = protocolVaults.reduce(
            (max: IVault, v: IVault) => (getSize(v) > getSize(max) ? v : max),
            protocolVaults[0]
        )

        // Switch to manage mode with the largest vault selected
        vaultActions.setSingleVault(largest)
        vaultActions.setVaultData({
            ...DEFAULT_VAULT_DATA,
            collateral: collateralId,
        })
        setAction(VaultAction.DEPOSIT_BORROW)
    }, [userVaults, vaultActions, collateralId])

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
