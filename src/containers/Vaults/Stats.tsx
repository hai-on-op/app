import { useMemo } from 'react'

import { formatNumberWithStyle } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'

import { Flex, HaiButton, Text } from '~/styles'
import { RewardsTokenPair } from '~/components/TokenPair'
import { Stats, type StatProps } from '~/components/Stats'

export function BorrowStats() {
    const {
        vaultModel: { list, liquidationData },
    } = useStoreState((state) => state)
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)

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

        // TODO: dynamically calculate apy, hook up rewards
        return [
            {
                header: totalCollateralInUSD
                    ? formatNumberWithStyle(totalCollateralInUSD.toString(), {
                          style: 'currency',
                          maxDecimals: 0,
                          suffixed: true,
                      })
                    : '--',
                label: 'My Locked Collateral',
                tooltip:
                    'Summation of the total amount of a given collateral locked in your vaults multiplied by the protocol oracle price of that collateral.',
            },
            {
                header: (
                    <Flex $justify="flex-start" $align="center" $gap={8}>
                        <Text>
                            {totalDebtInUSD
                                ? formatNumberWithStyle(totalDebtInUSD.toString(), {
                                      style: 'currency',
                                      maxDecimals: 0,
                                      suffixed: true,
                                  })
                                : '--'}
                        </Text>
                        <Text $fontSize="0.5em" $fontWeight={400} $color="rgba(0,0,0,0.6)">
                            {totalHai
                                ? formatNumberWithStyle(totalHai.toString(), {
                                      maxDecimals: 2,
                                      suffixed: true,
                                  })
                                : '--'}{' '}
                            HAI
                        </Text>
                    </Flex>
                ),
                label: 'My Total Debt',
                tooltip: 'The total amount of minted debt tokens multiplied by the protocol redemption price of debt.',
            },
            {
                header: formatNumberWithStyle(weightedStabilityFeeAverage, { style: 'percent' }),
                label: 'My Net Stability Fee',
                tooltip: 'My Total Debt multiplied by the stability fee rate of Vault.',
            },
            {
                header: '7.8%',
                label: 'My Net Rewards APY',
                // TODO: fill in [Here]
                tooltip: 'Rewards derived from all campaign activities. See [Here] for more information.',
            },
            {
                header: '$--',
                headerStatus: <RewardsTokenPair tokens={['OP', 'KITE']} hideLabel />,
                label: 'My Vault Rewards',
                tooltip: 'Rewards currently voted upon and distributed by DAO approximately once per month.',
                button: (
                    // <HaiButton $variant="yellowish" onClick={() => popupsActions.setIsClaimPopupOpen(true)}>
                    //     Claim
                    // </HaiButton>
                    <HaiButton title="Claim window is closed" $variant="yellowish" disabled>
                        Claim
                    </HaiButton>
                ),
            },
        ]
    }, [list, liquidationData, popupsActions])

    if (!list.length) return null

    return <Stats stats={stats} columns="repeat(4, 1fr) 1.6fr" />
}
