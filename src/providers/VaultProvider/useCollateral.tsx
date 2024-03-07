import { useMemo } from 'react'
import { formatEther } from 'ethers/lib/utils'

import type { Collateral, FormState } from '~/types'
import { VaultAction, formatSummaryValue, returnTotalValue } from '~/utils'
import { useStoreState } from '~/store'
import { useBalance } from '~/hooks'

export function useCollateral(action: VaultAction, formState: FormState, collateral: string): Collateral {
    const {
        vaultModel: {
            // vaultData: { collateral, deposit, withdraw },
            singleVault,
            liquidationData,
        },
        connectWalletModel: { tokensData },
    } = useStoreState((state) => state)

    const name = useMemo(() => singleVault?.collateralName || collateral, [singleVault, collateral])

    const total: Collateral['total'] = useMemo(() => {
        if (!singleVault)
            return {
                current: undefined,
                after: formatSummaryValue(formState.deposit || '0', { maxDecimals: 4, minSigFigs: 1 })!,
            }

        const current = formatSummaryValue(singleVault.collateral || '0')!
        switch (action) {
            case VaultAction.WITHDRAW_BORROW:
            case VaultAction.WITHDRAW_REPAY: {
                const afterBN = returnTotalValue(
                    singleVault.collateral,
                    formState.withdraw || '0',
                    false,
                    true
                ).toString()
                return {
                    current,
                    after: formatSummaryValue(formatEther(afterBN), { maxDecimals: 4, minSigFigs: 1 })!,
                }
            }
            case VaultAction.CREATE:
            case VaultAction.DEPOSIT_BORROW:
            case VaultAction.DEPOSIT_REPAY:
            default: {
                const totalBN = returnTotalValue(
                    singleVault.collateral,
                    formState.deposit || '0',
                    false,
                    false
                ).toString()
                return {
                    current,
                    after: formatSummaryValue(formatEther(totalBN), { maxDecimals: 4, minSigFigs: 1 })!,
                }
            }
        }
    }, [singleVault, formState.deposit, formState.withdraw, action])

    const balance = useBalance(name)

    const collateralLiquidationData = liquidationData?.collateralLiquidationData[name]

    return {
        name,
        data: tokensData?.[name],
        total,
        balance,
        priceInUSD: collateralLiquidationData?.currentPrice?.value || '0',
        liquidationData: collateralLiquidationData,
    }
}
