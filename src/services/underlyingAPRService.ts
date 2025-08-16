import { BigNumber } from 'ethers'
import { RewardsModel } from '~/model/rewardsModel'
import { VITE_MAINNET_PUBLIC_RPC } from '~/utils'
import {
    HAI_VELO_ADDRESSES,
    HAIVELO_V1_DEPOSITER_ADDRESS,
    HAI_REWARD_DISTRIBUTOR_ADDRESS,
} from '~/services/haiVeloService'
import { fetchHaiVeloLatestTransferAmount } from '~/services/haiVeloService'

const HAIVELO_DEPOSITER = HAIVELO_V1_DEPOSITER_ADDRESS
const REWARD_DISTRIBUTOR = HAI_REWARD_DISTRIBUTOR_ADDRESS

const HAI_TOKEN_ADDRESS = import.meta.env.VITE_HAI_ADDRESS as string
const KITE_TOKEN_ADDRESS = import.meta.env.VITE_KITE_ADDRESS as string
const OP_TOKEN_ADDRESS = import.meta.env.VITE_OP_ADDRESS as string

// Interface for underlying APR calculation data requirements
export interface UnderlyingAPRData {
    collateralType: string
    totalValueLocked?: string
    price?: string
    liquidityPoolData?: {
        reserves0?: string
        reserves1?: string
        totalSupply?: string
        fee24h?: string
    }
    stakingRewards?: {
        rewardRate?: BigNumber
        totalStaked?: string
    }
    yieldFarmData?: {
        rewardTokens?: string[]
        emissionRates?: BigNumber[]
        totalDeposited?: string
    }
    externalProtocolData?: Record<string, any>
}

// Interface for APR calculation result
export interface UnderlyingAPRResult {
    collateralType: string
    underlyingAPR: number // As decimal (e.g., 0.05 for 5%)
    breakdown?: {
        source: string
        apr: number
        description?: string
    }[]
    lastUpdated: Date
    error?: string
}

// Base interface for APR calculators
export interface IUnderlyingAPRCalculator {
    calculateAPR(data: UnderlyingAPRData): Promise<UnderlyingAPRResult>
    getDataRequirements(): string[]
}

// Calculator for liquid staking tokens (like stETH, rETH, etc.)
class LiquidStakingAPRCalculator implements IUnderlyingAPRCalculator {
    getDataRequirements(): string[] {
        return []
    }

