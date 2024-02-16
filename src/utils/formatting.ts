import numeral from 'numeral'
import { FixedNumber } from 'ethers'
import { formatEther, formatUnits } from 'ethers/lib/utils'

import type { FormattedBalance, SummaryCurrency, SummaryItem } from '~/types'
import { floatsTypes } from './constants'
import { sanitizeDecimals } from './helper'

export const returnWalletAddress = (walletAddress: string, endLength = 4) => {
    if (!walletAddress) return 'undefined'
    return `${walletAddress.slice(0, 4 + 2)}...${walletAddress.slice(-endLength)}`
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
    const nOfDigits = nOfWholeDigits > digits - 1 ? '00' : Array.from(Array(digits - nOfWholeDigits), () => 0).join('')
    let val
    if (round) {
        val = numeral(n).format(`0.${nOfDigits}`)
    } else {
        val = numeral(n).format(`0.${nOfDigits}`, Math.floor)
    }

    return isNaN(Number(val)) ? value : val
}

const MINIMUM_DECIMAL = 0.00001
type FormatOptions = {
    scalingFactor?: number
    maxDecimals?: number
    maxSigFigs?: number
    style?: 'currency' | 'percent'
    suffixed?: boolean
}
export const formatNumberWithStyle = (value: number | string, options: FormatOptions = {}) => {
    const { scalingFactor = 1, maxDecimals = 2, maxSigFigs = 2, style, suffixed = false } = options

    if (suffixed) return formatNumberWithSuffix(value, options)

    const scaledValue = scalingFactor * parseFloat((value || '0').toString())
    // truncate tiny amounts
    if (!!scaledValue && Math.abs(scaledValue) < MINIMUM_DECIMAL) {
        return `<${MINIMUM_DECIMAL.toLocaleString(undefined, {
            style,
            currency: style === 'currency' ? 'USD' : undefined,
            minimumSignificantDigits: 1,
        })}`
    }
    // if decimal, use signifcant digits instead of fraction digits
    const isLessThanOne = Math.abs(scaledValue) < 1
    return scaledValue.toLocaleString(undefined, {
        style,
        currency: style === 'currency' ? 'USD' : undefined,
        maximumFractionDigits: maxDecimals,
        ...(isLessThanOne && {
            minimumSignificantDigits: 1,
            maximumSignificantDigits: maxSigFigs || maxDecimals || 1,
        }),
    })
}

export const formatNumberWithSuffix = (value: number | string, options: FormatOptions = {}) => {
    const { scalingFactor = 1, maxDecimals = 3, style } = options

    const numValue = numeral(value).multiply(scalingFactor)
    const format = maxDecimals > 0 ? `0,0.[${'0'.repeat(maxDecimals)}]a` : '0,0a'
    const formatted = numValue.format(format).toUpperCase()
    switch (style) {
        case 'currency':
            return `$${formatted}`
        case 'percent':
            return `${formatted}%`
        default:
            return formatted
    }
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

    if (res < 0.01) return `${currency ? '$' : ''}${formatNumber(res.toString(), formatDecimal)}`

    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: formatDecimal,
        notation: compact ? 'compact' : 'standard',
        style: currency ? 'currency' : 'decimal',
        currency: 'USD',
    }).format(res)
}

export const toPercentage = (value: number, decimals: number) => {
    return `${formatDataNumber((value * 100).toString(), 0, decimals, false, false)}%`
}

export const getRatePercentage = (value: string, digits = 4, returnRate = false) => {
    const rate = Number(value)
    const ratePercentage = rate < 1 ? numeral(1).subtract(rate).value() * -1 : numeral(rate).subtract(1).value()

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

export const formatDate = (ms: number) => {
    return new Date(ms).toLocaleString().toString()
}

// SUMMARIES

export const formatSummaryValue = (value: string | undefined, options: FormatOptions = { maxDecimals: 3 }) => {
    if (!value) return undefined

    return {
        raw: value,
        formatted: formatNumberWithStyle(value, options),
    }
}

export const formatSummaryCurrency = (value: string | undefined, conversionFactor?: string) => {
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

export const formatSummaryPercentage = (value: string | undefined, scalingFactor?: number) => {
    if (typeof value === 'undefined') return undefined

    return {
        raw: value,
        formatted:
            value && !isNaN(Number(value))
                ? formatNumberWithStyle(value, {
                      scalingFactor,
                      style: 'percent',
                      maxDecimals: 1,
                  })
                : '--%',
    }
}

export const formatBalance = (valueE18: string): FormattedBalance => {
    const value = formatEther(valueE18)

    return {
        e18: valueE18,
        raw: value,
        formatted: formatNumberWithStyle(value, {
            maxDecimals: 4,
        }),
    }
}
