import { BigNumber, ethers } from 'ethers'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { contracts, getReviewedIssuer, verifyContractEvidence } = vi.hoisted(() => ({
    contracts: {} as Record<string, any>,
    getReviewedIssuer: vi.fn(),
    verifyContractEvidence: vi.fn(),
}))
vi.mock('ethers', async () => {
    const original = await vi.importActual<any>('ethers')
    return {
        ...original,
        ethers: { ...original.ethers, Contract: vi.fn((address: string) => contracts[address.toLowerCase()]) },
    }
})
vi.mock('./issuerRegistry', async () => ({ ...(await vi.importActual<any>('./issuerRegistry')), getReviewedIssuer }))
vi.mock('./service', () => ({ verifyContractEvidence }))

import {
    getHaiAeroMintQuote,
    mintNeedsApproval,
    submitHaiAeroMintStep,
    verifyHaiAeroMintReceipt,
    HAI_AERO_ISSUER_ABI,
} from './issuer'
import { NEW_AERO_BASE_ADDRESS, NEW_SAERO_BASE_ADDRESS, type HaiAeroIssuerDeployment } from './issuerRegistry'

const account = '0x3333333333333333333333333333333333333333'
const zero = ethers.constants.AddressZero
const hash = '0x' + 'a'.repeat(64)
const units = ethers.utils.parseEther
const issuer: HaiAeroIssuerDeployment = {
    id: 'test-new-issuer',
    version: 'haiAERO-v2',
    chainId: 8453,
    voter: '0x4444444444444444444444444444444444444444',
    treasury: '0x5555555555555555555555555555555555555555',
    contractsCommit: 'a'.repeat(40),
    activationTransactionHash: hash,
    wrapper: {
        address: '0x1111111111111111111111111111111111111111',
        runtimeCodeHash: hash,
        deploymentTransactionHash: hash,
        deploymentBlockHash: hash,
        deploymentBlockNumber: 100,
    },
}
let provider: any
let wrapper: any
let token: any
let stake: any
let signer: any

beforeEach(() => {
    vi.clearAllMocks()
    getReviewedIssuer.mockReturnValue(issuer)
    provider = {
        getNetwork: vi.fn(async () => ({ chainId: 8453 })),
        getBlockNumber: vi.fn(async () => 105),
        getTransactionReceipt: vi.fn(async () => ({ status: 1, confirmations: 3 })),
    }
    wrapper = {
        BASE_TOKEN: vi.fn(async () => NEW_AERO_BASE_ADDRESS),
        BASE_TOKEN_NFT: vi.fn(async () => NEW_SAERO_BASE_ADDRESS),
        voter: vi.fn(async () => issuer.voter),
        treasury: vi.fn(async () => issuer.treasury),
        deploymentChainId: vi.fn(async () => BigNumber.from(8453)),
        paused: vi.fn(async () => false),
        totalIssuedPrincipal: vi.fn(async () => units('100')),
        totalSupply: vi.fn(async () => units('100')),
        principalOf: vi.fn(async () => BigNumber.from(0)),
        callStatic: { deposit: vi.fn(async () => undefined), depositNFTs: vi.fn(async () => undefined) },
        deposit: vi.fn(async () => ({ hash })),
        depositNFTs: vi.fn(async () => ({ hash })),
    }
    token = {
        decimals: vi.fn(async () => 18),
        balanceOf: vi.fn(async () => units('10')),
        allowance: vi.fn(async () => BigNumber.from(0)),
        approve: vi.fn(async () => ({ hash })),
    }
    stake = {
        TOKEN: vi.fn(async () => NEW_AERO_BASE_ADDRESS),
        VOTER: vi.fn(async () => issuer.voter),
        ownerOf: vi.fn(async () => account),
        getApproved: vi.fn(async () => zero),
        isApprovedForAll: vi.fn(async () => false),
        staked: vi.fn(async (id: string) => ({ amount: units(id), end: 0, isPermanent: true })),
        approve: vi.fn(async () => ({ hash })),
    }
    contracts[issuer.wrapper.address.toLowerCase()] = wrapper
    contracts[NEW_AERO_BASE_ADDRESS.toLowerCase()] = token
    contracts[NEW_SAERO_BASE_ADDRESS.toLowerCase()] = stake
    signer = { provider, getAddress: vi.fn(async () => account), getChainId: vi.fn(async () => 8453) }
})

const quote = (mode: 'aero' | 'saero' = 'aero', value = '1') =>
    getHaiAeroMintQuote(issuer.id, mode, value, account, provider)

