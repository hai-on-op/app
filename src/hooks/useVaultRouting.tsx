import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { isAddress } from 'viem'
import { useAccount, useNetwork } from 'wagmi'

import { NETWORK_ID, DEFAULT_VAULT_DATA, VaultAction } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useEthersSigner } from './useEthersAdapters'
import { useGeb } from './useGeb'
import { useSearchParams } from './useSearchParams'

export function useVaultRouting(address?: string) {
    const { address: account } = useAccount()
    const { chain } = useNetwork()
    const signer = useEthersSigner()
    const geb = useGeb()
    const location = useLocation()
    const params = useSearchParams()

    const {
        connectWalletModel: { tokensData, isWrongNetwork },
        vaultModel: { singleVault, list },
    } = useStoreState((state) => state)
    const { vaultModel: vaultActions } = useStoreActions((actions) => actions)

    const [action, setAction] = useState<VaultAction>(VaultAction.INFO)

    useEffect(() => {
        switch (location.pathname) {
            case '/vaults': {
                setAction(VaultAction.INFO)
                vaultActions.setSingleVault(undefined)
                vaultActions.setVaultData(DEFAULT_VAULT_DATA)
                break
            }
            case '/vaults/manage': {
                const searchId = params.get('id')
                const vault = searchId ? list.find(({ id }) => searchId === id) || list[0] : list[0]
                setAction(vault ? VaultAction.DEPOSIT_BORROW : VaultAction.INFO)
                vaultActions.setSingleVault(vault)
                vaultActions.setVaultData({
                    ...DEFAULT_VAULT_DATA,
                    collateral: vault?.collateralName || 'WETH',
                })
                break
            }
            case '/vaults/open': {
                const symbols = Object.values(tokensData || {})
                    .filter(({ isCollateral }) => isCollateral)
                    .map(({ symbol }) => symbol)
                const collateral = params.get('collateral') || 'WETH'
                setAction(VaultAction.CREATE)
                vaultActions.setSingleVault(undefined)
                vaultActions.setVaultData({
                    ...DEFAULT_VAULT_DATA,
                    collateral: symbols.includes(collateral) ? collateral : 'WETH',
                })
                break
            }
        }
    }, [location.pathname, params, singleVault, list, tokensData, vaultActions])

    useEffect(() => {
        if ((!account && !address) || (address && !isAddress(address.toLowerCase())) || !signer || isWrongNetwork)
            return

        async function fetchVaults() {
            await vaultActions.fetchUserVaults({
                address: address || (account as string),
                geb,
                tokensData,
                chainId: chain?.id || NETWORK_ID,
            })
        }
        fetchVaults()

        const interval = setInterval(() => {
            if ((!account && !address) || (address && !isAddress(address.toLowerCase())) || !signer || isWrongNetwork)
                fetchVaults()
        }, 3000)

        return () => clearInterval(interval)
    }, [account, address, isWrongNetwork, tokensData, geb, signer, vaultActions])

    return {
        location,
        params,
        action,
        setAction,
    }
}
