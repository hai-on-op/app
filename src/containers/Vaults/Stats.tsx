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
        const totalCollateralInUSD = list.reduce((total, { collateralName, collateral }) => {
            const collateralPriceInUSD =
                liquidationData?.collateralLiquidationData[collateralName]?.currentPrice.value || '0'
            return total + parseFloat(collateral) * parseFloat(collateralPriceInUSD)
        }, 0)

        const totalHai = list.reduce((total, { debt }) => {
            return total + parseFloat(debt)
        }, 0)
        const totalDebtInUSD = totalHai * parseFloat(liquidationData?.currentRedemptionPrice || '1')

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
                header: '7.8%',
                label: 'My Net Stability Fee',
                tooltip: 'My Total Debt multiplied by the stability fee rate of Vault.',
            },
            {
                header: '7.8%',
                label: 'My Net Rewards APY',
                tooltip: 'Rewards derived from all campaign activities. See [Here] for more information.',
            },
            {
                header: '$7,000',
                headerStatus: <RewardsTokenPair tokens={['OP', 'KITE']} hideLabel />,
                label: 'My Vault Rewards',
                tooltip: 'Rewards currently voted upon and distributed by DAO approximately once per month.',
                button: (
                    <HaiButton $variant="yellowish" onClick={() => popupsActions.setIsClaimPopupOpen(true)}>
                        Claim
                    </HaiButton>
                ),
            },
        ]
    }, [list, liquidationData, popupsActions])

    if (!list.length) return null

    return <Stats stats={stats} columns="repeat(4, 1fr) 1.6fr" />
}
