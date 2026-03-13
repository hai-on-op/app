import { BigNumber, ethers } from 'ethers'
import { describe, expect, it } from 'vitest'

import { buildRequiredErc20ApprovalItem } from '../approval'

describe('buildRequiredErc20ApprovalItem', () => {
    const baseParams = {
        label: 'VELO',
        amount: '1.5',
        tokenAddress: '0x1111111111111111111111111111111111111111',
        decimals: 18,
        spender: '0x2222222222222222222222222222222222222222',
    }

    it('requires approval while allowance is still loading', () => {
        expect(buildRequiredErc20ApprovalItem(baseParams)).toEqual({
            kind: 'ERC20',
            label: 'VELO',
            amount: '1.5',
            tokenAddress: baseParams.tokenAddress,
            decimals: '18',
            spender: baseParams.spender,
        })
    })

    it('requires approval when allowance is insufficient', () => {
        const allowance = ethers.utils.parseUnits('1.0', 18)

        expect(buildRequiredErc20ApprovalItem({ ...baseParams, allowance })).toEqual({
            kind: 'ERC20',
            label: 'VELO',
            amount: '1.5',
            tokenAddress: baseParams.tokenAddress,
            decimals: '18',
            spender: baseParams.spender,
        })
    })

    it('skips approval when allowance already covers the amount', () => {
        const allowance = ethers.utils.parseUnits('2.0', 18)

        expect(buildRequiredErc20ApprovalItem({ ...baseParams, allowance })).toBeUndefined()
    })

    it('normalizes formatted amounts before returning the item', () => {
        const item = buildRequiredErc20ApprovalItem({
            ...baseParams,
            amount: '1,234.5678 VELO',
            decimals: 6,
            allowance: BigNumber.from(0),
        })

        expect(item).toEqual({
            kind: 'ERC20',
            label: 'VELO',
            amount: '1234.5678',
            tokenAddress: baseParams.tokenAddress,
            decimals: '6',
            spender: baseParams.spender,
        })
    })
})
