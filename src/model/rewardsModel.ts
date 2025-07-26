import { BigNumber, Contract } from 'ethers'
import { JsonRpcSigner, Provider } from '@ethersproject/providers'
import axios from 'axios'
import { REWARDS as STATIC_REWARDS } from '~/utils/rewards'
import StakingManagerABI from '~/abis/StakingManager.json'
import RewardPoolABI from '~/abis/RewardPool.json'

export interface RewardEmission {
  token: string
  emission: number | BigNumber
}

export interface VaultReward {
  [token: string]: number
}

export interface PoolReward {
  [token: string]: number
}

export interface StakingApy {
  id: number
  rpRate: BigNumber
  rpToken: string
}

export class RewardsModel {
  static getVaultRewards(vaultId: string): VaultReward {
    return STATIC_REWARDS.vaults[vaultId as keyof typeof STATIC_REWARDS.vaults] || STATIC_REWARDS.default
  }

  static getPoolRewards(poolAddress: string): PoolReward {
    return STATIC_REWARDS.velodrome[poolAddress.toLowerCase() as keyof typeof STATIC_REWARDS.velodrome] || STATIC_REWARDS.default
  }

  static getUniswapRewards(poolAddress: string): PoolReward {
    return STATIC_REWARDS.uniswap[poolAddress.toLowerCase() as keyof typeof STATIC_REWARDS.uniswap] || STATIC_REWARDS.default
  }

  static getAllVaultsWithRewards(): string[] {
    return Object.keys(STATIC_REWARDS.vaults).filter(
      (vault) => Object.values(STATIC_REWARDS.vaults[vault as keyof typeof STATIC_REWARDS.vaults] || {}).some((a) => a !== 0)
    )
  }

  static async fetchStakingApyData({
    stakingManagerAddress,
    providerOrSigner,
  }: {
    stakingManagerAddress: string
    providerOrSigner: JsonRpcSigner | Provider
  }): Promise<StakingApy[]> {
    const stakingManager = new Contract(stakingManagerAddress, StakingManagerABI, providerOrSigner)
    const rewardsCountBigNum: BigNumber = await stakingManager.rewards()
    const rewardsCount = rewardsCountBigNum.toNumber()
    const apyData: StakingApy[] = []
    for (let i = 0; i < rewardsCount; i++) {
      const poolData = await stakingManager.rewardTypes(i)
      const { isActive } = poolData
      if (isActive) {
        const rpContract = new Contract(poolData.rewardPool, RewardPoolABI, providerOrSigner)
        const rpRate = await rpContract.rewardRate()
        apyData.push({
          id: i,
          rpRate: rpRate,
          rpToken: poolData.rewardToken,
        })
      }
    }
    return apyData
  }

  static async fetchHaiVeloDailyReward({
    haiVeloDepositer,
    rewardDistributor,
    haiTokenAddress,
    rpcUrl,
  }: {
    haiVeloDepositer: string
    rewardDistributor: string
    haiTokenAddress: string
    rpcUrl: string
  }): Promise<number> {
    try {
      const response = await axios.post(rpcUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [
          {
            fromBlock: '0x0',
            toBlock: 'latest',
            fromAddress: haiVeloDepositer,
            toAddress: rewardDistributor,
            contractAddresses: [haiTokenAddress],
            category: ['erc20'],
            withMetadata: true,
            excludeZeroValue: true,
            maxCount: '0x1',
            order: 'desc',
          },
        ],
      })
      const transfers = response.data.result.transfers
      if (!transfers || transfers.length === 0) return 0
      const latestTransfer = transfers[0]
      // Return raw transfer value - division by 7 is done in useStrategyData
      return Number(latestTransfer?.value || 0)
    } catch (error) {
      console.error('Error fetching HAI VELO transfer data:', error)
      return 0
    }
  }
} 