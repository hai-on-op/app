import { useMemo, useState } from 'react'
import { BigNumber } from 'ethers'

import type { AvailableVaultPair, SortableHeader, Sorting } from '~/types'
import { arrayToSorted, getRatePercentage } from '~/utils'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { useStoreState } from '~/store'

const sortableHeaders: SortableHeader[] = [
    { label: 'Pair' },
    { label: 'Liquidation Ratio' },
    // { label: 'Net APY' },
    { label: 'Stability Fee' },
    { label: 'My Eligible Collateral' },
    { label: 'My Vaults' },
    {
        label: '',
        unsortable: true,
    },
]

export function useAvailableVaults() {
    const { isOpenableCollateral } = useAnalytics()
    const {
        connectWalletModel: { tokensData, tokensFetchedData },
        vaultModel: vaultState,
    } = useStoreState((state) => state)

    const availableVaults: AvailableVaultPair[] = useMemo(() => {
        return Object.values(tokensData || {})
            .filter(({ isCollateral, symbol }) => isCollateral && isOpenableCollateral(symbol))
            .map((collateral) => {
                const symbol = collateral.symbol
                const { liquidationCRatio, totalAnnualizedStabilityFee } =
                    vaultState.liquidationData?.collateralLiquidationData[symbol] || {}

                return {
                    collateralName: symbol,
                    collateralLabel: collateral.label,
                    collateralizationFactor: liquidationCRatio || '',
                    stabilityFee: getRatePercentage(totalAnnualizedStabilityFee || '1', 4, true).toString(),
                    apy: totalAnnualizedStabilityFee || '',
                    eligibleBalance: tokensFetchedData[symbol]?.balanceE18,
                    myVaults: vaultState.list.filter(({ collateralName }) => collateralName === symbol),
                }
            })
    }, [tokensData, tokensFetchedData, vaultState.list, vaultState.liquidationData, isOpenableCollateral])

    const [eligibleOnly, setEligibleOnly] = useState(false)

    const filteredAvailableVaults = useMemo(() => {
        if (!eligibleOnly) return availableVaults

        return availableVaults.filter(({ collateralName }) => {
            const balance = tokensFetchedData[collateralName]?.balanceE18 || '0'
            return !BigNumber.from(balance).isZero()
        })
    }, [availableVaults, eligibleOnly, tokensFetchedData])

    const [sorting, setSorting] = useState<Sorting>({
        key: 'Liquidation Ratio',
        dir: 'asc',
    })

    const sortedRows = useMemo(() => {
        switch (sorting.key) {
            case 'Pair':
                return arrayToSorted(filteredAvailableVaults, {
                    getProperty: (vault) => vault.collateralName,
                    dir: sorting.dir,
                    type: 'alphabetical',
                })
            case 'Stability Fee':
                return arrayToSorted(filteredAvailableVaults, {
                    getProperty: (vault) => (vault.stabilityFee ? parseFloat(vault.stabilityFee) : 0),
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'Net APY':
                return arrayToSorted(filteredAvailableVaults, {
                    getProperty: (vault) => vault.apy || '0',
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
            case 'My Eligible Collateral':
                return arrayToSorted(filteredAvailableVaults, {
                    getProperty: (vault) => vault.eligibleBalance,
                    dir: sorting.dir,
                    type: 'bigInt',
                    checkValueExists: true,
                })
            case 'My Vaults':
                return arrayToSorted(filteredAvailableVaults, {
                    getProperty: (vault) => vault.myVaults?.length,
                    dir: sorting.dir,
                    type: 'numerical',
                    checkValueExists: true,
                })
            case 'Liquidation Ratio':
            default:
                return arrayToSorted(filteredAvailableVaults, {
                    getProperty: (vault) => vault.collateralizationFactor || '0',
                    dir: sorting.dir,
                    type: 'parseFloat',
                })
        }
    }, [filteredAvailableVaults, sorting])

    return {
        headers: sortableHeaders,
        rows: sortedRows,
        rowsUnmodified: availableVaults,
        sorting,
        setSorting,
        eligibleOnly,
        setEligibleOnly,
    }
}
