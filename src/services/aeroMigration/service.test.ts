import { BigNumber, ethers } from 'ethers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AeroMigrationDeployment } from './registry'

const { contracts, getReviewedDeployment } = vi.hoisted(() => ({
    contracts: {} as Record<string, any>,
    getReviewedDeployment: vi.fn(),
}))
vi.mock('ethers', async () => {
    const original = await vi.importActual<any>('ethers')
    return {
        ...original,
        ethers: { ...original.ethers, Contract: vi.fn((address: string) => contracts[address.toLowerCase()]) },
    }
})
vi.mock('./registry', async () => ({ ...(await vi.importActual<any>('./registry')), getReviewedDeployment }))

import {
    getMigrationQuote,
    submitMigrationStep,
    verifyMigrationDeployment,
    verifyMigrationReceipt,
    MIGRATOR_ABI,
} from './service'
import { LEGACY_MIGRATION_ASSETS } from './registry'

const account = '0x3333333333333333333333333333333333333333'
const hash = (character: string) => '0x' + character.repeat(64)
const code = '0x60006000'
const deployment: AeroMigrationDeployment = {
    id: 'test-reviewed-route',
    version: 'haiAERO-v2',
    chainId: 10,
    assets: ['haivelo-v2'],
    outputDecimals: 18,
    contractsCommit: 'a'.repeat(40),
    activationTransactionHash: hash('3'),
    migrator: {
        address: '0x1111111111111111111111111111111111111111',
        runtimeCodeHash: ethers.utils.keccak256(code),
        deploymentTransactionHash: hash('1'),
        deploymentBlockHash: hash('a'),
        deploymentBlockNumber: 100,
    },
    outputToken: {
        address: '0x2222222222222222222222222222222222222222',
        runtimeCodeHash: ethers.utils.keccak256(code),
        deploymentTransactionHash: hash('2'),
        deploymentBlockHash: hash('b'),
        deploymentBlockNumber: 101,
    },
}
const inputAddress = LEGACY_MIGRATION_ASSETS['haivelo-v2'].address
const units = ethers.utils.parseEther
let provider: any
let token: any
let migrator: any
let signer: any

beforeEach(() => {
    vi.clearAllMocks()
    getReviewedDeployment.mockReturnValue(deployment)
    provider = {
        getNetwork: vi.fn(async () => ({ chainId: 10 })),
        getBlockNumber: vi.fn(async () => 105),
        getCode: vi.fn(async () => code),
        getStorageAt: vi.fn(async () => hash('0')),
        getBlock: vi.fn(async (number: number) => ({ hash: number === 100 ? hash('a') : hash('b') })),
        getTransactionReceipt: vi.fn(async (tx: string) =>
            tx === hash('3')
                ? { status: 1, confirmations: 3 }
                : {
                      status: 1,
                      confirmations: 3,
                      blockNumber: tx === hash('1') ? 100 : 101,
                      blockHash: tx === hash('1') ? hash('a') : hash('b'),
                      contractAddress: tx === hash('1') ? deployment.migrator.address : deployment.outputToken.address,
                  }
        ),
    }
    token = {
        decimals: vi.fn(async () => 18),
        balanceOf: vi.fn(async () => units('10')),
        allowance: vi.fn(async () => BigNumber.from(0)),
        approve: vi.fn(async () => ({ hash: hash('4') })),
    }
    migrator = {
        outputToken: vi.fn(async () => deployment.outputToken.address),
        deploymentChainId: vi.fn(async () => BigNumber.from(10)),
        sourceTokens: vi.fn(async () => [inputAddress]),
        readiness: vi.fn(async () => ({
            inventory: units('100'),
            requiredOutput: units('90'),
            capsCoverLiabilities: true,
            ready: true,
        })),
        routes: vi.fn(async () => ({ cap: units('1000'), migrated: BigNumber.from(0) })),
        previewMigration: vi.fn(async () => BigNumber.from(7)),
        callStatic: { migrate: vi.fn(async () => BigNumber.from(7)) },
        migrate: vi.fn(async () => ({ hash: hash('5') })),
    }
    contracts[deployment.migrator.address.toLowerCase()] = migrator
    contracts[deployment.outputToken.address.toLowerCase()] = { decimals: vi.fn(async () => 18) }
    contracts[inputAddress.toLowerCase()] = token
    signer = { provider, getAddress: vi.fn(async () => account), getChainId: vi.fn(async () => 10) }
})

const quote = () => getMigrationQuote(deployment.id, 'haivelo-v2', '1', account, provider)

