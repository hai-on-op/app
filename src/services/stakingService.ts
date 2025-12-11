import { Contract, BigNumber, utils } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { contracts } from '~/config/contracts'
import { parseEther } from 'ethers/lib/utils'

export type Address = `0x${string}`
export type EtherString = string

function toEtherString(value: BigNumber): EtherString {
    return utils.formatEther(value)
}

export function buildStakingService(
    managerAddress: Address,
    abi: any = contracts.abis.stakingManager,
    decimals: number = 18
) {
    const sm = (signerOrProvider: any) => new Contract(managerAddress, abi, signerOrProvider)

    return {
        decimals,
        async getTotalStaked(provider: Provider): Promise<EtherString> {
            const total: BigNumber = await sm(provider).totalStaked()
            return toEtherString(total)
        },
        async getStakedBalance(address: Address, provider: Provider): Promise<EtherString> {
            const bal: BigNumber = await sm(provider).stakedBalances(address)
            return toEtherString(bal)
        },
        async getCooldown(provider: Provider): Promise<number> {
            const seconds: BigNumber = await sm(provider)._params()
            return seconds.toNumber()
        },
        async getRewards(address: Address, provider: Provider): Promise<AggregatedReward[]> {
            const rewardsCountBn: BigNumber = await sm(provider).rewards()
            const rewardsCount = rewardsCountBn.toNumber()

            const activeIndexes: number[] = []
            for (let i = 0; i < rewardsCount; i++) {
                const poolData: { isActive: boolean } = await sm(provider).rewardTypes(i)
                if (poolData.isActive) activeIndexes.push(i)
            }

            const earned: Array<{ rewardToken: Address; rewardAmount: BigNumber }> = await sm(provider).callStatic.earned(
                address
            )

            const aggregated: Record<string, BigNumber> = {}
            for (const idx of activeIndexes) {
                const { rewardToken, rewardAmount } = earned[idx] || {
                    rewardToken: '0x0',
                    rewardAmount: BigNumber.from(0),
                }
                if (rewardAmount && rewardAmount.gt(0)) {
                    const key = (rewardToken as string).toLowerCase()
                    aggregated[key] = (aggregated[key] || BigNumber.from(0)).add(rewardAmount)
                }
            }

            return Object.entries(aggregated).map(([token, amount]) => ({
                tokenAddress: token as Address,
                amount: toEtherString(amount),
            }))
        },
        async getPendingWithdrawal(_address: Address, _provider: Provider): Promise<PendingWithdrawal | null> {
            return null
        },
        async stake(signer: any, amount: string): Promise<TxResponse> {
            const c = sm(signer)
            const user = await signer.getAddress()
            const txData = await c.populateTransaction.stake(user, parseEther(amount))
            const tx = await signer.sendTransaction(txData)
            await tx.wait()
            return tx
        },
        async initiateWithdrawal(signer: any, amount: string): Promise<TxResponse> {
            const c = sm(signer)
            const txData = await c.populateTransaction.initiateWithdrawal(parseEther(amount))
            const tx = await signer.sendTransaction(txData)
            await tx.wait()
            return tx
        },
        async withdraw(signer: any): Promise<TxResponse> {
            const c = sm(signer)
            const txData = await c.populateTransaction.withdraw()
            const tx = await signer.sendTransaction(txData)
            await tx.wait()
            return tx
        },
        async cancelWithdrawal(signer: any): Promise<TxResponse> {
            const c = sm(signer)
            const txData = await c.populateTransaction.cancelWithdrawal()
            const tx = await signer.sendTransaction(txData)
            await tx.wait()
            return tx
        },
        async claimRewards(signer: any): Promise<TxResponse> {
            const c = sm(signer)
            const user = await signer.getAddress()
            const txData = await c.populateTransaction.getReward(user)
            const tx = await signer.sendTransaction(txData)
            await tx.wait()
            return tx
        },
    }
}

export type AggregatedReward = {
    tokenAddress: Address
    amount: EtherString
}

// Backward-compatible default service and wrapper exports
export const defaultStakingService = buildStakingService(
    contracts.stakingManager.address as Address,
    contracts.abis.stakingManager,
    18
)

export type PendingWithdrawal = {
    amount: EtherString
    timestamp: number
}

// Note: The canonical pending withdrawal schedule is exposed via the indexer in this app.
// This on-chain read is not specified in the current ABI; return null for now.
export async function getTotalStaked(provider: Provider): Promise<EtherString> {
    return defaultStakingService.getTotalStaked(provider)
}

export async function getStakedBalance(address: Address, provider: Provider): Promise<EtherString> {
    return defaultStakingService.getStakedBalance(address, provider)
}

export async function getCooldown(provider: Provider): Promise<number> {
    return defaultStakingService.getCooldown(provider)
}

export async function getRewards(address: Address, provider: Provider): Promise<AggregatedReward[]> {
    return defaultStakingService.getRewards(address, provider)
}

export async function getPendingWithdrawal(
    _address: Address,
    _provider: Provider
): Promise<PendingWithdrawal | null> {
    return defaultStakingService.getPendingWithdrawal(_address, _provider)
}

// Write operations
export type TxResponse = { hash: string; from: string; wait: () => Promise<unknown> }

export async function stake(signer: any, amount: string): Promise<TxResponse> {
    return defaultStakingService.stake(signer, amount)
}

export async function initiateWithdrawal(signer: any, amount: string): Promise<TxResponse> {
    return defaultStakingService.initiateWithdrawal(signer, amount)
}

export async function withdraw(signer: any): Promise<TxResponse> {
    return defaultStakingService.withdraw(signer)
}

export async function cancelWithdrawal(signer: any): Promise<TxResponse> {
    return defaultStakingService.cancelWithdrawal(signer)
}

export async function claimRewards(signer: any): Promise<TxResponse> {
    return defaultStakingService.claimRewards(signer)
}


