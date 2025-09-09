import { useEffect, useState } from 'react'

import { VaultAction, DEFAULT_VAULT_DATA } from '~/utils'
import { useStoreActions } from '~/store'
import { VaultProvider } from '~/providers/VaultProvider'

import { ManageVault } from '~/containers/Vaults/Manage'

export function HaiVeloPage() {
    const { vaultModel: vaultActions } = useStoreActions((actions) => actions)
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

    return (
        <VaultProvider action={action} setAction={setAction}>
            <ManageVault />
        </VaultProvider>
    )
}