describe('verified, funded migration quotes', () => {
    it('uses contract output, bigint amounts and a pinned block instead of assuming 1:1', async () => {
        const result = await quote()
        expect(result.outputAmount).toBe('7')
        expect(result.inputAmount).toBe(units('1').toString())
        expect(migrator.previewMigration).toHaveBeenCalledWith(inputAddress, units('1'), { blockTag: 105 })
    })
    it('refuses unreviewed routes before any RPC access', async () => {
        getReviewedDeployment.mockImplementation(() => {
            throw new Error('No verified route')
        })
        await expect(quote()).rejects.toThrow('No verified route')
        expect(provider.getNetwork).not.toHaveBeenCalled()
    })
    it.each(['network', 'runtime', 'receipt', 'output', 'sources'])(
        'rejects a changed %s identity',
        async (condition) => {
            if (condition === 'network') provider.getNetwork.mockResolvedValue({ chainId: 8453 })
            if (condition === 'runtime') provider.getCode.mockResolvedValue('0x6001')
            if (condition === 'receipt') provider.getTransactionReceipt.mockResolvedValue(null)
            if (condition === 'output') migrator.outputToken.mockResolvedValue(account)
            if (condition === 'sources') migrator.sourceTokens.mockResolvedValue([])
            await expect(verifyMigrationDeployment(deployment, provider)).rejects.toThrow()
        }
    )
    it.each([
        { inventory: units('100'), requiredOutput: units('90'), capsCoverLiabilities: true, ready: false },
        { inventory: units('89'), requiredOutput: units('90'), capsCoverLiabilities: true, ready: true },
        { inventory: units('100'), requiredOutput: units('90'), capsCoverLiabilities: false, ready: true },
    ])('blocks paused or insufficiently backed migration', async (readiness) => {
        migrator.readiness.mockResolvedValue(readiness)
        await expect(quote()).rejects.toThrow('waiting for enough backing')
    })
    it('refuses zero output, insufficient wallet balance and exhausted caps', async () => {
        migrator.previewMigration.mockResolvedValueOnce(BigNumber.from(0))
        await expect(quote()).rejects.toThrow('No funded migration quote')
        token.balanceOf.mockResolvedValueOnce(0)
        await expect(quote()).rejects.toThrow('Insufficient legacy token')
        migrator.routes.mockResolvedValueOnce({ cap: 0, migrated: 0 })
        await expect(quote()).rejects.toThrow('remaining migration limit')
    })
})

describe('migration transaction guards', () => {
    it('approves only exact input amount and saves intent before requesting the wallet', async () => {
        const beforeSubmit = vi.fn()
        await submitMigrationStep(await quote(), 'approval', signer, beforeSubmit)
        expect(beforeSubmit).toHaveBeenCalledOnce()
        expect(token.approve).toHaveBeenCalledWith(deployment.migrator.address, units('1').toString())
        expect(beforeSubmit.mock.invocationCallOrder[0]).toBeLessThan(token.approve.mock.invocationCallOrder[0])
    })
    it('resets an insufficient existing allowance before increasing it', async () => {
        token.allowance.mockResolvedValue(BigNumber.from(1))
        await submitMigrationStep(await quote(), 'approval', signer)
        expect(token.approve).toHaveBeenCalledWith(deployment.migrator.address, 0)
    })
    it('blocks expired quotes, changed wallets and changed quotes without writing', async () => {
        const result = await quote()
        await expect(submitMigrationStep({ ...result, expiresAt: 0 }, 'migration', signer)).rejects.toThrow(
            'Quote expired'
        )
        signer.getAddress.mockResolvedValueOnce(deployment.outputToken.address)
        await expect(submitMigrationStep(result, 'migration', signer)).rejects.toThrow('Wallet or network changed')
        migrator.previewMigration.mockResolvedValueOnce(BigNumber.from(8))
        await expect(submitMigrationStep(result, 'migration', signer)).rejects.toThrow('quote changed')
        expect(migrator.migrate).not.toHaveBeenCalled()
        expect(token.approve).not.toHaveBeenCalled()
    })
    it('simulates and executes with exact quoted minOut and the same recipient', async () => {
        token.allowance.mockResolvedValue(units('1'))
        const result = await quote()
        await submitMigrationStep(result, 'migration', signer)
        const expected = [inputAddress, units('1').toString(), '7', account]
        expect(migrator.callStatic.migrate).toHaveBeenCalledWith(...expected)
        expect(migrator.migrate).toHaveBeenCalledWith(...expected)
    })
    it('requires the actual conversion event for this account, input and amount', async () => {
        const result = await quote()
        const abi = new ethers.utils.Interface(MIGRATOR_ABI)
        const event = abi.encodeEventLog(abi.getEvent('Migrated'), [
            account,
            inputAddress,
            account,
            result.inputAmount,
            7,
        ])
        const receipt: any = {
            status: 1,
            to: deployment.migrator.address,
            from: account,
            logs: [{ ...event, address: deployment.migrator.address }],
        }
        expect(() => verifyMigrationReceipt(result, receipt)).not.toThrow()
        expect(() => verifyMigrationReceipt(result, { ...receipt, logs: [] })).toThrow(
            'missing the expected token conversion'
        )
        expect(() => verifyMigrationReceipt(result, { ...receipt, status: 0 })).toThrow('did not succeed')
    })
})
