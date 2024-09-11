import { useMemo } from 'react'

import { formatNumberWithStyle } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useEarnStrategies } from '~/hooks'

import { HaiButton, Text } from '~/styles'
import { RewardsTokenArray } from '~/components/TokenArray'
import { Stats, type StatProps } from '~/components/Stats'
import { Link } from '~/components/Link'
import { Loader } from '~/components/Loader'
import { RefreshCw } from 'react-feather'

export function BorrowStats() {
    const {
        vaultModel: { list, liquidationData },
    } = useStoreState((state) => state)
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)

    const { rows } = useEarnStrategies()

    const { value, apy } = useMemo(() => {
        return rows.reduce(
            (obj, { userPosition = '0', apy }) => {
                const apyToUse = apy ? apy : 0
                obj.value += parseFloat(userPosition)
                obj.apy += parseFloat(userPosition) * apyToUse
                return obj
            },
            { value: 0, apy: 0 }
        )
    }, [rows])

    const stats: StatProps[] = useMemo(() => {
        const { totalCollateralInUSD, totalHai, weightedStabilityFee } = list.reduce(
            (obj, { collateral, collateralName, debt, totalAnnualizedStabilityFee }) => {
                const collateralPriceInUSD =
                    liquidationData?.collateralLiquidationData[collateralName]?.currentPrice.value || '0'
                obj.totalCollateralInUSD += parseFloat(collateral) * parseFloat(collateralPriceInUSD)
                obj.totalHai += parseFloat(debt)
                obj.weightedStabilityFee += (parseFloat(totalAnnualizedStabilityFee) - 1) * parseFloat(debt)
                return obj
            },
            { totalCollateralInUSD: 0, totalHai: 0, weightedStabilityFee: 0 }
        )

        const totalDebtInUSD = totalHai * parseFloat(liquidationData?.currentRedemptionPrice || '1')

        const weightedStabilityFeeAverage = !list.length || !totalHai ? 0 : weightedStabilityFee / totalHai

        return [
            {
                header: totalCollateralInUSD
                    ? formatNumberWithStyle(totalCollateralInUSD.toString(), {
                          style: 'currency',
                          minDecimals: 1,
                          maxDecimals: 1,
                          suffixed: true,
                      })
                    : '$0',
                label: 'My Locked Collateral',
                tooltip:
                    'Summation of the total amount of a given collateral locked in your vaults multiplied by the protocol oracle price of that collateral.',
            },
            {
                header: totalDebtInUSD
                    ? formatNumberWithStyle(totalDebtInUSD.toString(), {
                          style: 'currency',
                          minDecimals: 1,
                          maxDecimals: 1,
                          suffixed: true,
                      })
                    : '$0',
                label: 'My Total Debt',
                tooltip: 'The total amount of minted debt tokens multiplied by the protocol redemption price of debt.',
            },
            {
                header: formatNumberWithStyle(weightedStabilityFeeAverage, {
                    style: 'percent',
                    scalingFactor: -100,
                    minDecimals: 1,
                    maxDecimals: 1,
                    suffixed: true,
                }),
                label: 'My Net Stability Fee',
                tooltip: 'Weighted average stability fee of My Total Debt',
            },
            {
                header: formatNumberWithStyle(value ? apy / value : 0, {
                    maxDecimals: 1,
                    scalingFactor: 100,
                    suffixed: true,
                    style: 'percent',
                }),
                label: 'My Est. Rewards APY',
                tooltip: (
                    <Text>
                        Rewards derived from all campaign activities. Check out the <Link href="/earn">earn page</Link>{' '}
                        for more information.
                    </Text>
                ),
            },
            {
                // header: '$0',
                header: <Loader speed={0.5} icon={<RefreshCw />} />,
                headerStatus: <RewardsTokenArray tokens={['OP', 'KITE']} hideLabel />,
                label: 'My Vault Rewards',
                tooltip: 'Rewards currently voted upon and distributed by DAO approximately once per month.',
                button: (
                    <HaiButton $variant="yellowish" onClick={() => popupsActions.setIsClaimPopupOpen(true)}>
                        Claim
                    </HaiButton>
                    // <HaiButton title="Claim window is closed" $variant="yellowish" disabled>
                    //     Claim
                    // </HaiButton>
                ),
            },
        ]
    }, [list, liquidationData, value, apy, popupsActions])

    return <Stats stats={stats} columns="repeat(4, 1fr) 1.6fr" fun />
}
