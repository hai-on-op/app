import { useEffect, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { isAddress } from 'viem'
import { useAccount, useNetwork } from 'wagmi'

import { NETWORK_ID, DEFAULT_VAULT_DATA, VaultAction } from '~/utils'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useStoreActions, useStoreState } from '~/store'
import { useEthersSigner } from './useEthersAdapters'
import { useGeb } from './useGeb'
import { useSearchParams } from './useSearchParams'

export function useVaultRouting(address?: string) {
    const { address: account } = useAccount()
    const { chain } = useNetwork()
    const signer = useEthersSigner()
    const geb = useGeb()
    const history = useHistory()
    const location = useLocation()
    const { isOpenableCollateral } = useAnalytics()
    const params = useSearchParams()

    const {
        connectWalletModel: { tokensData, isWrongNetwork },
        vaultModel: { list },
    } = useStoreState((state) => state)
    const { vaultModel: vaultActions } = useStoreActions((actions) => actions)

    const [action, setAction] = useState<VaultAction>(VaultAction.INFO)

    const requestedCollateral = params.get('collateral') || 'WETH'
    const openCollateral =
        requestedCollateral.toUpperCase() === 'HAIVELO' ? 'HAIVELOV2' : requestedCollateral.toUpperCase()
    const tokensLoaded = Object.keys(tokensData).length > 0
    const canOpen =
        location.pathname === '/vaults/open' &&
        tokensData[openCollateral]?.isCollateral &&
        isOpenableCollateral(openCollateral)

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
                const vault = searchId ? list.find(({ id }) => searchId === id) : list[0]
                setAction(vault ? VaultAction.DEPOSIT_BORROW : VaultAction.INFO)
                vaultActions.setSingleVault(vault)
                vaultActions.setVaultData({
                    ...DEFAULT_VAULT_DATA,
                    collateral: vault?.collateralName || 'WETH',
                })
                break
            }
            case '/vaults/open': {
                vaultActions.setSingleVault(undefined)
                if (!tokensLoaded || !canOpen) {
                    setAction(VaultAction.INFO)
                    vaultActions.setVaultData(DEFAULT_VAULT_DATA)
                    if (tokensLoaded) history.replace('/vaults?tab=available')
                    break
                }

                if (openCollateral !== requestedCollateral) {
                    const search = new URLSearchParams(params)
                    search.set('collateral', openCollateral)
                    history.replace({ pathname: location.pathname, search: search.toString() })
                }
                setAction(VaultAction.CREATE)
                vaultActions.setVaultData({
                    ...DEFAULT_VAULT_DATA,
                    collateral: openCollateral,
                })
                break
            }
        }
    }, [
        location.pathname,
        params,
        list,
        tokensLoaded,
        canOpen,
        requestedCollateral,
        openCollateral,
        history,
        vaultActions,
    ])

    useEffect(() => {
        const owner = address || account
        if (
            !owner ||
            !isAddress(owner.toLowerCase()) ||
            !signer ||
            !geb ||
            chain?.id !== NETWORK_ID ||
            isWrongNetwork ||
            !tokensLoaded
        )
            return

        const controller = new AbortController()
        vaultActions.fetchUserVaults({
            address: owner,
            geb,
            tokensData,
            chainId: NETWORK_ID,
            signal: controller.signal,
        })
        return () => controller.abort()
    }, [account, address, isWrongNetwork, tokensLoaded, tokensData, geb, signer, vaultActions, chain?.id])

    return {
        location,
        params,
        action,
        setAction,
    }
}
