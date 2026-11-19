import { parseEther } from 'ethers/lib/utils'
import type { JsonRpcSigner } from '@ethersproject/providers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_VAULT_DATA } from '~/utils/vaults'
import { NETWORK_ID } from '~/utils/constants'
import { handleRepayAndWithdraw } from './blockchain'

const proxy = vi.hoisted(() => ({
    repayAllDebt: vi.fn(),
    repayDebt: vi.fn(),
    freeTokenCollateral: vi.fn(),
    repayAllDebtAndFreeTokenCollateral: vi.fn(),
    repayDebtAndFreeTokenCollateral: vi.fn(),
    lockTokenCollateral: vi.fn(),
}))
vi.mock('@hai-on-op/sdk', async () => ({
    ...(await vi.importActual<typeof import('@hai-on-op/sdk')>('@hai-on-op/sdk')),
    Geb: class {
        getProxyAction() {
            return proxy
        }
    },
}))
vi.mock('~/hooks', () => ({ handlePreTxGasEstimate: vi.fn(async (_signer, tx) => tx) }))

const signer = { getChainId: async () => NETWORK_ID, sendTransaction: vi.fn() } as unknown as JsonRpcSigner
const vault = { ...DEFAULT_VAULT_DATA, collateral: 'WETH', totalDebt: '500.2' }

describe('repayment transaction selection', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        for (const method of Object.values(proxy)) method.mockResolvedValue({})
    })

    it('sends the exact partial repayment even one wei below the total', async () => {
        const repay = '500.199999999999999999'
        await handleRepayAndWithdraw(signer, { ...vault, repay }, '1')
        expect(proxy.repayDebt).toHaveBeenCalledWith('1', parseEther(repay))
        expect(proxy.repayAllDebt).not.toHaveBeenCalled()
        await handleRepayAndWithdraw(signer, { ...vault, repay: vault.totalDebt }, '1')
        expect(proxy.repayDebt).toHaveBeenLastCalledWith('1', parseEther(vault.totalDebt))
        expect(proxy.repayAllDebt).not.toHaveBeenCalled()

        await handleRepayAndWithdraw(signer, { ...vault, withdraw: '1', repay }, '1')
        expect(proxy.repayDebtAndFreeTokenCollateral).toHaveBeenCalledWith(
            'WETH',
            '1',
            parseEther('1'),
            parseEther(repay)
        )
    })

    it('keeps a selected full payoff as the debt grows, including zero-cash full settlement', async () => {
        await handleRepayAndWithdraw(signer, { ...vault, repay: '500', repayAll: true }, '1')
        expect(proxy.repayAllDebt).toHaveBeenCalledWith('1')
        await handleRepayAndWithdraw(signer, { ...vault, repay: '0', repayAll: true, withdraw: '1' }, '1')
        expect(proxy.repayAllDebtAndFreeTokenCollateral).toHaveBeenCalledWith('WETH', '1', parseEther('1'))
    })

    it('stops a pending operation when the signer changes networks during estimation', async () => {
        const changing = {
            ...signer,
            getChainId: vi
                .fn()
                .mockResolvedValueOnce(NETWORK_ID)
                .mockResolvedValueOnce(NETWORK_ID + 1),
        } as unknown as JsonRpcSigner
        await expect(handleRepayAndWithdraw(changing, { ...vault, repay: '1' }, '1')).rejects.toThrow('vault network')
        expect(changing.sendTransaction).not.toHaveBeenCalled()
    })
    it.each(['0', '0.05'])(
        'only withdraws when no repayment was requested from a vault with %s debt',
        async (totalDebt) => {
            await handleRepayAndWithdraw(signer, { ...vault, totalDebt, withdraw: '1' }, '1')
            expect(proxy.freeTokenCollateral).toHaveBeenCalledWith('WETH', '1', parseEther('1'))
            expect(proxy.repayAllDebtAndFreeTokenCollateral).not.toHaveBeenCalled()
        }
    )
})
