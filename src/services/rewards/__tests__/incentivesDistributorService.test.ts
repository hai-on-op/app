import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mock for ethers.Contract
let currentContractMock: any = null
vi.mock('ethers', async () => {
    const actual: any = await vi.importActual('ethers')
    return {
        ...actual,
        Contract: vi.fn().mockImplementation(() => currentContractMock || {}),
    }
})

function mockContract(methods: Record<string, any>) {
    return { ...methods }
}

beforeEach(() => {
    currentContractMock = null
})

describe('incentivesDistributorService.getDistributorTimer', () => {
    it('computes endTime and paused from distributor and latest merkle root', async () => {
        const { getDistributorTimer } = await import('../incentivesDistributorService')
        const now = Math.floor(Date.now() / 1000)
        const provider = { getBlock: vi.fn().mockResolvedValue({ timestamp: now }) } as any
        const signer = { _isSigner: true, provider } as any
        const contractLocal = mockContract({
            bufferDuration: vi.fn().mockResolvedValue(1000),
            startTimestamp: vi.fn().mockResolvedValue(now - 10000),
            epochDuration: vi.fn().mockResolvedValue(86400),
            epochCounter: vi.fn().mockResolvedValue(2),
            paused: vi.fn().mockResolvedValue(false),
            provider,
        })
        currentContractMock = contractLocal
        const res = await getDistributorTimer(signer as any, { contract: contractLocal })
        expect(typeof res.endTime).toBe('number')
        expect(res.paused).toBe(false)
    })
})

describe('incentivesDistributorService.getUserIncentives', () => {
    it('returns empty when address invalid', async () => {
        const { getUserIncentives } = await import('../incentivesDistributorService')
        const provider = {} as any
        const res = await getUserIncentives('0x0' as any, 10, provider as any)
        expect(res).toEqual({})
    })

    it('builds claim data when there is a claimable amount', async () => {
        const { getUserIncentives } = await import('../incentivesDistributorService')
        const account = '0x1111111111111111111111111111111111111111'
        const distro = {
            format: 'standard-v1',
            tree: { root: '0xroot' },
            values: [ { value: [ account, '1000000000000000000' ] } ],
        }
        // mock global fetch for claims blob
        vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => ({ kite: distro, KITE: distro }) } as any)
        // mock StandardMerkleTree.load
        vi.mock('@openzeppelin/merkle-tree', async () => ({
            StandardMerkleTree: { load: () => ({ root: '0xroot', getProof: () => ['0xproof'] }) },
        }))
        const provider = { getBlock: vi.fn() } as any
        const signer = { _isSigner: true, provider } as any
        const contractLocal2 = mockContract({ isClaimed: vi.fn().mockResolvedValue(false), provider })
        currentContractMock = contractLocal2
        const res = await getUserIncentives(account as any, 10, signer as any, { contract: contractLocal2 })
        expect(res.KITE?.hasClaimable).toBe(true)
        expect(res.KITE?.amountWei).toBe('1000000000000000000')
    })
})


