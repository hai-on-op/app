import { BigNumber } from 'ethers'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import { ChainId } from './constants'
import { parseTokenAmount, toFixedString } from './formatting'
import { getEtherscanLink } from './helper'
import { returnTotalValue } from './math'
import {
    getCollateralRatio,
    getLiquidationPrice,
    getVaultAmountError,
    ratioChecker,
    vaultIsSafe,
    VaultAction,
} from './vaults'

describe('utils', () => {
    describe('#getEtherscanLink', () => {
        it('correct for tx', () => {
            expect(getEtherscanLink(ChainId.MAINNET, 'abc', 'transaction')).toEqual(
                'https://optimistic.etherscan.io/tx/abc'
            )
        })
        it('correct for token', () => {
            expect(getEtherscanLink(ChainId.MAINNET, 'abc', 'token')).toEqual(
                'https://optimistic.etherscan.io/token/abc'
            )
        })
        it('correct for address', () => {
            expect(getEtherscanLink(ChainId.MAINNET, 'abc', 'address')).toEqual(
                'https://optimistic.etherscan.io/address/abc'
            )
        })
        it('unrecognized chain id defaults to mainnet', () => {
            expect(getEtherscanLink(2 as ChainId, 'abc', 'address')).toEqual(
                'https://optimistic.etherscan.io/address/abc'
            )
        })
        it('goerli optimism', () => {
            expect(getEtherscanLink(ChainId.OPTIMISM_GOERLI, 'abc', 'address')).toEqual(
                'https://goerli-optimism.etherscan.io/address/abc'
            )
        })
        it('sepolia optimism', () => {
            expect(getEtherscanLink(11155420, 'abc', 'address')).toEqual(
                'https://sepolia-optimism.etherscan.io/address/abc'
            )
        })
    })

    describe('#getLiquidationPrice', () => {
        it('returns 0 if no value in params', () => {
            expect(getLiquidationPrice('', '', '', '')).toEqual('0')
        })
        it('returns 0 if one of the params is empty', () => {
            expect(getLiquidationPrice('', '2', '1', '2')).toEqual('0')
        })
        it('succeeds in returning desired value', () => {
            expect(getLiquidationPrice('2', '2', '1', '2')).toEqual('2')
        })
    })

    describe('#getCollateralRatio', () => {
        it('returns 0 if no value in params', () => {
            expect(getCollateralRatio('', '', '', '')).toEqual('0')
        })
        it('returns 0 if one of the params is empty', () => {
            expect(getCollateralRatio('', '2', '1', '1')).toEqual('0')
        })
        it('succeeds in returning desired value', () => {
            expect(getCollateralRatio('2', '2', '1', '1')).toEqual('100')
        })
    })

    describe('#vaultIsSafe', () => {
        it('returns true', () => {
            expect(vaultIsSafe('2', '2', '1')).toBe(true)
        })
        it('returns false if not', () => {
            expect(vaultIsSafe('1', '2', '1')).toBe(false)
        })
    })

    describe('#ratioChecker', () => {
        it('returns 0', () => {
            expect(ratioChecker(0, 1)).toEqual(0)
        })

        it('returns 1', () => {
            expect(ratioChecker(Infinity, 1)).toEqual(1)
        })

        it('returns 2', () => {
            expect(ratioChecker(300, 1)).toEqual(2)
        })
        it('returns 2', () => {
            expect(ratioChecker(301, 1)).toEqual(2)
        })

        it('returns 3', () => {
            expect(ratioChecker(200, 1)).toEqual(3)
        })

        it('returns 3', () => {
            expect(ratioChecker(201, 1)).toEqual(3)
        })
        it('returns 4', () => {
            expect(ratioChecker(199, 1)).toEqual(3)
        })

        it('returns 5', () => {
            expect(ratioChecker(50, 1)).toEqual(5)
        })
    })

    describe('fixed-point vault amounts', () => {
        it('uses the requested RAY and RAD scales even for values with exactly 18 fractional digits', () => {
            const rate = '1.123456789012345678'
            expect(formatUnits(toFixedString(rate, 'RAY'), 27)).toBe(rate)
            expect(formatUnits(toFixedString(rate, 'RAD'), 45)).toBe(rate)
            expect(formatUnits(toFixedString('-1.1234567890123456789', 'WAD'), 18)).toBe('-1.123456789012345678')
            expect(BigNumber.from(toFixedString('1e-7', 'WAD')).isZero()).toBe(true)
        })

        it('preserves one wei and large vault balances through arithmetic', () => {
            expect(returnTotalValue('0.000000000000000001', '0', false).toString()).toBe('1')
            expect(
                returnTotalValue('9007199254740993.000000000000000001', '0.000000000000000001', false, true).toString()
            ).toBe(parseUnits('9007199254740993', 18).toString())
        })

        it('checks only submitted fields using the collateral and HAI token precisions', () => {
            const action = VaultAction.WITHDRAW_REPAY
            expect(
                getVaultAmountError(action, { withdraw: '0.00000001', repay: '0.000000000000000001', borrow: '-2' }, 8)
            ).toBeUndefined()
            expect(getVaultAmountError(action, { withdraw: '0.000000001' }, 8)).toContain('8 decimal places')
            for (const repay of ['-1', '1e-7', '2.3.1', '0.0000000000000000001']) {
                expect(getVaultAmountError(action, { repay })).toContain('HAI')
            }
            expect(parseTokenAmount('1.25', 8)?.toString()).toBe('125000000')
            expect(parseTokenAmount('1e-7')).toBeUndefined()
        })
    })

    describe('#returnTotalValue', () => {
        it('returns 0 if empty', () => {
            expect(returnTotalValue('', '')).toEqual('0')
        })
        it('returns 2', () => {
            expect(returnTotalValue('2', '')).toEqual('2')
        })
        it('returns 3', () => {
            expect(returnTotalValue('2', '1')).toEqual('3')
        })

        it('returns 3.3567 and rounds up the value', () => {
            expect(returnTotalValue('2', '1.35678')).toEqual('3.35678')
        })
        it('returns 0', () => {
            expect(returnTotalValue('2', '2', true, true)).toEqual('0')
        })
    })
})
