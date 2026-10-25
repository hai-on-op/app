import { ethers } from 'ethers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VerifiedContractDeployment } from './registry'
import { verifyContractEvidence } from './deployment'

const code = '0x60006000'
const address = '0x1111111111111111111111111111111111111111'
const factory = '0x2222222222222222222222222222222222222222'
const hash = '0x' + 'a'.repeat(64)
const deployment: VerifiedContractDeployment = {
    address,
    runtimeCodeHash: ethers.utils.keccak256(code),
    deploymentTransactionHash: hash,
    deploymentBlockNumber: 100,
    deploymentBlockHash: hash,
}
let provider: any
let receipt: any

beforeEach(() => {
    receipt = { status: 1, confirmations: 3, contractAddress: address, blockNumber: 100, blockHash: hash, logs: [] }
    provider = {
        getCode: vi.fn(async (target: string, block: number) => (target === address && block === 99 ? '0x' : code)),
        getStorageAt: vi.fn(async () => ethers.constants.HashZero),
        getTransactionReceipt: vi.fn(async () => receipt),
        getBlock: vi.fn(async () => ({ hash })),
    }
})

describe('reviewed deployment evidence', () => {
    it('accepts confirmed direct CREATE evidence', async () => {
        await expect(verifyContractEvidence(deployment, provider, 105)).resolves.toBeUndefined()
    })
    it('requires a reviewed factory event for a null contractAddress receipt', async () => {
        receipt.contractAddress = null
        await expect(verifyContractEvidence(deployment, provider, 105)).rejects.toThrow(
            'requires reviewed deployment-event'
        )
        const eventAbi = 'event Deployed(address indexed instance)'
        const abi = new ethers.utils.Interface([eventAbi])
        receipt.logs = [{ address: factory, ...abi.encodeEventLog(abi.getEvent('Deployed'), [address]) }]
        const reviewed = {
            ...deployment,
            factoryDeployment: {
                factory: { address: factory, runtimeCodeHash: ethers.utils.keccak256(code) },
                eventAbi,
                addressArgument: 'instance',
            },
        }
        await expect(verifyContractEvidence(reviewed, provider, 105)).resolves.toBeUndefined()
        provider.getCode.mockResolvedValueOnce(code).mockResolvedValueOnce(code)
        await expect(verifyContractEvidence(reviewed, provider, 105)).rejects.toThrow('already existed')
        receipt.logs[0].address = address
        await expect(verifyContractEvidence(reviewed, provider, 105)).rejects.toThrow('does not prove deployment')
    })
    it('requires an explicit matching proxy administrator whenever the admin slot is nonzero', async () => {
        const admin = '0x4444444444444444444444444444444444444444'
        provider.getStorageAt.mockImplementation(async (_: string, slot: string) =>
            slot.endsWith('103') ? ethers.utils.hexZeroPad(admin, 32) : ethers.constants.HashZero
        )
        await expect(verifyContractEvidence(deployment, provider, 105)).rejects.toThrow(
            'administrator changed or is unverified'
        )
        await expect(
            verifyContractEvidence({ ...deployment, proxyAdmin: admin }, provider, 105)
        ).resolves.toBeUndefined()
        await expect(verifyContractEvidence({ ...deployment, proxyAdmin: factory }, provider, 105)).rejects.toThrow(
            'administrator changed or is unverified'
        )
        provider.getStorageAt.mockResolvedValue(ethers.constants.HashZero)
        await expect(verifyContractEvidence({ ...deployment, proxyAdmin: admin }, provider, 105)).rejects.toThrow(
            'administrator is missing'
        )
    })
    it('requires the reviewed proxy implementation address and runtime, not only proxy bytecode', async () => {
        const implementation = '0x3333333333333333333333333333333333333333'
        provider.getStorageAt.mockImplementation(async (_: string, slot: string) =>
            slot.endsWith('bbc') ? ethers.utils.hexZeroPad(implementation, 32) : ethers.constants.HashZero
        )
        await expect(verifyContractEvidence(deployment, provider, 105)).rejects.toThrow('unverified')
        await expect(
            verifyContractEvidence(
                {
                    ...deployment,
                    implementation: { address: implementation, runtimeCodeHash: ethers.utils.keccak256(code) },
                },
                provider,
                105
            )
        ).resolves.toBeUndefined()
        provider.getCode.mockImplementation(async (target: string) => (target === implementation ? '0x6001' : code))
        await expect(
            verifyContractEvidence(
                {
                    ...deployment,
                    implementation: { address: implementation, runtimeCodeHash: ethers.utils.keccak256(code) },
                },
                provider,
                105
            )
        ).rejects.toThrow('Implementation runtime changed')
    })
})
