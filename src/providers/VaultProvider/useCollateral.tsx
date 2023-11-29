import { useMemo } from 'react'
import { formatEther } from 'ethers/lib/utils'

import { type Collateral, VaultAction, formatNumber, returnTotalValue } from '~/utils'
import { useStoreState } from '~/store'

export function useCollateral(action: VaultAction): Collateral {
    const {
        safeModel: {
            safeData: {
                collateral,
                leftInput
            },
            singleSafe,
            liquidationData
        },
        connectWalletModel: { tokensFetchedData }
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

    const balance = formatEther(tokensFetchedData[name]?.balanceE18 || '0')

    const collateralLiquidationData = liquidationData?.collateralLiquidationData[name]

    const available = useMemo(() => {
        if (!singleSafe) return '0'

        if (action !== VaultAction.DEPOSIT_BORROW || !singleSafe.collateralName) {
            return singleSafe.collateral
        }
        return formatNumber(balance, 2).toString()
    }, [singleSafe, balance, action])

    return {
        name,
        total,
        available,
        balance,
        priceInUSD: collateralLiquidationData?.currentPrice?.value || '0',
        liquidationData: collateralLiquidationData
    }
}
