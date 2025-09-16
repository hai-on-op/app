import { useEffect, useState } from 'react'

import { VaultAction, DEFAULT_VAULT_DATA } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { VaultProvider } from '~/providers/VaultProvider'

import { ManageVault } from '~/containers/Vaults/Manage'

export function HaiVeloPage() {
    const { vaultModel: vaultActions } = useStoreActions((actions) => actions)
    const {
        vaultModel: { list: userVaults },
    } = useStoreState((state) => state)
    const [action, setAction] = useState<VaultAction>(VaultAction.CREATE)

    useEffect(() => {
        // Initialize create flow with haiVELO v2 selected
        vaultActions.setSingleVault(undefined)
        vaultActions.setVaultData({
            ...DEFAULT_VAULT_DATA,
            collateral: 'HAIVELOV2',
        })
        // Ensure action is set to CREATE
        setAction(VaultAction.CREATE)
    }, [vaultActions])

    useEffect(() => {
        if (!userVaults || userVaults.length === 0) return

        // Only switch to manage if the user has a haiVELO v2 vault
        const haiVeloV2Vaults = userVaults.filter((v: any) => v.collateralName === 'HAIVELOV2')
        if (haiVeloV2Vaults.length === 0) return

        const getSize = (v: any) => {
            const col = parseFloat(v.collateral || '0')
            const debt = parseFloat(v.totalDebt || '0')
            return isFinite(col) && col > 0 ? col : debt
        }
        const largest = haiVeloV2Vaults.reduce(
            (max: any, v: any) => (getSize(v) > getSize(max) ? v : max),
            haiVeloV2Vaults[0]
        )

        // Switch to manage mode with the largest v2 vault selected
        vaultActions.setSingleVault(largest)
        vaultActions.setVaultData({
            ...DEFAULT_VAULT_DATA,
            collateral: 'HAIVELOV2',
        })
        setAction(VaultAction.DEPOSIT_BORROW)
    }, [userVaults, vaultActions])

    return (
        <VaultProvider action={action} setAction={setAction}>
            <ManageVault />
        </VaultProvider>
    )
}


