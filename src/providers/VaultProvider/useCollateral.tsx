import { useMemo } from 'react'
import { formatEther } from 'ethers/lib/utils'

import { type Collateral, VaultAction, formatNumber, returnTotalValue } from '~/utils'
import { useStoreState } from '~/store'

export function useCollateral(action: VaultAction): Collateral {
    const {
        safeModel: {
            safeData: {
                collateral,
                leftInput,
            },
            singleSafe,
            liquidationData,
        },
        connectWalletModel: {
            tokensData,
            tokensFetchedData,
        },
    } = useStoreState(state => state)

    const name = useMemo(() => (
        singleSafe?.collateralName || collateral
    ), [singleSafe, collateral])

    const total = useMemo(() => {
        if (!singleSafe) return leftInput

        if (action === VaultAction.WITHDRAW_REPAY) {
            return returnTotalValue(singleSafe.collateral, leftInput, true, true).toString()
        }
        return returnTotalValue(singleSafe.collateral, leftInput).toString()
    }, [singleSafe, leftInput, action])

    const balance = useMemo(() => (
        formatEther(tokensFetchedData[name]?.balanceE18 || '0')
    ), [tokensFetchedData, name])

    const collateralLiquidationData = liquidationData?.collateralLiquidationData[name]

    const available = useMemo(() => {
        if (
            (action !== VaultAction.DEPOSIT_BORROW && action !== VaultAction.CREATE)
            || (singleSafe && !singleSafe.collateralName)
        ) {
            return singleSafe?.collateral || '0'
        }
        return formatNumber(balance, 2).toString()
    }, [singleSafe, balance, action])

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