describe('new AERO issuer', () => {
    it('checks the verified new underlying and mints exact principal', async () => {
        const result = await quote('aero', '1.234567890123456789')
        expect(verifyContractEvidence).toHaveBeenCalledWith(issuer.wrapper, provider, 105)
        expect(result.outputAmount).toBe('1234567890123456789')
        expect(mintNeedsApproval(result)).toBe(true)
    })
    it('rejects legacy AERO identities, paused minting and wrong network', async () => {
        wrapper.BASE_TOKEN.mockResolvedValueOnce('0x940181a94A35A4569E4529A3CDfB74e38FD98631')
        await expect(quote()).rejects.toThrow('underlying token identities')
        wrapper.paused.mockResolvedValueOnce(true)
        await expect(quote()).rejects.toThrow('paused')
        provider.getNetwork.mockResolvedValueOnce({ chainId: 10 })
        await expect(quote()).rejects.toThrow('Invalid new haiAERO issuer')
    })
    it('sums permanent NFT principal and approves a specific NFT at a time', async () => {
        const result = await quote('saero', '2,3')
        expect(result.outputAmount).toBe(units('5').toString())
        expect(result.approvalTokenId).toBe('2')
        await submitHaiAeroMintStep(result, signer)
        expect(stake.approve).toHaveBeenCalledWith(issuer.wrapper.address, '2')
    })
    it('rejects duplicate, timed, unowned and already-deposited NFTs', async () => {
        await expect(quote('saero', '02,2')).rejects.toThrow('only once')
        stake.staked.mockResolvedValueOnce({ amount: units('2'), end: 1000, isPermanent: false })
        await expect(quote('saero', '2')).rejects.toThrow('Only permanent')
        stake.ownerOf.mockResolvedValueOnce(zero)
        await expect(quote('saero', '2')).rejects.toThrow('does not own')
        wrapper.principalOf.mockResolvedValueOnce(units('2'))
        await expect(quote('saero', '2')).rejects.toThrow('does not own')
    })
    it('requests exact ERC20 approval and resets a prior insufficient allowance', async () => {
        await submitHaiAeroMintStep(await quote(), signer)
        expect(token.approve).toHaveBeenCalledWith(issuer.wrapper.address, units('1').toString())
        token.allowance.mockResolvedValue(BigNumber.from(1))
        await submitHaiAeroMintStep(await quote(), signer)
        expect(token.approve).toHaveBeenLastCalledWith(issuer.wrapper.address, 0)
    })
    it('simulates before depositing new AERO to the connected recipient', async () => {
        token.allowance.mockResolvedValue(units('2'))
        const beforeSubmit = vi.fn()
        await submitHaiAeroMintStep(await quote(), signer, beforeSubmit)
        expect(wrapper.callStatic.deposit).toHaveBeenCalledWith(account, units('1').toString())
        expect(wrapper.deposit).toHaveBeenCalledWith(account, units('1').toString())
        expect(beforeSubmit.mock.invocationCallOrder[0]).toBeLessThan(wrapper.deposit.mock.invocationCallOrder[0])
    })
    it('simulates and deposits approved permanent sAERO without granting approval for all', async () => {
        stake.getApproved.mockResolvedValue(issuer.wrapper.address)
        await submitHaiAeroMintStep(await quote('saero', '2,3'), signer)
        expect(wrapper.callStatic.depositNFTs).toHaveBeenCalledWith(account, ['2', '3'])
        expect(wrapper.depositNFTs).toHaveBeenCalledWith(account, ['2', '3'])
        expect(stake.approve).not.toHaveBeenCalled()
    })
    it('registers Treasury Safe-owned NFTs without querying or granting transfer approvals', async () => {
        stake.ownerOf.mockResolvedValue(issuer.treasury)
        signer.getAddress.mockResolvedValue(issuer.treasury)
        const result = await getHaiAeroMintQuote(issuer.id, 'saero', '2', issuer.treasury, provider)
        expect(mintNeedsApproval(result)).toBe(false)
        await submitHaiAeroMintStep(result, signer)
        expect(stake.isApprovedForAll).not.toHaveBeenCalled()
        expect(stake.getApproved).not.toHaveBeenCalled()
        expect(stake.approve).not.toHaveBeenCalled()
        expect(wrapper.depositNFTs).toHaveBeenCalledWith(issuer.treasury.toLowerCase(), ['2'])
    })
    it('blocks minting if NFT principal changed after review', async () => {
        stake.getApproved.mockResolvedValue(issuer.wrapper.address)
        const reviewed = await quote('saero', '2')
        stake.staked.mockResolvedValue({ amount: units('3'), end: 0, isPermanent: true })
        await expect(submitHaiAeroMintStep(reviewed, signer)).rejects.toThrow('quote changed')
        expect(wrapper.depositNFTs).not.toHaveBeenCalled()
    })
    it('requires matching receipt principal and NFT identity', async () => {
        const result = await quote('saero', '2')
        const abi = new ethers.utils.Interface(HAI_AERO_ISSUER_ABI)
        const event = abi.encodeEventLog(abi.getEvent('Deposited'), [account, account, 2, units('2')])
        const receipt: any = {
            status: 1,
            from: account,
            to: issuer.wrapper.address,
            logs: [{ ...event, address: issuer.wrapper.address }],
        }
        expect(() => verifyHaiAeroMintReceipt(result, receipt)).not.toThrow()
        expect(() => verifyHaiAeroMintReceipt({ ...result, tokenIds: ['3'] }, receipt)).toThrow(
            'missing the expected deposited principal'
        )
    })
})