    async calculateAPR(data: UnderlyingAPRData): Promise<UnderlyingAPRResult> {
        try {
            let underlyingAPR = 0
            let source = 'Liquid Staking'
            let description = 'Placeholder for liquid staking yield'

            // Handle different liquid staking tokens
            if (data.collateralType.toUpperCase() === 'WSTETH') {
                try {
                    const response = await fetch('https://eth-api.lido.fi/v1/protocol/steth/apr/sma')
                    if (response.ok) {
                        const lidoData = await response.json()
                        const aprValue = lidoData.data?.smaApr || 0
                        underlyingAPR = aprValue / 100 // Convert percentage to decimal
                        const aprString = aprValue.toFixed(2)
                        source = 'Lido stETH/wstETH Staking'
                        description = `Ethereum staking yield via Lido (${aprString}%)`
                    } else {
                        console.warn('Failed to fetch Lido APR, using 0%')
                    }
                } catch (error) {
                    console.warn('Error fetching Lido APR:', error)
                }
            } else if (data.collateralType.toUpperCase() === 'RETH') {
                try {
                    const response = await fetch('https://yields.llama.fi/chart/d4b3c522-6127-4b89-bedf-83641cdcd2eb')
                    if (response.ok) {
                        const chartData = await response.json()
                        if (chartData.data && chartData.data.length > 0) {
                            // Get the latest APY from the chart data
                            const latestData = chartData.data[chartData.data.length - 1]
                            const aprValue = latestData.apy || 0
                            underlyingAPR = aprValue / 100 // Convert percentage to decimal
                            source = 'Rocket Pool rETH Staking'
                            description = `Ethereum staking yield via Rocket Pool (${aprValue.toFixed(2)}%)`
                        } else {
                            console.warn('No rETH chart data found in DefiLlama response')
                        }
                    } else {
                        console.warn('Failed to fetch rETH APR from DefiLlama, using 0%')
                    }
                } catch (error) {
                    console.warn('Error fetching rETH APR from DefiLlama:', error)
                }
            } else if (data.collateralType.toUpperCase() === 'APXETH') {
                try {
                    const response = await fetch('https://yields.llama.fi/chart/fc25b5ff-2ba8-44a3-895b-e0d22d96365f')
                    if (response.ok) {
                        const chartData = await response.json()
                        if (chartData.data && chartData.data.length > 0) {
                            // Get the latest APY from the chart data
                            const latestData = chartData.data[chartData.data.length - 1]
                            const aprValue = latestData.apy || 0
                            underlyingAPR = aprValue / 100 // Convert percentage to decimal
                            source = 'Dinero apxETH Staking'
                            description = `Ethereum staking yield via Dinero apxETH (${aprValue.toFixed(2)}%)`
                        } else {
                            console.warn('No APXETH chart data found in DefiLlama response')
                        }
                    } else {
                        console.warn('Failed to fetch APXETH APR from DefiLlama, using 0%')
                    }
                } catch (error) {
                    console.warn('Error fetching APXETH APR from DefiLlama:', error)
                }
            }

            return {
                collateralType: data.collateralType,
                underlyingAPR,
                breakdown: [
                    {
                        source,
                        apr: underlyingAPR,
                        description
                    }
                ],
                lastUpdated: new Date()
            }
        } catch (error) {
            return {
                collateralType: data.collateralType,
                underlyingAPR: 0,
                lastUpdated: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }
}

// Calculator for LP tokens (like YV-VELO-ALETH-WETH)
class LPTokenAPRCalculator implements IUnderlyingAPRCalculator {
    getDataRequirements(): string[] {
        return []
    }

    async calculateAPR(data: UnderlyingAPRData): Promise<UnderlyingAPRResult> {
        try {
            let underlyingAPR = 0
            let source = 'LP Fees'
            let description = 'Placeholder for LP token yield'

            // For YV-VELO-ALETH-WETH, fetch real APY from Yearn's yDaemon API
            if (data.collateralType.toUpperCase() === 'YV-VELO-ALETH-WETH') {
              try {
                const response = await fetch('https://ydaemon.yearn.fi/10/vaults/0xf7D66b41Cd4241eae450fd9D2d6995754634D9f3')
                if (response.ok) {
                  const vaultData = await response.json()
                  const netAPY = vaultData.apr?.netAPR || 0
                  underlyingAPR = netAPY // Already in decimal format (e.g., 0.025 for 2.5%)
                  source = 'Yearn Vault Yield'
                  description = `Net APY from Yearn vault strategy (${(netAPY * 100).toFixed(2)}%)`
                } else {
                  console.warn('Failed to fetch Yearn vault data, using 0%')
                }
              } catch (error) {
                console.warn('Error fetching Yearn vault APY:', error)
              }
            }

            return {
                collateralType: data.collateralType,
                underlyingAPR,
                breakdown: [
                    {
                        source,
                        apr: underlyingAPR,
                        description
                    }
                ],
                lastUpdated: new Date()
            }
        } catch (error) {
            return {
                collateralType: data.collateralType,
                underlyingAPR: 0,
                lastUpdated: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }
}

// Calculator for yield-bearing tokens (like staking derivatives)
class YieldBearingAPRCalculator implements IUnderlyingAPRCalculator {
    getDataRequirements(): string[] {
        return []
    }

    async calculateAPR(data: UnderlyingAPRData): Promise<UnderlyingAPRResult> {
        try {
            // For HAI VELO, get the APR from the deposit strategy calculation
            if (data.collateralType.toUpperCase() === 'HAIVELO') {

                let baseAPR = 0.05 // Default fallback
                let userBoost = 1 // Default boost

                try {
                    // Get the HAI VELO daily reward (centralized helper)
                    const haiVeloLatestTransferAmount = await fetchHaiVeloLatestTransferAmount({
                        rpcUrl: VITE_MAINNET_PUBLIC_RPC,
                        haiTokenAddress: HAI_TOKEN_ADDRESS,
                        depositerAddress: HAIVELO_DEPOSITER,
                        distributorAddress: REWARD_DISTRIBUTOR,
                    })

                    // Calculate daily reward quantity (divide by 7 as done in useStrategyData)
                    const haiVeloDailyRewardQuantity = haiVeloLatestTransferAmount / 7 || 0

                    // Get HAI price from external protocol data
                    const haiPrice = data.externalProtocolData?.haiPrice || 1
                    const haiVeloDailyRewardValue = haiVeloDailyRewardQuantity * haiPrice

                    // Get the actual totalBoostedValueParticipating from strategy data
                    const haiVeloBoostApr = data.externalProtocolData?.haiVeloBoostApr
                    const actualTVL = haiVeloBoostApr?.totalBoostedValueParticipating || 1000000 // Fallback to $1M

                    // Calculate base APR using the exact same formula as useStrategyData:
                    // (haiVeloDailyRewardValue / totalHaiVeloBoostedValueParticipating) * 365 * 100
                    // But convert to decimal by dividing by 100 (like in useEarnStrategies line 261)
                    const baseAPRPercentage = actualTVL > 0 ? (haiVeloDailyRewardValue / actualTVL) * 365 * 100 : 0
                    const baseAPRDecimal = baseAPRPercentage / 100 // Convert percentage to decimal
                    
                    // For underlying APR, we want the boosted deposit strategy APR, not the base APR
                    // Get the user's boost multiplier from the boost APR data
                    userBoost = haiVeloBoostApr?.myBoost || 1
                    const userBoostedAPR = baseAPRDecimal * userBoost
                    
                    baseAPR = userBoostedAPR
                } catch (error) {
                    console.error('🔥 Error calculating HAI VELO APR:', error)
                    baseAPR = 0.05 // Fallback to 5%
                }

                return {
                    collateralType: data.collateralType,
                    underlyingAPR: baseAPR,
                    breakdown: [
                        {
                            source: 'HAI VELO Deposit Strategy (Boosted)',
                            apr: baseAPR,
                            description: `Boosted yield from HAI VELO deposit strategy (${userBoost?.toFixed(2)}x boost)`
                        }
                    ],
                    lastUpdated: new Date()
                }
            }

            // For other yield-bearing tokens, return 0 for now
            return {
                collateralType: data.collateralType,
                underlyingAPR: 0,
                breakdown: [
                    {
                        source: 'Yield Bearing',
                        apr: 0,
                        description: 'Placeholder for yield bearing token yield',
                    },
                ],
                lastUpdated: new Date(),
            }
        } catch (error) {
            return {
                collateralType: data.collateralType,
                underlyingAPR: 0,
                lastUpdated: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }
}

// Calculator for standard tokens (ETH, WBTC, etc.) - typically 0% underlying yield
class StandardTokenAPRCalculator implements IUnderlyingAPRCalculator {
    getDataRequirements(): string[] {
        return []
    }

    async calculateAPR(data: UnderlyingAPRData): Promise<UnderlyingAPRResult> {
        return {
            collateralType: data.collateralType,
            underlyingAPR: 0,
            breakdown: [
                {
                    source: 'No Underlying Yield',
                    apr: 0,
                    description: 'Standard tokens do not generate yield',
                },
            ],
            lastUpdated: new Date(),
        }
    }
}

// Main service class
export class UnderlyingAPRService {
    private calculators: Map<string, IUnderlyingAPRCalculator> = new Map()
    private cache: Map<string, { result: UnderlyingAPRResult; expiry: Date }> = new Map()
    private readonly CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

    constructor() {
        this.initializeCalculators()
    }

    private initializeCalculators() {
        const liquidStakingCalculator = new LiquidStakingAPRCalculator()
        const lpTokenCalculator = new LPTokenAPRCalculator()
        const yieldBearingCalculator = new YieldBearingAPRCalculator()
        const standardTokenCalculator = new StandardTokenAPRCalculator()

        // Map collateral types to their appropriate calculators
        this.calculators.set('WSTETH', liquidStakingCalculator)
        this.calculators.set('RETH', liquidStakingCalculator)
        this.calculators.set('SFRXETH', liquidStakingCalculator)
        this.calculators.set('ALETH', liquidStakingCalculator)

        this.calculators.set('YV-VELO-ALETH-WETH', lpTokenCalculator)
        this.calculators.set('HAIVELO', yieldBearingCalculator)

        // Standard tokens (no underlying yield)
        this.calculators.set('WETH', standardTokenCalculator)
        this.calculators.set('WBTC', standardTokenCalculator)
        this.calculators.set('OP', standardTokenCalculator)
        this.calculators.set('TBTC', standardTokenCalculator)
        this.calculators.set('SNX', standardTokenCalculator)
        this.calculators.set('APXETH', yieldBearingCalculator) // Could be liquid staking depending on implementation
    }

    async getUnderlyingAPR(collateralType: string, data?: Partial<UnderlyingAPRData>): Promise<UnderlyingAPRResult> {
        // Check cache first
        const cacheKey = `${collateralType}_${JSON.stringify(data || {})}`
        const cached = this.cache.get(cacheKey)
        if (cached && cached.expiry > new Date()) {
            return cached.result
        }

        const calculator = this.calculators.get(collateralType.toUpperCase())
        if (!calculator) {
            const result: UnderlyingAPRResult = {
                collateralType,
                underlyingAPR: 0,
                lastUpdated: new Date(),
                error: `No calculator found for collateral type: ${collateralType}`,
            }
            return result
        }

        try {
            const aprData: UnderlyingAPRData = {
                collateralType,
                ...data,
            }

            const result = await calculator.calculateAPR(aprData)

            // Cache the result
            this.cache.set(cacheKey, {
                result,
                expiry: new Date(Date.now() + this.CACHE_DURATION_MS),
            })

            return result
        } catch (error) {
            return {
                collateralType,
                underlyingAPR: 0,
                lastUpdated: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }

    // Get all underlying APRs for multiple collateral types
    async getAllUnderlyingAPRs(
        collateralTypes: string[],
        data?: Record<string, Partial<UnderlyingAPRData>>
    ): Promise<UnderlyingAPRResult[]> {
        const promises = collateralTypes.map((type) => this.getUnderlyingAPR(type, data?.[type]))

        return Promise.all(promises)
    }

    // Add or update a calculator for a specific collateral type
    setCalculator(collateralType: string, calculator: IUnderlyingAPRCalculator) {
        this.calculators.set(collateralType.toUpperCase(), calculator)
    }

    // Clear cache for a specific collateral type or all cache
    clearCache(collateralType?: string) {
        if (collateralType) {
            const keysToDelete = Array.from(this.cache.keys()).filter((key) =>
                key.startsWith(`${collateralType.toUpperCase()}_`)
            )
            keysToDelete.forEach((key) => this.cache.delete(key))
        } else {
            this.cache.clear()
        }
    }

    // Get data requirements for a specific collateral type
    getDataRequirements(collateralType: string): string[] {
        const calculator = this.calculators.get(collateralType.toUpperCase())
        return calculator?.getDataRequirements() || []
    }
}

// Export singleton instance
export const underlyingAPRService = new UnderlyingAPRService()
