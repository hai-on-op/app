import { useMemo } from 'react'

import { formatNumberWithStyle, tokenAssets } from '~/utils'
import { useStoreActions } from '~/store'
import { HaiButton, Text } from '~/styles'
import { RewardsTokenArray } from '~/components/TokenArray'
import { Stats, type StatProps } from '~/components/Stats'
import { Link } from '~/components/Link'
import { Loader } from '~/components/Loader'
// import { RefreshCw } from 'react-feather'
import { useStakingSummary } from '~/hooks/useStakingSummary'
import { useStoreState } from 'easy-peasy'
import { useStakingData } from '~/hooks/useStakingData'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { ethers } from 'ethers'

export function StakeStats() {
    const {
        vaultModel: { liquidationData },
        // popupsModel: { isStakeClaimPopupOpen },
    } = useStoreState((state) => state)
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)
    const { loading, totalStaked, myStaked, myShare, boost, stakingData } = useStakingSummary()

    const { userRewards } = useStakingData()

    // const [claiming, setClaiming] = useState(false)

    const { prices: veloPrices } = useVelodromePrices()

    const haiPrice = parseFloat(liquidationData?.currentRedemptionPrice || '1')
    const kitePrice = veloPrices?.KITE.raw
    const opPrice = liquidationData?.collateralLiquidationData?.OP?.currentPrice.value

    const HAI_ADDRESS = import.meta.env.VITE_HAI_ADDRESS
    const KITE_ADDRESS = import.meta.env.VITE_KITE_ADDRESS
    const OP_ADDRESS = import.meta.env.VITE_OP_ADDRESS

    const rewardsDataMap = {
        [HAI_ADDRESS]: {
            id: 0,
            name: tokenAssets.HAI.symbol,
            tokenImg: tokenAssets.HAI.icon,
            price: haiPrice,
        },
        [KITE_ADDRESS]: {
            id: 1,
            name: tokenAssets.KITE.symbol,
            tokenImg: tokenAssets.KITE.icon,
            price: kitePrice,
        },
        [OP_ADDRESS]: {
            id: 2,
            name: tokenAssets.OP.symbol,
            tokenImg: tokenAssets.OP.icon,
            price: opPrice,
        },
    }

    const stats: StatProps[] = useMemo(() => {
        if (loading) {
            return Array(5).fill({
                header: <Loader size={24} />,
                label: '',
            })
        }

        return [
            {
                header: totalStaked.usdValueFormatted,
                label: 'Staking TVL',
                tooltip: (
                    <span>
                        Total Value Locked (TVL) represents the total amount of KITE tokens staked in the protocol.
                    </span>
                ),
            },
            {
                header: myStaked.effectiveAmountFormatted,
                label: 'My KITE Staked',
                tooltip: (
                    <span>
                        The amount of KITE tokens you have staked in the protocol. Staked KITE (stKITE) provides boosted
                        rewards.
                    </span>
                ),
            },
            {
                header: myShare.percentage,
                label: 'My stKITE Share',
                tooltip: (
                    <span>
                        Your percentage share of the total staked KITE supply. This determines your proportional share
                        of staking rewards.
                    </span>
                ),
            },
            {
                header: isNaN(boost.netBoostValue) ? '...' : boost.netBoostFormatted,
                label: 'My Net Boost',
                tooltip: (
                    <Text>
                        Your current boost multiplier based on your staked KITE. Check out the{' '}
                        <Link href="/earn">earn page</Link> for more information.
                    </Text>
                ),
            },
            {
                header: formatNumberWithStyle(
                    userRewards.reduce((acc, reward) => {
                        const amount = parseFloat(ethers.utils.formatEther(reward.amount))
                        const price = rewardsDataMap[reward.tokenAddress as any].price as number
                        return acc + amount * price
                    }, 0),
                    { style: 'currency', minDecimals: 0, maxDecimals: 2 }
                ) /*stakingData.pendingWithdrawal ? (
                    formatNumberWithStyle(Number(stakingData.pendingWithdrawal.amount), {
                        minDecimals: 0,
                        maxDecimals: 2,
                    })
                ) : (
                    <Loader speed={0.5} icon={<RefreshCw />} />
                )*/,
                headerStatus: <RewardsTokenArray tokens={['HAI', 'KITE', 'OP']} hideLabel />,
                label: 'My Staking Rewards',
                tooltip: 'Claim your staking rewards. Unclaimed rewards will accrue below and do not expire.',
                button: (
                    <HaiButton $variant="yellowish" onClick={() => popupsActions.setIsStakeClaimPopupOpen(true)}>
                        Claim
                    </HaiButton>
                ),
            },
        ]
    }, [loading, totalStaked, myStaked, myShare, boost, stakingData, popupsActions])

    return <Stats stats={stats} columns="repeat(4, 1fr) 1.6fr" fun />
}
