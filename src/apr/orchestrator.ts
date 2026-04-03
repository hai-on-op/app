import type { AprInputs, StrategyAprResult, PositionToken, RewardToken } from './types'
import { calculateHaiHoldApr } from './calculators/haiHold'
import { calculateHaiVeloDepositApr } from './calculators/haiVeloDeposit'
import { calculateHaiAeroDepositApr } from './calculators/haiAeroDeposit'
import { calculateKiteStakingApr } from './calculators/kiteStaking'
import { calculateVaultBorrowApr } from './calculators/vaultBorrow'
import { calculateCurveLpStakingApr } from './calculators/curveLpStaking'
import { calculateVelodromeLpStakingApr } from './calculators/velodromeLpStaking'
import { calculateVelodromeFarmApr } from './calculators/velodromeFarm'
import { calculateHaiRewardShare } from '~/services/velodromePoolApr'
import { VELO_POOLS, stringsExistAndAreEqual, tokenAssets } from '~/utils'
import { formatUnits } from 'ethers/lib/utils'
import { RewardsModel } from '~/model/rewardsModel'

function sumMapping(mapping: Record<string, string>): number {
    return Object.values(mapping).reduce((acc, v) => acc + Number(v), 0)
}

function userAmountFromMapping(mapping: Record<string, string>, address?: string): number {
    if (!address) return 0
    return Number(mapping[address.toLowerCase()] || 0)
}

/**
 * Pure function that computes all strategy APRs.
 *
 * Phase 1: Compute all TVLs (resolves circular dependency)
 * Phase 2: Compute reward sharing ratios
 * Phase 3: Compute all APRs + position/reward token details
 */
