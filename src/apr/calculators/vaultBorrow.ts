import type { AprComponent, BoostData } from '../types'
import { calculateVaultBoost } from './boost'

interface VaultBorrowInput {
    collateralId: string
    userDebtMapping: Record<string, string> // address -> debt amount
    totalMinted: string
    dailyKiteReward: number
    kitePrice: number
    haiPrice: number
    usersStakingData: Record<string, { stakedBalance: string | number }>
    totalKiteStaked: number
    userAddress?: string
    userPositionDebt: number // user's total debt for this collateral in HAI
}

interface VaultBorrowResult {
    baseApr: number // decimal
    components: AprComponent[]
    boost: BoostData
    tvl: number
    userPosition: number
}

/**
 * Vault/Borrow strategy APR (per collateral type).
 *
 * All APR comes from KITE incentive rewards distributed proportional to
 * boosted vault debt.
 *
 * Formula:
 *   vaultBoost[user] = min((kiteRatio / vaultRatio) + 1, 2)
 *   totalBoostedValue = sum(userDebt * userBoost)
 *   baseAPR = (dailyKiteReward * kitePrice / totalBoostedValue) * 365
 */
export function calculateVaultBorrowApr(input: VaultBorrowInput): VaultBorrowResult {
    const {
        collateralId,
        userDebtMapping,
        totalMinted,
        dailyKiteReward,
        kitePrice,
        haiPrice,
        usersStakingData,
        totalKiteStaked,
        userAddress,
        userPositionDebt,
    } = input

    const tvl = parseFloat(totalMinted || '0') * haiPrice

    // Build per-user boost map
    const vaultBoostMap: Record<string, number> = {}
    for (const [addr, value] of Object.entries(userDebtMapping)) {
        const lowAddr = addr.toLowerCase()
        const stakingData = usersStakingData[lowAddr]
        if (!stakingData) {
            vaultBoostMap[lowAddr] = 1
            continue
        }
        const userStakingAmount = Number(stakingData.stakedBalance)
        const userVaultMinted = Number(value)
        const boost = calculateVaultBoost({
            userStakingAmount,
            totalStakingAmount: totalKiteStaked,
            userVaultMinted,
            totalVaultMinted: Number(totalMinted),
        })
        vaultBoostMap[lowAddr] = typeof boost === 'number' ? boost : 1
    }

    // Compute total boosted value
    const totalBoostedValueParticipating = Object.entries(userDebtMapping).reduce((acc, [addr, value]) => {
        return acc + Number(value) * (vaultBoostMap[addr.toLowerCase()] || 1)
    }, 0)

    // Base APR is against raw TVL (unboosted positions).
    // Boost affects reward distribution (your share), not the APR denominator.
    const dailyKiteRewardUsd = dailyKiteReward * kitePrice
    const baseApr = tvl > 0 ? (dailyKiteRewardUsd * 365) / tvl : 0

    // User-specific
    const userAddr = userAddress?.toLowerCase()
    const myBoost = userAddr ? vaultBoostMap[userAddr] || 1 : 1
    const myValueParticipating = userAddr ? Number(userDebtMapping[userAddr] || 0) : 0
    const myBoostedValueParticipating = myValueParticipating * myBoost
    const myBoostedShare =
        totalBoostedValueParticipating > 0 ? myBoostedValueParticipating / totalBoostedValueParticipating : 0

    // User's effective APR: boost multiplies personal return
    const boostedApr = myBoost * baseApr

    return {
        baseApr,
        components: [
            {
                source: 'kite-incentives',
                apr: baseApr,
                boosted: true,
                label: 'KITE Incentives',
            },
        ],
        boost: {
            myBoost,
            baseApr,
            boostedApr,
            totalBoostedValueParticipating,
            myValueParticipating,
            myBoostedValueParticipating,
            myBoostedShare,
        },
        tvl,
        userPosition: userPositionDebt * haiPrice,
    }
}
