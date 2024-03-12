import numeral from 'numeral'
import { BigNumber } from 'ethers'
import { TokenData } from '@hai-on-op/sdk'

import type { QueryUniswapPair } from './types'
import { stringsExistAndAreEqual } from '../validations'

export type FormattedUniswapPair = QueryUniswapPair & {
    token0Price: string
    token1Price: string
    token0Data?: TokenData
    token1Data?: TokenData
}

export const transformUniPrice = (sqrtPriceX96: string) => {
    const priceNum = numeral(sqrtPriceX96)
    const denominator = BigNumber.from(2).pow(96)

    const temp = priceNum.divide(numeral(denominator).value())
    return (temp.value() * temp.value()).toString()
}

export const formatUniswapPair = (pair: QueryUniswapPair, tokensData: Record<string, TokenData>) => {
    const token0Price = transformUniPrice(pair.sqrtPriceX96)

    return {
        ...pair,
        token0Price,
        token1Price: (1 / parseFloat(token0Price)).toString(),
        token0Data: Object.values(tokensData).find(({ address }) => stringsExistAndAreEqual(address, pair.token0)),
        token1Data: Object.values(tokensData).find(({ address }) => stringsExistAndAreEqual(address, pair.token1)),
    } as FormattedUniswapPair
}