export function computeAllAprs(inputs: AprInputs): Record<string, StrategyAprResult> {
    const results: Record<string, StrategyAprResult> = {}
    const { prices } = inputs

    // ==================== PHASE 1: TVL COMPUTATION ====================
    const totalHaiVeloQty = sumMapping(inputs.haiVeloCollateralMapping)
    const totalHaiAeroQty = sumMapping(inputs.haiAeroCollateralMapping)
    const haiVeloDepositTvl = totalHaiVeloQty * inputs.haiVeloPrice
    const haiAeroDepositTvl = totalHaiAeroQty * inputs.haiAeroPrice
    const haiBoldLpStakedTvl = inputs.haiBoldLp.totalStakedLp * inputs.haiBoldLp.lpPriceUsd
    const haiVeloVeloLpStakedTvl = inputs.haiVeloVeloLp.totalStakedLp * inputs.haiVeloVeloLp.lpPriceUsd

    // ==================== PHASE 2: REWARD SHARING ====================
    const { lpShare, haiVeloShare } = calculateHaiRewardShare({
        lpStakedTvlUsd: haiVeloVeloLpStakedTvl,
        haiVeloDepositTvlUsd: haiVeloDepositTvl,
    })

    const haiVeloDailyHaiReward = inputs.weeklyHaiRewardForHaiVelo / 7
    const haiAeroDailyHaiReward = inputs.weeklyHaiRewardForHaiAero / 7

    // Trading fee APR and HAI rewards APR come pre-computed from useLpStakingApr
    // (the same hook the Earn page uses). No need to recalculate here.
    const velodromeLpTradingFeeApr = inputs.haiVeloVeloLp.tradingFeeApr
    const velodromeLpHaiRewardsApr = inputs.haiVeloVeloLp.haiRewardsApr

    // ==================== PHASE 3: APR + TOKEN DETAILS ====================

    // --- Strategy 1: HAI Hold ---
    const haiHold = calculateHaiHoldApr({
        redemptionRateAnnualized: inputs.redemptionRateAnnualized,
        coinTotalSupply: inputs.erc20CoinTotalSupply,
        haiPrice: prices.hai,
        userHaiBalance: inputs.userHaiBalance,
    })
    results['hai-hold'] = {
        id: 'hai-hold',
        type: 'hold',
        pair: ['HAI'],
        baseApr: haiHold.baseApr,
        components: haiHold.components,
        boost: null,
        effectiveApr: haiHold.baseApr,
        tvl: haiHold.tvl,
        userPosition: haiHold.userPosition,
        rewards: [],
        positionTokens: [
            {
                symbol: 'HAI',
                totalAmount: inputs.erc20CoinTotalSupply,
                userAmount: inputs.userHaiBalance,
                priceUsd: prices.hai,
                totalValueUsd: inputs.erc20CoinTotalSupply * prices.hai,
                userValueUsd: inputs.userHaiBalance * prices.hai,
            },
        ],
        rewardTokens: [], // redemption rate doesn't have a reward token
        loading: false,
    }

    // --- Strategy 2: haiVELO Deposit ---
    const userHaiVeloQty = userAmountFromMapping(inputs.haiVeloCollateralMapping, inputs.userAddress)
    const haiVeloDepositDailyHai = haiVeloDailyHaiReward * (haiVeloShare || 1)
    const haiVelo = calculateHaiVeloDepositApr({
        mapping: inputs.haiVeloCollateralMapping,
        boostMap: inputs.haiVeloBoostMap,
        haiVeloPrice: inputs.haiVeloPrice,
        haiPrice: prices.hai,
        weeklyHaiReward: inputs.weeklyHaiRewardForHaiVelo,
        haiVeloDepositTvl,
        haiVeloVeloLpStakedTvl,
        userAddress: inputs.userAddress,
    })
    results['haivelo-deposit'] = {
        id: 'haivelo-deposit',
        type: 'deposit',
        pair: ['HAIVELO'],
        baseApr: haiVelo.baseApr,
        components: haiVelo.components,
        boost: haiVelo.boost,
        effectiveApr: haiVelo.boost?.boostedApr ?? haiVelo.baseApr,
        tvl: haiVelo.tvl,
        userPosition: haiVelo.userPosition,
        rewards: [{ token: 'HAI', emission: 0 }],
        positionTokens: [
            {
                symbol: 'haiVELO',
                totalAmount: totalHaiVeloQty,
                userAmount: userHaiVeloQty,
                priceUsd: inputs.haiVeloPrice,
                totalValueUsd: haiVeloDepositTvl,
                userValueUsd: userHaiVeloQty * inputs.haiVeloPrice,
            },
        ],
        rewardTokens: [
            {
                symbol: 'HAI',
                dailyEmission: haiVeloDepositDailyHai,
                priceUsd: prices.hai,
                dailyValueUsd: haiVeloDepositDailyHai * prices.hai,
                annualValueUsd: haiVeloDepositDailyHai * prices.hai * 365,
            },
        ],
        loading: false,
    }

    // --- Strategy 3: haiAERO Deposit ---
    const userHaiAeroQty = userAmountFromMapping(inputs.haiAeroCollateralMapping, inputs.userAddress)
    const haiAero = calculateHaiAeroDepositApr({
        mapping: inputs.haiAeroCollateralMapping,
        boostMap: inputs.haiAeroBoostMap,
        haiAeroPrice: inputs.haiAeroPrice,
        haiPrice: prices.hai,
        weeklyHaiReward: inputs.weeklyHaiRewardForHaiAero,
        userAddress: inputs.userAddress,
    })
    results['haiaero-deposit'] = {
        id: 'haiaero-deposit',
        type: 'deposit',
        pair: ['HAIAERO'],
        baseApr: haiAero.baseApr,
        components: haiAero.components,
        boost: haiAero.boost,
        effectiveApr: haiAero.boost?.boostedApr ?? haiAero.baseApr,
        tvl: haiAero.tvl,
        userPosition: haiAero.userPosition,
        rewards: [{ token: 'HAI', emission: 0 }],
        positionTokens: [
            {
                symbol: 'haiAERO',
                totalAmount: totalHaiAeroQty,
                userAmount: userHaiAeroQty,
                priceUsd: inputs.haiAeroPrice,
                totalValueUsd: haiAeroDepositTvl,
                userValueUsd: userHaiAeroQty * inputs.haiAeroPrice,
            },
        ],
        rewardTokens: [
            {
                symbol: 'HAI',
                dailyEmission: haiAeroDailyHaiReward,
                priceUsd: prices.hai,
                dailyValueUsd: haiAeroDailyHaiReward * prices.hai,
                annualValueUsd: haiAeroDailyHaiReward * prices.hai * 365,
            },
        ],
        loading: false,
    }

    // --- Strategy 4: KITE Staking ---
    const kite = calculateKiteStakingApr({
        rewardRates: inputs.stakingRewardRates,
        tokenPricesByAddress: inputs.tokenPricesByAddress,
        totalKiteStaked: inputs.totalKiteStaked,
        kitePrice: prices.kite,
        userKiteStaked: inputs.userKiteStaked,
    })
    // Build reward tokens from staking reward rates
    const kiteRewardTokens: RewardToken[] = (inputs.stakingRewardRates || [])
        .filter((r) => {
            const price = inputs.tokenPricesByAddress[r.rpToken] || 0
            return price > 0
        })
        .map((r) => {
            const price = inputs.tokenPricesByAddress[r.rpToken] || 0
            const dailyEmission = Number(r.rpRate.toString()) * 86400 / 1e18
            return {
                symbol: r.rpToken.slice(0, 6) + '...',
                dailyEmission,
                priceUsd: price,
                dailyValueUsd: dailyEmission * price,
                annualValueUsd: dailyEmission * price * 365,
            }
        })
    results['kite-staking'] = {
        id: 'kite-staking',
        type: 'stake',
        pair: ['KITE'],
        baseApr: kite.baseApr,
        components: kite.components,
        boost: null,
        effectiveApr: kite.baseApr,
        tvl: kite.tvl,
        userPosition: kite.userPosition,
        rewards: [],
        positionTokens: [
            {
                symbol: 'KITE',
                totalAmount: inputs.totalKiteStaked,
                userAmount: inputs.userKiteStaked,
                priceUsd: prices.kite,
                totalValueUsd: inputs.totalKiteStaked * prices.kite,
                userValueUsd: inputs.userKiteStaked * prices.kite,
            },
        ],
        rewardTokens: kiteRewardTokens,
        loading: false,
    }

    // --- Strategy 5: Vault/Borrow (per collateral type) ---
    const collateralsWithRewards = inputs.collateralTypes.filter((cType) => {
        const rewards = inputs.vaultRewards[cType.id]
        return rewards && Object.values(rewards).some((v) => v !== 0)
    })

    for (const cType of collateralsWithRewards) {
        const vaultData = inputs.minterVaults[cType.id]
        if (!vaultData) continue

        const rewards = inputs.vaultRewards[cType.id] || { KITE: 0, OP: 0 }
        const userPositionDebt = inputs.userAddress
            ? Number(vaultData.userDebtMapping[inputs.userAddress.toLowerCase()] || 0)
            : 0
        const totalMinted = parseFloat(vaultData.totalMinted || '0')

        const vaultWithStaking = calculateVaultBorrowApr({
            collateralId: cType.id,
            userDebtMapping: vaultData.userDebtMapping,
            totalMinted: vaultData.totalMinted,
            dailyKiteReward: rewards.KITE || 0,
            kitePrice: prices.kite,
            haiPrice: prices.hai,
            usersStakingData: (inputs as any)._usersStakingData || {},
            totalKiteStaked: inputs.totalKiteStaked,
            userAddress: inputs.userAddress,
            userPositionDebt,
        })

        const assets = tokenAssets[cType.id as keyof typeof tokenAssets]
        const vaultRewardTokens: RewardToken[] = []
        if (rewards.KITE > 0) {
            vaultRewardTokens.push({
                symbol: 'KITE',
                dailyEmission: rewards.KITE,
                priceUsd: prices.kite,
                dailyValueUsd: rewards.KITE * prices.kite,
                annualValueUsd: rewards.KITE * prices.kite * 365,
            })
        }
        if (rewards.OP > 0) {
            vaultRewardTokens.push({
                symbol: 'OP',
                dailyEmission: rewards.OP,
                priceUsd: prices.op,
                dailyValueUsd: rewards.OP * prices.op,
                annualValueUsd: rewards.OP * prices.op * 365,
            })
        }

        // Net APR: blends underlying collateral yield + minting incentives - stability fee
        // Assumes 200% collateral ratio (same as vault manage page fallback)
        const underlyingApr = inputs.underlyingAprs[cType.id] || 0
        const stabilityFee = inputs.stabilityFees[cType.id] || 0
        const effectiveIncentivesApr = vaultWithStaking.boost?.boostedApr ?? vaultWithStaking.baseApr
        const assumedCR = 2.0 // 200% collateral ratio
        const collateralYield = assumedCR * underlyingApr
        const debtNetYield = effectiveIncentivesApr - stabilityFee
        const netApr = (collateralYield + debtNetYield) / (assumedCR + 1)

        results[`vault-${cType.id}`] = {
            id: `vault-${cType.id}`,
            type: 'borrow',
            pair: [assets?.symbol || cType.id],
            baseApr: vaultWithStaking.baseApr,
            components: vaultWithStaking.components,
            boost: vaultWithStaking.boost,
            effectiveApr: netApr,
            tvl: vaultWithStaking.tvl,
            userPosition: vaultWithStaking.userPosition,
            rewards: Object.entries(rewards)
                .filter(([, v]) => v > 0)
                .map(([token, emission]) => ({ token, emission })),
            positionTokens: [
                {
                    symbol: 'HAI (debt)',
                    totalAmount: totalMinted,
                    userAmount: userPositionDebt,
                    priceUsd: prices.hai,
                    totalValueUsd: totalMinted * prices.hai,
                    userValueUsd: userPositionDebt * prices.hai,
                },
            ],
            rewardTokens: vaultRewardTokens,
            netApr,
            underlyingApr,
            stabilityFee,
            loading: false,
        }
    }

    // --- Strategy 6: HAI-BOLD Curve LP Staking ---
    const curveLp = calculateCurveLpStakingApr({
        curveVApy: inputs.haiBoldLp.curveVApy,
        dailyKiteReward: inputs.haiBoldLp.dailyKiteReward,
        kitePrice: prices.kite,
        totalStakedLp: inputs.haiBoldLp.totalStakedLp,
        userStakedLp: inputs.haiBoldLp.userStakedLp,
        lpPriceUsd: inputs.haiBoldLp.lpPriceUsd,
        userKiteStaked: inputs.userKiteStaked,
        totalKiteStaked: inputs.totalKiteStaked,
    })
    results['haibold-curve-lp'] = {
        id: 'haibold-curve-lp',
        type: 'stake',
        pair: ['HAI', 'BOLD'],
        baseApr: curveLp.baseApr,
        components: curveLp.components,
        boost: curveLp.boost,
        effectiveApr: curveLp.boost?.boostedApr ?? curveLp.baseApr,
        tvl: curveLp.tvl,
        userPosition: curveLp.userPosition,
        rewards: [{ token: 'KITE', emission: inputs.haiBoldLp.dailyKiteReward }],
        positionTokens: [
            {
                symbol: 'HAI/BOLD LP',
                totalAmount: inputs.haiBoldLp.totalStakedLp,
                userAmount: inputs.haiBoldLp.userStakedLp,
                priceUsd: inputs.haiBoldLp.lpPriceUsd,
                totalValueUsd: haiBoldLpStakedTvl,
                userValueUsd: inputs.haiBoldLp.userStakedLp * inputs.haiBoldLp.lpPriceUsd,
            },
        ],
        rewardTokens: [
            {
                symbol: 'KITE',
                dailyEmission: inputs.haiBoldLp.dailyKiteReward,
                priceUsd: prices.kite,
                dailyValueUsd: inputs.haiBoldLp.dailyKiteReward * prices.kite,
                annualValueUsd: inputs.haiBoldLp.dailyKiteReward * prices.kite * 365,
            },
        ],
        loading: false,
    }

    // --- Strategy 7: haiVELO/VELO Velodrome LP Staking ---
    const lpDailyHaiReward = haiVeloDailyHaiReward * lpShare
    const veloLp = calculateVelodromeLpStakingApr({
        tradingFeeApr: velodromeLpTradingFeeApr,
        haiRewardsApr: velodromeLpHaiRewardsApr,
        dailyKiteReward: inputs.haiVeloVeloLp.dailyKiteReward,
        kitePrice: prices.kite,
        totalStakedLp: inputs.haiVeloVeloLp.totalStakedLp,
        userStakedLp: inputs.haiVeloVeloLp.userStakedLp,
        lpPriceUsd: inputs.haiVeloVeloLp.lpPriceUsd,
        userKiteStaked: inputs.userKiteStaked,
        totalKiteStaked: inputs.totalKiteStaked,
    })
    results['haivelo-velo-lp'] = {
        id: 'haivelo-velo-lp',
        type: 'stake',
        pair: ['HAIVELO', 'VELO'],
        baseApr: veloLp.baseApr,
        components: veloLp.components,
        boost: veloLp.boost,
        effectiveApr: veloLp.boost?.boostedApr ?? veloLp.baseApr,
        tvl: veloLp.tvl,
        userPosition: veloLp.userPosition,
        rewards: [{ token: 'KITE', emission: inputs.haiVeloVeloLp.dailyKiteReward }],
        positionTokens: [
            {
                symbol: 'haiVELO/VELO LP',
                totalAmount: inputs.haiVeloVeloLp.totalStakedLp,
                userAmount: inputs.haiVeloVeloLp.userStakedLp,
                priceUsd: inputs.haiVeloVeloLp.lpPriceUsd,
                totalValueUsd: haiVeloVeloLpStakedTvl,
                userValueUsd: inputs.haiVeloVeloLp.userStakedLp * inputs.haiVeloVeloLp.lpPriceUsd,
            },
        ],
        rewardTokens: [
            {
                symbol: 'KITE',
                dailyEmission: inputs.haiVeloVeloLp.dailyKiteReward,
                priceUsd: prices.kite,
                dailyValueUsd: inputs.haiVeloVeloLp.dailyKiteReward * prices.kite,
                annualValueUsd: inputs.haiVeloVeloLp.dailyKiteReward * prices.kite * 365,
            },
            {
                symbol: 'HAI (shared)',
                dailyEmission: lpDailyHaiReward,
                priceUsd: prices.hai,
                dailyValueUsd: lpDailyHaiReward * prices.hai,
                annualValueUsd: lpDailyHaiReward * prices.hai * 365,
            },
        ],
        loading: false,
    }

    // --- Strategy 8: Velodrome Farm (per pool) ---
    for (const pool of inputs.velodromePools) {
        if (!VELO_POOLS.includes(pool.address)) continue

        const token0 =
            inputs.tokensData[pool.token0.toLowerCase()]?.symbol || pool.tokenPair?.[0] || pool.token0.slice(0, 6)
        const token1 =
            inputs.tokensData[pool.token1.toLowerCase()]?.symbol || pool.tokenPair?.[1] || pool.token1.slice(0, 6)

        const price0 = Number((inputs as any)._velodromePrices?.[token0]?.raw || 0)
        const price1 = Number((inputs as any)._velodromePrices?.[token1]?.raw || 0)

        const reserve0 = parseFloat(formatUnits(pool.reserve0 || '0', pool.decimals))
        const reserve1 = parseFloat(formatUnits(pool.reserve1 || '0', pool.decimals))
        const poolTvlUsd = reserve0 * price0 + reserve1 * price1

        let userStaked0 = 0
        let userStaked1 = 0
        const userPositionUsd = (inputs.velodromePositions || []).reduce((total, position) => {
            if (!stringsExistAndAreEqual(position.lp, pool.address)) return total
            const s0 = parseFloat(formatUnits(position.staked0, pool.decimals))
            const s1 = parseFloat(formatUnits(position.staked1, pool.decimals))
            userStaked0 += s0
            userStaked1 += s1
            return total + s0 * price0 + s1 * price1
        }, 0)

        const emissionsPerSecond = parseFloat(formatUnits(pool.emissions, pool.decimals))
        const dailyVeloEmission = emissionsPerSecond * 86400

        const farm = calculateVelodromeFarmApr({
            emissionsRaw: pool.emissions,
            decimals: pool.decimals,
            veloPrice: prices.velo,
            poolTvlUsd,
            userPositionUsd,
        })

        const poolRewards = RewardsModel.getPoolRewards(pool.address)
        results[`velo-${pool.address}`] = {
            id: `velo-${pool.address}`,
            type: 'farm',
            pair: [token0, token1],
            baseApr: farm.baseApr,
            components: farm.components,
            boost: null,
            effectiveApr: farm.baseApr,
            tvl: poolTvlUsd,
            userPosition: userPositionUsd,
            rewards: Object.entries(poolRewards || {})
                .filter(([, v]) => (v as number) > 0)
                .map(([token, emission]) => ({ token, emission: emission as number })),
            positionTokens: [
                {
                    symbol: token0,
                    totalAmount: reserve0,
                    userAmount: userStaked0,
                    priceUsd: price0,
                    totalValueUsd: reserve0 * price0,
                    userValueUsd: userStaked0 * price0,
                },
                {
                    symbol: token1,
                    totalAmount: reserve1,
                    userAmount: userStaked1,
                    priceUsd: price1,
                    totalValueUsd: reserve1 * price1,
                    userValueUsd: userStaked1 * price1,
                },
            ],
            rewardTokens: [
                {
                    symbol: 'VELO',
                    dailyEmission: dailyVeloEmission,
                    priceUsd: prices.velo,
                    dailyValueUsd: dailyVeloEmission * prices.velo,
                    annualValueUsd: dailyVeloEmission * prices.velo * 365,
                },
            ],
            loading: false,
        }
    }

    return results
}
