import { useMemo } from 'react'

import { formatNumberWithStyle, tokenAssets } from '~/utils'
import { useStoreActions } from '~/store'
import { HaiButton, Text } from '~/styles'
import { RewardsTokenArray } from '~/components/TokenArray'
import { Stats, type StatProps } from '~/components/Stats'
import { Link } from '~/components/Link'
import { Loader } from '~/components/Loader'
// import { RefreshCw } from 'react-feather'
import { useAccount } from 'wagmi'
import { useStakingSummaryV2 } from '~/hooks/staking/useStakingSummaryV2'
import { useStoreState } from 'easy-peasy'
import { useStakingData } from '~/hooks/useStakingData'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { ethers } from 'ethers'
import type { StakingConfig } from '~/types/stakingConfig'

export function StakeStats({ config }: { config?: StakingConfig }) {
    const { address } = useAccount()
    const {
        vaultModel: { liquidationData },
        // popupsModel: { isStakeClaimPopupOpen },
    } = useStoreState((state) => state)
    const { popupsModel: popupsActions } = useStoreActions((actions) => actions)

    // Use config-aware staking summary so LP pools get correct pricing/TVL
    const { loading, totalStaked, myStaked, myShare, boost } = useStakingSummaryV2(address as any, config)

    // Staking context may be temporarily undefined during route transitions; guard defensively.
    const stakingCtx = useStakingData()
    const userRewards = Array.isArray(stakingCtx?.userRewards) ? stakingCtx!.userRewards : []

    const { prices: veloPrices } = useVelodromePrices()

    const haiPrice = parseFloat(liquidationData?.currentRedemptionPrice || '1')
    const kitePrice = veloPrices?.KITE.raw
    const opPrice = liquidationData?.collateralLiquidationData?.OP?.currentPrice.value

    const HAI_ADDRESS = import.meta.env.VITE_HAI_ADDRESS
    const KITE_ADDRESS = import.meta.env.VITE_KITE_ADDRESS
    const OP_ADDRESS = import.meta.env.VITE_OP_ADDRESS

    const rewardsDataMap: Record<string, { id: number; name: string; tokenImg: string; price: number | undefined }> = {
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

    const tokenLabel = config?.labels.token ?? 'KITE'
    const stTokenLabel = config?.labels.stToken ?? 'stKITE'
    const isKitePool = !config || config.namespace === 'kite'

    const stats: StatProps[] = useMemo(() => {
        if (loading) {
            // While loading, keep layout stable: 5 slots for KITE, 4 for LP pools
            const skeletonCount = isKitePool ? 5 : 4
            return Array(skeletonCount).fill({
                header: <Loader size={24} />,
                label: '',
            })
        }

        const base: StatProps[] = [
            {
                header: totalStaked.usdValueFormatted,
                label: 'Staking TVL',
                tooltip: (
                    <span>
                        Total Value Locked (TVL) represents the total amount of {tokenLabel} tokens staked in this pool.
                    </span>
                ),
            },
            {
                header: myStaked.effectiveAmountFormatted,
                label: `My ${tokenLabel} Staked`,
                tooltip: (
                    <span>
                        The amount of {tokenLabel} tokens you have staked in this pool. Staked {tokenLabel} (
                        {stTokenLabel}) provides boosted rewards.
                    </span>
                ),
            },
            {
                header: myShare.percentage,
                label: `My ${stTokenLabel} Share`,
                tooltip: (
                    <span>
                        Your percentage share of the total staked {tokenLabel} supply. This determines your proportional
                        share of staking rewards.
                    </span>
                ),
            },
        ]

        const hasKiteRewards = isKitePool && Array.isArray(userRewards) && userRewards.length > 0

        const rewardsRow: StatProps | null =
            hasKiteRewards
                ? {
                      header: formatNumberWithStyle(
                          userRewards.reduce(
                              (
                                  acc: number,
                                  reward: {
                                      amount: ethers.BigNumber
                                      tokenAddress: string
                                  }
                              ) => {
                                  const amount = parseFloat(ethers.utils.formatEther(reward.amount))
                                  const rewardMeta = rewardsDataMap[
                                      reward.tokenAddress as keyof typeof rewardsDataMap
                                  ]
                                  const rawPrice = rewardMeta?.price as unknown
                                  const price =
                                      typeof rawPrice === 'number'
                                          ? rawPrice
                                          : typeof rawPrice === 'string'
                                              ? Number(rawPrice)
                                              : 0
                                  return acc + amount * price
                              },
                              0
                          ),
                          { style: 'currency', minDecimals: 0, maxDecimals: 2 }
                      ),
                      headerStatus: <RewardsTokenArray tokens={['HAI', 'KITE', 'OP']} hideLabel />,
                      label: 'My Staking Rewards',
                      tooltip:
                          'Claim your staking rewards. Unclaimed rewards will accrue below and do not expire.',
                      button: (
                          <HaiButton
                              $variant="yellowish"
                              onClick={() => popupsActions.setIsStakeClaimPopupOpen(true)}
                          >
                              Claim
                          </HaiButton>
                      ),
                  }
                : null

        const boostTooltip = isKitePool ? (
            <Text>
                Your current boost multiplier based on your staked KITE. Check out the{' '}
                <Link href="/earn">earn page</Link> for more information.
            </Text>
        ) : (
            <Text>
                Your current boost multiplier for this LP pool, determined by your KITE staking share versus your{' '}
                {tokenLabel} LP position. Check out the <Link href="/earn">earn page</Link> for more information.
            </Text>
        )

        const boostRow: StatProps = {
            header: Number.isNaN(boost.netBoostValue) ? '...' : boost.netBoostFormatted,
            label: 'My Net Boost',
            tooltip: boostTooltip,
        }

        if (config?.affectsBoost === false) {
            // No boost row – just base stats (plus rewards for KITE pool)
            return rewardsRow && isKitePool ? [...base, rewardsRow] : base
        }

        // With boost row: insert it before rewards for KITE, or as the last row for LP pools
        if (isKitePool) {
            const rowsWithBoost = [...base.slice(0, 3), boostRow]
            return rewardsRow ? [...rowsWithBoost, rewardsRow] : rowsWithBoost
        }

        // LP pools: TVL, my LP staked, my share, net boost (no global KITE rewards row)
        return [...base, boostRow]
    }, [
        loading,
        totalStaked.usdValueFormatted,
        myStaked.effectiveAmountFormatted,
        myShare.percentage,
        boost.netBoostValue,
        boost.netBoostFormatted,
        config?.affectsBoost,
        isKitePool,
        tokenLabel,
        stTokenLabel,
        popupsActions,
        userRewards,
    ])

    const columns = isKitePool ? 'repeat(4, 1fr) 1.6fr' : 'repeat(4, 1fr)'

    return <Stats stats={stats} columns={columns} fun />
}
