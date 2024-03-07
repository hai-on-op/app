import { ChainId } from './constants'
import { getEtherscanLink } from './helper'
import { returnTotalValue } from './math'
import { getCollateralRatio, getLiquidationPrice, ratioChecker, vaultIsSafe } from './vaults'

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
