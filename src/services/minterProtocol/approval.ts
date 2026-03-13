import { BigNumber, ethers } from 'ethers'

export type RequiredErc20ApprovalItem = {
    kind: 'ERC20'
    label: string
    amount: string
    tokenAddress: string
    decimals: string
    spender: string
}

type BuildRequiredErc20ApprovalItemParams = {
    label: string
    amount: string
    tokenAddress?: string
    decimals?: string | number
    spender?: string
    allowance?: BigNumber
}

function sanitizeApprovalAmount(value: string, decimals: number) {
    const formattedValue = value.replace(/[^0-9.]/g, '')
    const [integer, decimal] = formattedValue.split('.')
    const formattedDecimal = decimal ? `.${decimal.slice(0, decimals)}` : ''
    return formattedDecimal ? `${integer}${formattedDecimal}` : integer
}

/**
 * Treat an unknown allowance as requiring approval so the UI cannot skip the
 * approval step while the allowance query is still loading.
 */
export function buildRequiredErc20ApprovalItem(
    params: BuildRequiredErc20ApprovalItemParams
): RequiredErc20ApprovalItem | undefined {
    const { label, amount, tokenAddress, spender, allowance } = params
    const decimals = Number(params.decimals || 18)
    const cleanAmount = String(amount || '0').replace(/[^0-9.]/g, '')
    const amountNum = parseFloat(cleanAmount)

    if (!tokenAddress || !spender || !isFinite(amountNum) || amountNum <= 0) {
        return undefined
    }

    const neededWei = ethers.utils.parseUnits(sanitizeApprovalAmount(cleanAmount, decimals), decimals)
    if (allowance && allowance.gte(neededWei)) {
        return undefined
    }

    return {
        kind: 'ERC20',
        label,
        amount: cleanAmount,
        tokenAddress,
        decimals: decimals.toString(),
        spender,
    }
}
