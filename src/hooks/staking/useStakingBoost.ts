import { useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useBoost } from '~/hooks/useBoost'
import { calculateLPBoost } from '~/services/boostService'
import { useStakeAccount } from '~/hooks/staking/useStakeAccount'
import { useStakeStats } from '~/hooks/staking/useStakeStats'
import type { StakingConfig } from '~/types/stakingConfig'
import { kiteConfig } from '~/staking/configs/kite'
import { buildStakingService } from '~/services/stakingService'

type StakingBoostResult = {
    loading: boolean
    netBoostValue: number
    lpBoostValue: number
    hvBoost: number
    haiMintingBoost: number
    haiMintingPositionValue: number
    haiVeloPositionValue: string | number
    userLPPositionValue: string | number
    userTotalValue: number
    simulateNetBoost: (userAfterStakingAmount: number, totalAfterStakingAmount: number) => number
}

export function useStakingBoost(config?: StakingConfig): StakingBoostResult {
    const isKitePool = !config || config.namespace === 'kite'

    // KITE staking (existing aggregated boost behaviour)
    if (isKitePool) {
        const {
            userLPPositionValue,
            lpBoostValue,
            userTotalValue,
            hvBoost,
            haiMintingBoost,
            haiMintingPositionValue,
            simulateNetBoost,
            netBoostValue,
            haiVeloPositionValue,
            loading,
        } = useBoost()

        return {
            loading,
            netBoostValue,
            lpBoostValue,
            hvBoost,
            haiMintingBoost,
            haiMintingPositionValue,
            haiVeloPositionValue,
            userLPPositionValue,
            userTotalValue,
            simulateNetBoost,
        }
    }

    // LP staking boost – per‑pool, using KITE stake vs LP stake
    const { address } = useAccount()

    const kiteService = useMemo(
        () => buildStakingService(kiteConfig.addresses.manager as any, undefined, kiteConfig.decimals),
        []
    )

    const lpService = useMemo(
        () =>
            buildStakingService(
                config.addresses.manager as any,
                undefined,
                config.decimals
            ),
        [config.addresses.manager, config.decimals]
    )

    // Global KITE staking data
    const {
        data: kiteAccount,
        isLoading: kiteAccountLoading,
    } = useStakeAccount(address as any, kiteConfig.namespace, kiteService)
    const {
        data: kiteStats,
        isLoading: kiteStatsLoading,
    } = useStakeStats(kiteConfig.namespace, kiteService)

    // This LP staking pool data
    const {
        data: lpAccount,
        isLoading: lpAccountLoading,
    } = useStakeAccount(address as any, config.namespace, lpService)
    const {
        data: lpStats,
        isLoading: lpStatsLoading,
    } = useStakeStats(config.namespace, lpService)

    const loading = kiteAccountLoading || kiteStatsLoading || lpAccountLoading || lpStatsLoading

    const { lpBoost, userLPPositionValue } = useMemo(() => {
        if (loading) {
            return { lpBoost: 1, userLPPositionValue: '0' }
        }

        const userStakingAmount = Number(kiteAccount?.stakedBalance || 0)
        const totalStakingAmount = Number(kiteStats?.totalStaked || 0)
        const userLPPosition = lpAccount?.stakedBalance || '0'
        const totalPoolLiquidity = lpStats?.totalStaked || '0'

        const res = calculateLPBoost({
            userStakingAmount,
            totalStakingAmount,
            userLPPosition,
            totalPoolLiquidity,
        })

        return {
            lpBoost: res.lpBoost ?? 1,
            userLPPositionValue: userLPPosition,
        }
    }, [
        loading,
        kiteAccount?.stakedBalance,
        kiteStats?.totalStaked,
        lpAccount?.stakedBalance,
        lpStats?.totalStaked,
    ])

    const simulateNetBoost = useCallback(
        (userAfterStakingAmount: number, totalAfterStakingAmount: number) => {
            const userStakingAmount = Number(kiteAccount?.stakedBalance || 0)
            const totalStakingAmount = Number(kiteStats?.totalStaked || 0)

            const res = calculateLPBoost({
                userStakingAmount,
                totalStakingAmount,
                userLPPosition: userAfterStakingAmount,
                totalPoolLiquidity: totalAfterStakingAmount,
            })

            return res.lpBoost ?? 1
        },
        [kiteAccount?.stakedBalance, kiteStats?.totalStaked]
    )

    return {
        loading,
        netBoostValue: lpBoost,
        lpBoostValue: lpBoost,
        hvBoost: 1,
        haiMintingBoost: 1,
        haiMintingPositionValue: 0,
        haiVeloPositionValue: 0,
        userLPPositionValue,
        userTotalValue: 0,
        simulateNetBoost,
    }
}


