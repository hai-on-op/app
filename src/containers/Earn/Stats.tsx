import { useMemo } from 'react'
import { useAccount } from 'wagmi'

import { formatNumberWithStyle } from '~/utils'
import { useStoreActions } from '~/store'
import { useEarnStrategies } from '~/hooks'
import { useBoost } from '~/hooks/useBoost'

import { HaiButton } from '~/styles'
import { RewardsTokenArray } from '~/components/TokenArray'
import { Stats, type StatProps } from '~/components/Stats'
import { Loader } from '~/components/Loader'
import { RefreshCw } from 'react-feather'
import styled from 'styled-components'

const StyledRewardsAPYContainer = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
`

const StyledRewardsAPY = styled.div`
    font-size: 2.2em;
    font-weight: 700;
    text-decoration: line-through;
`

const StyledRewardsAPYWithBoost = styled.div`
    color: #00ac11;
    font-size: 2.2em;
    font-weight: 700;
    margin-left: 8px;
`

export function EarnStats() {
    const { address } = useAccount()

    const { averageAPR, averageWeightedBoost, totalBoostablePosition } = useEarnStrategies()
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)
    const { netBoostValue } = useBoost()
    const netBoostFormatted = `${formatNumberWithStyle(netBoostValue, { minDecimals: 0, maxDecimals: 2 })}x`

    const formattedWeightedAPR = useMemo(() => {
        return formatNumberWithStyle(averageAPR && averageAPR.averageWeightedAPR ? averageAPR.averageWeightedAPR : 0, {
            maxDecimals: 2,
            scalingFactor: 1,
            suffixed: true,
            style: 'percent',
        })
    }, [averageAPR])

    const formattedBoostedAPR = useMemo(() => {
        return formatNumberWithStyle(
            averageAPR && averageAPR.averageWeightedBoostedAPR ? averageAPR.averageWeightedBoostedAPR : 0,
            {
                maxDecimals: 2,
                scalingFactor: 1,
                suffixed: true,
                style: 'percent',
            }
        )
    }, [averageAPR])

    const formattedZeroAPR = useMemo(() => {
        return formatNumberWithStyle(0, {
            maxDecimals: 2,
            scalingFactor: 100,
            suffixed: true,
            style: 'percent',
        })
    }, [])

    const formattedAPR = useMemo(() => {
        if (averageAPR && averageAPR.averageWeightedBoostedAPR && averageAPR.averageWeightedAPR) {
            if (formattedWeightedAPR !== formattedBoostedAPR) {
                return (
                    <StyledRewardsAPYContainer>
                        <StyledRewardsAPY> {formattedWeightedAPR} </StyledRewardsAPY>
                        <StyledRewardsAPYWithBoost>{formattedBoostedAPR}</StyledRewardsAPYWithBoost>
                    </StyledRewardsAPYContainer>
                )
            } else {
                return formattedWeightedAPR
            }
        } else {
            return formattedZeroAPR
        }
    }, [averageAPR, formattedWeightedAPR, formattedBoostedAPR, formattedZeroAPR])

    const dummyStats: StatProps[] = [
        {
            header: formatNumberWithStyle(totalBoostablePosition, {
                maxDecimals: 1,
                suffixed: true,
                style: 'currency',
            }),
            label: 'Value Participating',
            tooltip: 'Total eligible value participating in DAO rewards campaign activities',
        },
        {
            header: isNaN(netBoostValue)
                ? '...'
                : netBoostFormatted,
            label: 'My Net HAI Boost',
            badge: 'BOOST',
            tooltip: 'Your current boost multiplier based on your staked KITE.',
        },
        {
            header: formattedAPR,
            label: 'My Rewards APR',
            tooltip:
                'Current estimated APR of campaign rewards based on current value participating and value of rewards tokens',
        },
        // {
        //     header: formattedAPR,
        //     label: 'My Rewards APR',
        //     tooltip:
        //         'Current estimated APR of campaign rewards based on current value participating and value of rewards tokens',
        // },
        {
            // header: '$0',
            header: <Loader speed={0.5} icon={<RefreshCw />} />,
            headerStatus: <RewardsTokenArray tokens={['OP', 'KITE']} hideLabel />,
            label: 'My Rewards',
            tooltip: 'Incentive allocations are voted on by the DAO on a monthly basis, with rewards distributed daily',
            button: (
                <HaiButton $variant="yellowish" onClick={() => popupsActions.setIsClaimPopupOpen(true)}>
                    Claim
                </HaiButton>
                // <HaiButton title="Claim window is closed" $variant="yellowish" disabled>
                //     Claim
                // </HaiButton>
            ),
        },
        // {
        //     header: '$7,000',
        //     headerStatus: <RewardsTokenArray tokens={['OP', 'KITE']} hideLabel />,
        //     label: 'My Farm Rewards',
        //     tooltip: 'Hello World',
        //     button: (
        //         <HaiButton $variant="yellowish" onClick={() => popupsActions.setIsClaimPopupOpen(true)}>
        //             Claim
        //         </HaiButton>
        //     ),
        // },
    ]

    if (!address) return null

    return <Stats stats={dummyStats} fun />
}
