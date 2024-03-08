import { BigNumber } from 'ethers'
import type { QueryUniswapPair } from './types'
import { TokenData } from '@hai-on-op/sdk'
import { stringsExistAndAreEqual } from '../validations'

export const transformUniPrice = (sqrtPriceX96: string) => {
    const priceBN = BigNumber.from(sqrtPriceX96)
    const denominator = BigNumber.from(2).pow(96)

    return priceBN.div(denominator).pow(2).toString()
}

export const formatUniswapPair = (pair: QueryUniswapPair, tokensData: Record<string, TokenData>) => {
    const token0Price = transformUniPrice(pair.sqrtPriceX96)

    return {
        ...pair,
        token0Price,
        token1Price: (1 / parseFloat(token0Price)).toString(),
        token0Data: Object.values(tokensData).find(({ address }) => stringsExistAndAreEqual(address, pair.token0)),
        token1Data: Object.values(tokensData).find(({ address }) => stringsExistAndAreEqual(address, pair.token1)),
    }
}
