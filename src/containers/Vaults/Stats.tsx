import { useMemo } from 'react'

import { formatNumberWithStyle } from '~/utils'
import { useStoreState } from '~/store'

import { HaiButton } from '~/styles'
import { RewardsTokenPair } from '~/components/TokenPair'
import { Stats, type StatProps } from '~/components/Stats'

export function BorrowStats() {
    const {
        vaultModel: {
            list,
            liquidationData,
        },
    } = useStoreState(state => state)

    const stats: StatProps[] = useMemo(() => {
        const totalCollateralInUSD = list.reduce((total, { collateralName, collateral }) => {
            const collateralPriceInUSD = liquidationData
                ?.collateralLiquidationData[collateralName]
                ?.currentPrice.value || '0'
            return total + parseFloat(collateral) * parseFloat(collateralPriceInUSD)
        }, 0)

        const totalDebtInUSD = list.reduce((total, { debt }) => {
            return total + parseFloat(debt) * parseFloat(liquidationData?.currentRedemptionPrice || '1')
        }, 0)

        // TODO: dynamically calculate apy, hook up rewards
        return [
            {
                header: totalCollateralInUSD
                    ? formatNumberWithStyle(totalCollateralInUSD.toString(), {
                        style: 'currency',
                        maxDecimals: 0,
                    })
                    : '--',
                label: 'My Locked Collateral',
                tooltip: 'Hello world',
            },
            {
                header: totalDebtInUSD
                    ? formatNumberWithStyle(totalDebtInUSD.toString(), {
                        style: 'currency',
                        maxDecimals: 0,
                    })
                    : '--',
                label: 'My Total Debt',
                tooltip: 'Hello World',
            },
            {
                header: '7.8%',
                label: 'My Net APY',
                tooltip: 'Hello World',
            },
            {
                header: '$7,000',
                headerStatus: (
                    <RewardsTokenPair
                        tokens={['OP', 'KITE']}
                        hideLabel
                    />
                ),
                label: 'My Vault Rewards',
                tooltip: 'Hello World',
                button: (
                    <HaiButton $variant="yellowish">
                        Claim
                    </HaiButton>
                ),
            },
        ]
    }, [list, liquidationData])

    if (!list.length) return null

    return (
        <Stats
            stats={stats}
            columns="repeat(3, 1fr) 1.6fr"
        />
    )
}
