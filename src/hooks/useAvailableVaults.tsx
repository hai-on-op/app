import { useMemo, useState } from 'react'
import { BigNumber } from 'ethers'

import type { AvailableVaultPair, SortableHeader, Sorting } from '~/types'
import { formatNumberWithStyle, getRatePercentage } from '~/utils'
import { useStoreState } from '~/store'

const sortableHeaders: SortableHeader[] = [
    { label: 'Pair' },
    { label: 'Coll. Factor' },
    { label: 'Net APY' },
    { label: 'My Eligible Collateral' },
    { label: 'My Vaults' },
]

export function useAvailableVaults() {
    const {
        connectWalletModel: {
            tokensData,
            tokensFetchedData,
        },
        vaultModel: vaultState,
    } = useStoreState(state => state)

    const symbols = useMemo(() => (
        Object.values(tokensData || {})
            .filter(({ isCollateral }) => isCollateral)
            .map(({ symbol }) => symbol)
    ), [tokensData])

    const availableVaults: AvailableVaultPair[] = useMemo(() => {
        return symbols.map(symbol => {
            const {
                liquidationCRatio,
                totalAnnualizedStabilityFee,
            } = vaultState.liquidationData?.collateralLiquidationData[symbol] || {}
            return {
                collateralName: symbol,
                collateralizationFactor: liquidationCRatio
                    ? formatNumberWithStyle(liquidationCRatio, {
                        maxDecimals: 0,
                        style: 'percent',
                    })
                    : '--%',
                apy: totalAnnualizedStabilityFee
                    ? getRatePercentage(totalAnnualizedStabilityFee).toString()
                    : '',
                eligibleBalance: tokensFetchedData[symbol]?.balanceE18 || '0',
                myVaults: vaultState.list.filter(({ collateralName }) => (
                    collateralName === symbol
                )),
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
        key: 'Coll. Factor',
        dir: 'desc',
    })

    const sortedRows = useMemo(() => {
        switch(sorting.key) {
            case 'Pair': {
                return filteredAvailableVaults.toSorted(({ collateralName: a }, { collateralName: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? (a > b ? 1: -1)
                        : (a < b ? 1: -1)
                })
            }
            case 'Net APY': {
                return filteredAvailableVaults.toSorted(({ apy: a }, { apy: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? parseFloat(b) - parseFloat(a)
                        : parseFloat(a) - parseFloat(b)
                })
            }
            case 'My Eligible Collateral': {
                return filteredAvailableVaults.toSorted(({ eligibleBalance: a }, { eligibleBalance: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? parseFloat(b) - parseFloat(a)
                        : parseFloat(a) - parseFloat(b)
                })
            }
            case 'My Vaults': {
                return filteredAvailableVaults.toSorted(({ myVaults: a }, { myVaults: b}) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? b.length - a.length
                        : a.length - b.length
                })
            }
            case 'Coll. Factor':
            default: {
                return filteredAvailableVaults.toSorted(({ collateralizationFactor: a }, { collateralizationFactor: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? parseFloat(b) - parseFloat(a)
                        : parseFloat(a) - parseFloat(b)
                })
            }
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
