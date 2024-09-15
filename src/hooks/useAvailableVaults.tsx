import { useMemo, useState } from 'react'
import { BigNumber } from 'ethers'

import type { AvailableVaultPair, SortableHeader, Sorting } from '~/types'
import { arrayToSorted, DEPRECATED_COLLATERALS } from '~/utils'
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
    const {
        connectWalletModel: { tokensData, tokensFetchedData },
        vaultModel: vaultState,
    } = useStoreState((state) => state)

    const symbols = useMemo(
        () =>
            Object.values(tokensData || {})
                .filter(({ isCollateral }) => isCollateral)
                .map(({ symbol }) => symbol),
        [tokensData]
    )

    const collaterals = useMemo(
        () =>
            Object.values(tokensData || {})
                .filter(({ isCollateral }) => isCollateral)
                .map((collateral) => collateral),
        [tokensData]
    )

    const HAS_REWARDS = ['APXETH', 'WETH', 'WSTETH', 'RETH', 'OP', 'TBTC']

    const availableVaults: AvailableVaultPair[] = useMemo(() => {
        return collaterals
            .filter(({ symbol }) => !DEPRECATED_COLLATERALS.includes(symbol))
            .map((collateral) => {
                const symbol = collateral.symbol
                const { liquidationCRatio, totalAnnualizedStabilityFee } =
                    vaultState.liquidationData?.collateralLiquidationData[symbol] || {}
                return {
                    collateralName: symbol,
                    collateralLabel: collateral.label,
                    // hasRewards: collateral.hasRewards,
                    hasRewards: HAS_REWARDS.includes(symbol),
                    collateralizationFactor: liquidationCRatio || '',
                    stabilityFee: (1 - parseFloat(totalAnnualizedStabilityFee || '1')).toString(),
                    apy: totalAnnualizedStabilityFee || '',
                    eligibleBalance: tokensFetchedData[symbol]?.balanceE18,
                    myVaults: vaultState.list.filter(({ collateralName }) => collateralName === symbol),
                }
            })
    }, [symbols, tokensFetchedData, vaultState.list, vaultState.liquidationData])

    const [eligibleOnly, setEligibleOnly] = useState(false)

    const filteredAvailableVaults = useMemo(() => {
        if (!eligibleOnly) return availableVaults

        return availableVaults.filter(({ collateralName }) => {
            const balance = tokensFetchedData[collateralName]?.balanceE18 || '0'
            return !BigNumber.from(balance).isZero()
        })
    }, [availableVaults, eligibleOnly])

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
                    getProperty: (vault) => vault.stabilityFee || '0',
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
