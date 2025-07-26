import { BigNumber } from 'ethers'

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
    // Placeholder - will be implemented later
    return {
      collateralType: data.collateralType,
      underlyingAPR: 0,
      breakdown: [
        {
          source: 'Liquid Staking',
          apr: 0,
          description: 'Placeholder for liquid staking yield'
        }
      ],
      lastUpdated: new Date()
    }
  }
}

// Calculator for LP tokens (like YV-VELO-ALETH-WETH)
class LPTokenAPRCalculator implements IUnderlyingAPRCalculator {
  getDataRequirements(): string[] {
    return []
  }

  async calculateAPR(data: UnderlyingAPRData): Promise<UnderlyingAPRResult> {
    // Placeholder - will be implemented later
    return {
      collateralType: data.collateralType,
      underlyingAPR: 0,
      breakdown: [
        {
          source: 'LP Fees',
          apr: 0,
          description: 'Placeholder for LP token yield'
        }
      ],
      lastUpdated: new Date()
    }
  }
}

// Calculator for yield-bearing tokens (like staking derivatives)
class YieldBearingAPRCalculator implements IUnderlyingAPRCalculator {
  getDataRequirements(): string[] {
    return []
  }

  async calculateAPR(data: UnderlyingAPRData): Promise<UnderlyingAPRResult> {
    // Placeholder - will be implemented later
    return {
      collateralType: data.collateralType,
      underlyingAPR: 0,
      breakdown: [
        {
          source: 'Yield Bearing',
          apr: 0,
          description: 'Placeholder for yield bearing token yield'
        }
      ],
      lastUpdated: new Date()
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
          description: 'Standard tokens do not generate yield'
        }
      ],
      lastUpdated: new Date()
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
        error: `No calculator found for collateral type: ${collateralType}`
      }
      return result
    }

    try {
      const aprData: UnderlyingAPRData = {
        collateralType,
        ...data
      }
      
      const result = await calculator.calculateAPR(aprData)
      
      // Cache the result
      this.cache.set(cacheKey, {
        result,
        expiry: new Date(Date.now() + this.CACHE_DURATION_MS)
      })
      
      return result
    } catch (error) {
      return {
        collateralType,
        underlyingAPR: 0,
        lastUpdated: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Get all underlying APRs for multiple collateral types
  async getAllUnderlyingAPRs(collateralTypes: string[], data?: Record<string, Partial<UnderlyingAPRData>>): Promise<UnderlyingAPRResult[]> {
    const promises = collateralTypes.map(type => 
      this.getUnderlyingAPR(type, data?.[type])
    )
    
    return Promise.all(promises)
  }

  // Add or update a calculator for a specific collateral type
  setCalculator(collateralType: string, calculator: IUnderlyingAPRCalculator) {
    this.calculators.set(collateralType.toUpperCase(), calculator)
  }

  // Clear cache for a specific collateral type or all cache
  clearCache(collateralType?: string) {
    if (collateralType) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.startsWith(`${collateralType.toUpperCase()}_`)
      )
      keysToDelete.forEach(key => this.cache.delete(key))
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