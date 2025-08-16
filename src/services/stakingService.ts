import { Contract, BigNumber, utils } from 'ethers'
import { Provider } from '@ethersproject/providers'
import { contracts } from '~/config/contracts'
import { parseEther } from 'ethers/lib/utils'

export type Address = `0x${string}`
export type EtherString = string

function toEtherString(value: BigNumber): EtherString {
    return utils.formatEther(value)
}

export async function getTotalStaked(provider: Provider): Promise<EtherString> {
    const sm = new Contract(contracts.stakingManager.address, contracts.abis.stakingManager, provider)
    const total: BigNumber = await sm.totalStaked()
    return toEtherString(total)
}

export async function getStakedBalance(address: Address, provider: Provider): Promise<EtherString> {
    const sm = new Contract(contracts.stakingManager.address, contracts.abis.stakingManager, provider)
    const bal: BigNumber = await sm.stakedBalances(address)
    return toEtherString(bal)
}

export async function getCooldown(provider: Provider): Promise<number> {
    const sm = new Contract(contracts.stakingManager.address, contracts.abis.stakingManager, provider)
    const seconds: BigNumber = await sm._params()
    return seconds.toNumber()
}

export type AggregatedReward = {
    tokenAddress: Address
    amount: EtherString
}

export async function getRewards(address: Address, provider: Provider): Promise<AggregatedReward[]> {
    const sm = new Contract(contracts.stakingManager.address, contracts.abis.stakingManager, provider)
    const rewardsCountBn: BigNumber = await sm.rewards()
    const rewardsCount = rewardsCountBn.toNumber()

    // Determine active pool indexes
    const activeIndexes: number[] = []
    for (let i = 0; i < rewardsCount; i++) {
        const poolData: { isActive: boolean } = await sm.rewardTypes(i)
        if (poolData.isActive) activeIndexes.push(i)
    }

    // earned returns the full array, index-aligned
    const earned: Array<{ rewardToken: Address; rewardAmount: BigNumber }> = await sm.callStatic.earned(
        address
    )

    const aggregated: Record<string, BigNumber> = {}
    for (const idx of activeIndexes) {
        const { rewardToken, rewardAmount } = earned[idx] || { rewardToken: '0x0', rewardAmount: BigNumber.from(0) }
        if (rewardAmount && rewardAmount.gt(0)) {
            const key = (rewardToken as string).toLowerCase()
            aggregated[key] = (aggregated[key] || BigNumber.from(0)).add(rewardAmount)
        }
    }

    return Object.entries(aggregated).map(([token, amount]) => ({
        tokenAddress: token as Address,
        amount: toEtherString(amount),
    }))
}

export type PendingWithdrawal = {
    amount: EtherString
    timestamp: number
}

// Note: The canonical pending withdrawal schedule is exposed via the indexer in this app.
// This on-chain read is not specified in the current ABI; return null for now.
export async function getPendingWithdrawal(_address: Address, _provider: Provider): Promise<PendingWithdrawal | null> {
    return null
}

// Write operations
export type TxResponse = { hash: string; from: string; wait: () => Promise<unknown> }

async function buildManager(signerOrProvider: any) {
    return new Contract(contracts.stakingManager.address, contracts.abis.stakingManager, signerOrProvider)
}

export async function stake(signer: any, amount: string): Promise<TxResponse> {
    const sm = await buildManager(signer)
    const user = await signer.getAddress()
    const txData = await sm.populateTransaction.stake(user, parseEther(amount))
    const tx = await signer.sendTransaction(txData)
    await tx.wait()
    return tx
}

export async function initiateWithdrawal(signer: any, amount: string): Promise<TxResponse> {
    const sm = await buildManager(signer)
    const txData = await sm.populateTransaction.initiateWithdrawal(parseEther(amount))
    const tx = await signer.sendTransaction(txData)
    await tx.wait()
    return tx
}

export async function withdraw(signer: any): Promise<TxResponse> {
    const sm = await buildManager(signer)
    const txData = await sm.populateTransaction.withdraw()
    const tx = await signer.sendTransaction(txData)
    await tx.wait()
    return tx
}

export async function cancelWithdrawal(signer: any): Promise<TxResponse> {
    const sm = await buildManager(signer)
    const txData = await sm.populateTransaction.cancelWithdrawal()
    const tx = await signer.sendTransaction(txData)
    await tx.wait()
    return tx
}

export async function claimRewards(signer: any): Promise<TxResponse> {
    const sm = await buildManager(signer)
    const user = await signer.getAddress()
    const txData = await sm.populateTransaction.getReward(user)
    const tx = await signer.sendTransaction(txData)
    await tx.wait()
    return tx
}


