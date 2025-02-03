import { useMemo } from 'react'

import { formatNumberWithStyle } from '~/utils'
import { useStoreActions } from '~/store'
import { HaiButton, Text } from '~/styles'
import { RewardsTokenArray } from '~/components/TokenArray'
import { Stats, type StatProps } from '~/components/Stats'
import { Link } from '~/components/Link'
import { Loader } from '~/components/Loader'
import { RefreshCw } from 'react-feather'
import { useStakingData } from '~/hooks/useStakingData'

export function StakeStats() {
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)
    const { stakingData, stakingStats, loading } = useStakingData()

    const kitePrice = 10.0 // TODO: Get real KITE price from somewhere

    const stats: StatProps[] = useMemo(() => {
        const totalStakedUSD = Number(stakingStats.totalStaked) * kitePrice
        const myStakedUSD = Number(stakingData.stakedBalance) * kitePrice
        const myShare = stakingStats.totalStaked !== '0' 
            ? (Number(stakingData.stakedBalance) / Number(stakingStats.totalStaked)) * 100 
            : 0
        const myBoost = 1.69 // TODO: Calculate real boost

        if (loading) {
            return Array(5).fill({
                header: <Loader size={24} />,
                label: '',
            })
        }

        return [
            {
                header: formatNumberWithStyle(totalStakedUSD, {
                    minDecimals: 0,
                    maxDecimals: 0,
                    style: 'currency',
                }),
                label: 'Staking TVL',
                tooltip: (
                    <span>
                        Total Value Locked (TVL) represents the total amount of KITE tokens staked in the protocol.
                    </span>
                ),
            },
            {
                header: formatNumberWithStyle(Number(stakingData.stakedBalance), {
                    minDecimals: 2,
                    maxDecimals: 2,
                }),
                label: 'My KITE Staked',
                tooltip: (
                    <span>
                        The amount of KITE tokens you have staked in the protocol. Staked KITE (sKITE) provides
                        boosted rewards and governance rights.
                    </span>
                ),
            },
            {
                header: formatNumberWithStyle(myShare, {
                    minDecimals: 2,
                    maxDecimals: 2,
                    style: 'percent',
                    scalingFactor: 0.01,
                }),
                label: 'My sKITE Share',
                tooltip: (
                    <span>
                        Your percentage share of the total staked KITE supply. This determines your proportional
                        share of staking rewards and voting power.
                    </span>
                ),
            },
            {
                header: `${formatNumberWithStyle(myBoost, {
                    minDecimals: 2,
                    maxDecimals: 2,
                })}x`,
                label: 'My Net HAI Boost',
                tooltip: (
                    <Text>
                        Your current HAI boost multiplier based on your staked KITE. Check out the{' '}
                        <Link href="/earn">earn page</Link> for more information.
                    </Text>
                ),
            },
            {
                header: stakingData.pendingWithdrawal ? (
                    formatNumberWithStyle(Number(stakingData.pendingWithdrawal.amount), {
                        minDecimals: 2,
                        maxDecimals: 2,
                    })
                ) : (
                    <Loader speed={0.5} icon={<RefreshCw />} />
                ),
                headerStatus: <RewardsTokenArray tokens={['OP', 'KITE']} hideLabel />,
                label: 'My Staking Rewards',
                tooltip: 'Rewards currently voted upon and distributed by DAO approximately once per month.',
                button: (
                    <HaiButton 
                        $variant="yellowish" 
                        onClick={() => popupsActions.setIsStakeClaimPopupOpen(true)}
                        disabled={!stakingData.pendingWithdrawal || stakingData.pendingWithdrawal.status !== 'COMPLETED'}
                    >
                        Claim
                    </HaiButton>
                ),
            },
        ]
    }, [stakingData, stakingStats, loading, kitePrice, popupsActions])

    return <Stats stats={stats} columns="repeat(4, 1fr) 1.6fr" fun />
}
