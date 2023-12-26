import numeral from 'numeral'
import { FixedNumber } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'

import type { SummaryCurrency, SummaryItem } from '~/types'
import { floatsTypes } from './constants'
import { sanitizeDecimals } from './helper'

export const returnWalletAddress = (walletAddress: string) => {
    if (!walletAddress) return 'undefined'
    return `${walletAddress.slice(0, 4 + 2)}...${walletAddress.slice(-4)}`
}

export const capitalizeName = (name: string) => name.charAt(0).toUpperCase() + name.slice(1)

export const formatNumber = (value: string, digits = 6, round = false) => {
    if (!value) {
        return '0'
    }
    const n = Number(value)
    if (Number.isInteger(n) || value.length < 5) {
        return n.toString()
    }

    const nOfWholeDigits = value.split('.')[0].length
    const nOfDigits = nOfWholeDigits > digits - 1
        ? '00'
        : Array.from(Array(digits - nOfWholeDigits), () => 0).join('')
    let val
    if (round) {
        val = numeral(n).format(`0.${nOfDigits}`)
    } else {
        val = numeral(n).format(`0.${nOfDigits}`, Math.floor)
    }

    return isNaN(Number(val)) ? value : val
}

type FormatOptions = {
    scalingFactor?: number,
    maxDecimals?: number,
    style?: 'currency' | 'percent'
}
export const formatNumberWithStyle = (value: number | string, options: FormatOptions = {}) => {
    const { scalingFactor = 1, maxDecimals = 2, style } = options

    const scaledValue = scalingFactor * parseFloat((value || '0').toString())
    return scaledValue.toLocaleString(undefined, {
        style,
        currency: style === 'currency' ? 'USD': undefined,
        maximumFractionDigits: maxDecimals,
    })
}

/**
 * @dev Format a number to a string
 * @param input BigNumber string to format
 * @param decimals Number of BigNumber's decimals
 * @param formatDecimal Number of decimals to format to
 * @param currency Format as currency
 * @param compact Format as compact
 * @returns Formatted number
 */
export function formatDataNumber(
    input: string,
    decimals = 18,
    formatDecimal = 2,
    currency?: boolean,
    compact?: boolean
) {
    let res: number = Number.parseFloat(input)

    if (decimals !== 0) res = Number.parseFloat(formatUnits(input, decimals))

    if (res < 0.01) return `${currency ? '$': ''}${formatNumber(res.toString(), formatDecimal)}`

    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: formatDecimal,
        notation: compact ? 'compact': 'standard',
        style: currency ? 'currency': 'decimal',
        currency: 'USD',
    }).format(res)
}

export const toPercentage = (value: number, decimals: number) => {
    return `${formatDataNumber((value * 100).toString(), 0, decimals, false, false)}%`
}

export const getRatePercentage = (value: string, digits = 4, returnRate = false) => {
    const rate = Number(value)
    const ratePercentage = rate < 1
        ? numeral(1).subtract(rate).value() * -1
        : numeral(rate).subtract(1).value()

    if (returnRate) return ratePercentage

    return formatNumber(String(ratePercentage * 100), digits)
}

export const toFixedString = (value: string, type: keyof typeof floatsTypes): string => {
    try {
        // cut decimals to avoid underflow error
        const formattedValue = sanitizeDecimals(value, floatsTypes[type])

        const n = Number(formattedValue)
        const nOfDecimals = Number.isInteger(n) ? formattedValue.length : formattedValue.split('.')[1].length

        if (type === 'WAD' || nOfDecimals === floatsTypes.WAD) {
            return FixedNumber.fromString(formattedValue, 'fixed256x18').toHexString()
        }
        if (type === 'RAY' || (nOfDecimals > floatsTypes.WAD && nOfDecimals <= floatsTypes.RAY)) {
            return FixedNumber.fromString(formattedValue, 'fixed256x27').toHexString()
        }
        if (type === 'RAD' || (nOfDecimals > floatsTypes.RAY && nOfDecimals <= floatsTypes.RAD)) {
            return FixedNumber.fromString(formattedValue, 'fixed256x45').toHexString()
        }
        return FixedNumber.fromString(formattedValue, 'fixed256x18').toHexString()
    } catch (error) {
        console.error('toFixedString error:', error)
        return '0'
    }
}

// SUMMARIES

export const formatSummaryValue = (
    value: string | undefined,
    options: FormatOptions = { maxDecimals: 3 }
) => {
    if (!value) return undefined

    return {
        raw: value,
        formatted: formatNumberWithStyle(value, options),
    }
}

export const formatSummaryCurrency = (
    value: string | undefined,
    conversionFactor?: string
) => {
    if (!value) return undefined

    const usdRaw = (parseFloat(value) * parseFloat(conversionFactor || '0')).toString()
    const summary: SummaryItem<SummaryCurrency>['current'] = {
        raw: value,
        formatted: formatNumberWithStyle(value, { maxDecimals: 4 }),
        usdRaw,
        usdFormatted: formatNumberWithStyle(usdRaw, { style: 'currency' }),
    }
    return summary
}

export const formatSummaryPercentage = (
    value: string | undefined,
    scalingFactor?: number
) => {
    if (typeof value === 'undefined') return undefined

    return {
        raw: value,
        formatted: value && !isNaN(Number(value))
            ? formatNumberWithStyle(value, {
                scalingFactor,
                style: 'percent',
                maxDecimals: 4,
            })
            : '--%',
    }
}
