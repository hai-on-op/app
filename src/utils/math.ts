import { utils } from 'ethers'
import { BigNumber } from '@ethersproject/bignumber'
import { utils as gebUtils } from '@hai-on-op/sdk'

import { floatsTypes } from './constants'
import { formatNumber, toFixedString, toPercentage } from './formatting'

export const RAD = BigNumber.from('1000000000000000000000000000000000000000000000')
export const RAY = BigNumber.from('1000000000000000000000000000')
export const WAD = BigNumber.from('1000000000000000000')

export const multiplyRates = (rate1: string, rate2: string) => {
    const result = BigNumber.from(rate1).mul(BigNumber.from(rate2)).div(RAY)

    return result.toString()
}

export const multiplyWad = (wad1: string, wad2: string) => {
    const result = BigNumber.from(wad1).mul(BigNumber.from(wad2)).div(WAD)

    return result.toString()
}

export const transformToWadPercentage = (rate: string, denominator: string) => {
    if (denominator === '0') return 'NaN'

    const result = BigNumber.from(rate).mul(10000).div(BigNumber.from(denominator)).toString()

    return toPercentage(Number(result) / 10000, 2)
}

export const transformToAnnualRate = (rate: string, decimals: number, returnNumber = false) => {
    const exponent = 3600 * 24 * 365
    const base = utils.formatUnits(rate, decimals)
    const result = Number(base) ** exponent - 1
    if (returnNumber) return result

    return toPercentage(result, 2)
}

export const transformToEightHourlyRate = (rate: string, decimals: number, returnNumber = false) => {
    const exponent = 3600 * 8
    const base = utils.formatUnits(rate, decimals)
    const result = Number(base) ** exponent - 1
    if (returnNumber) return result

    return toPercentage(result, 2)
}

export const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(value, max))
}

export const returnPercentAmount = (partialValue: string, totalValue: string) => {
    return numeral(partialValue).divide(totalValue).multiply(100).value()
}

export const returnTimeOffset = () => {
    const a = new Date().getTimezoneOffset()
    const res = -Math.round(a / 60)
    return res < 0 ? res : '+' + res
}

export const amountToFiat = (balance: number, fiatPrice: number) => {
    return (balance * fiatPrice).toFixed(4)
}

export const returnTotalValue = (
    first: string,
    second: string,
    beautify = true,
    isRepay = false,
    type: keyof typeof floatsTypes = 'WAD'
) => {
    const firstBN = first ? BigNumber.from(toFixedString(Number(first).toString(), type)) : BigNumber.from('0')
    const secondBN = second ? BigNumber.from(toFixedString(second, type)) : BigNumber.from('0')

    const totalBN = isRepay ? firstBN.sub(secondBN) : firstBN.add(secondBN)

    if (!beautify) return totalBN
    return formatNumber(gebUtils.wadToFixed(totalBN).toString()).toString()
}

export const returnFiatValue = (value: string, price: number) => {
    if (!value || !price) return '0.00'
    return formatNumber(numeral(value).multiply(price).value().toString(), 2)
}
