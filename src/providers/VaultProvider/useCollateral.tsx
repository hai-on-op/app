import { useMemo } from 'react'
import { formatEther } from 'ethers/lib/utils'

import type { Collateral } from '~/types'
import { VaultAction, formatNumber, returnTotalValue } from '~/utils'
import { useStoreState } from '~/store'

export function useCollateral(action: VaultAction): Collateral {
    const {
        vaultModel: {
            vaultData: {
                collateral,
                leftInput,
            },
            singleVault,
            liquidationData,
        },
        connectWalletModel: {
            tokensData,
            tokensFetchedData,
        },
    } = useStoreState(state => state)

    const name = useMemo(() => (
        singleVault?.collateralName || collateral
    ), [singleVault, collateral])

    const total = useMemo(() => {
        if (!singleVault) return leftInput

        if (action === VaultAction.WITHDRAW_REPAY) {
            return returnTotalValue(singleVault.collateral, leftInput, true, true).toString()
        }
        return returnTotalValue(singleVault.collateral, leftInput).toString()
    }, [singleVault, leftInput, action])

    const balance = useMemo(() => (
        formatEther(tokensFetchedData[name]?.balanceE18 || '0')
    ), [tokensFetchedData, name])

    const collateralLiquidationData = liquidationData?.collateralLiquidationData[name]

    const available = useMemo(() => {
        if (
            (action !== VaultAction.DEPOSIT_BORROW && action !== VaultAction.CREATE)
            || (singleVault && !singleVault.collateralName)
        ) {
            return singleVault?.collateral || '0'
        }
        return formatNumber(balance, 2).toString()
    }, [singleVault, balance, action])

    return {
        name,
        data: tokensData?.[name],
        total,
        available,
        balance,
        priceInUSD: collateralLiquidationData?.currentPrice?.value || '0',
        liquidationData: collateralLiquidationData,
    }
}
