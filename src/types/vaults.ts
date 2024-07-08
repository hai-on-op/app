import { JsonRpcSigner } from '@ethersproject/providers/lib/json-rpc-provider'
import { Geb, type TokenData } from '@hai-on-op/sdk'

import type { SystemSate } from './system'
import type { FormattedBalance } from './wallet'

export type IVault = {
    id: string
    date: string
    vaultHandler: string
    riskState: number
    collateral: string
    debt: string
    totalDebt: string
    availableDebt: string
    accumulatedRate: string
    collateralRatio: string
    freeCollateral: string
    currentRedemptionPrice: string
    currentLiquidationPrice: string
    internalCollateralBalance: string
    liquidationCRatio: string
    liquidationPenalty: string
    liquidationPrice: string
    totalAnnualizedStabilityFee: string
    currentRedemptionRate: string
    collateralType: string
    collateralName: string
}

export type IVaultData = {
    totalCollateral: string
    totalDebt: string
    deposit: string
    withdraw: string
    borrow: string
    repay: string
    collateralRatio: number
    liquidationPrice: number
    isGnosisSafe?: boolean
    collateral: string
}

export type ILiquidationData = {
    currentRedemptionPrice: string
    currentRedemptionRate: string
    globalDebt: string
    perVaultDebtCeiling: string
    globalDebtCeiling: string
    collateralLiquidationData: { [key: string]: CollateralLiquidationData }
}

export type IVaultPayload = {
    vaultData: IVaultData
    signer: JsonRpcSigner
}

export type CollateralLiquidationData = {
    accumulatedRate: string
    currentPrice: {
        liquidationPrice: string
        safetyPrice: string
        value: string
    }
    debtFloor: string
    liquidationCRatio: string
    liquidationPenalty: string
    safetyCRatio: string
    totalAnnualizedStabilityFee: string
}

export type IVaultResponse = {
    collateral: string
    createdAt: string | null // Will be null in RPC mode;
    debt: string
    vaultHandler: string
    vaultId: string
    collateralType: string
}

// query responses for the vaults
export type ILiquidationResponse = {
    collateralLiquidationData: { [key: string]: CollateralLiquidationData }
    systemState: SystemSate
}

export type IUserVaultList = ILiquidationResponse & {
    erc20Balances: Array<{ balance: string }>
    vaults: Array<IVaultResponse>
}

export type IModifyVAULTCollateralization = {
    deltaDebt: string
    deltaCollateral: string
    createdAt: string
    createdAtTransaction: string
    accumulatedRate: string
}

export type ILiquidationFixedDiscount = {
    sellInitialAmount: string
    sellAmount: string
    createdAt: string
    createdAtTransaction: string
}

export type ISingleVault = {
    vaultId: string
    vaultHandler: string
    collateral: string
    createdAt: string | null // Will be null in RPC mode
    debt: string
    internalCollateralBalance: {
        balance: string
    }
    modifyVAULTCollateralization: Array<IModifyVAULTCollateralization> | null // Will be null over RPC;
    liquidationDiscount: Array<ILiquidationFixedDiscount> | null // Will be null over RPC
}
export type IVaultQuery = ILiquidationResponse & {
    erc20Balances: Array<{ balance: string }>
    vaults: Array<ISingleVault>
    userProxies: [
        {
            address: string
            coinAllowance: {
                amount: string
            } | null
        },
    ]
}

export type IFetchLiquidationDataPayload = {
    geb: Geb
    tokensData: Record<string, TokenData>
}

export type IFetchVaultsPayload = {
    address: string
    geb: Geb
    tokensData: { [key: string]: TokenData }
    chainId: number
}

export type IFetchVaultById = IFetchVaultsPayload & {
    vaultId: string
}

export type IManageVault = {
    vaultId: string
    owner: {
        id: string
    }
}

// NEW VAULT STUFF

export type AvailableVaultPair = {
    collateralName: string
    collateralLabel: string
    hasRewards: boolean
    collateralizationFactor: string
    stabilityFee: string
    apy: string
    eligibleBalance?: string
    myVaults?: IVault[]
}

export type FormState = {
    deposit?: string
    borrow?: string
    withdraw?: string
    repay?: string
}

export type Collateral = {
    name: string
    data?: TokenData
    total: SummaryItem<SummaryItemValue>
    balance: FormattedBalance
    priceInUSD?: string
    liquidationData?: CollateralLiquidationData
}

export type Debt = {
    data?: TokenData
    total: SummaryItem<SummaryItemValue>
    available: SummaryItemValue
    balance: FormattedBalance
    priceInUSD: string
}

// SUMMARY STUFF

/* eslint-disable-next-line */
export type SummaryItemValue<T = {}> = T & {
    raw: string
    formatted: string
}
/* eslint-disable-next-line */
export type SummaryItem<T = {}> = {
    current?: SummaryItemValue<T>
    after: SummaryItemValue<T>
}
export type SummaryCurrency = {
    usdRaw: string
    usdFormatted: string
}
