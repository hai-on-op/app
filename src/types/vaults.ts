import { JsonRpcSigner } from '@ethersproject/providers/lib/json-rpc-provider'
import { Geb, type TokenData } from '@hai-on-op/sdk'

import type { SystemSate } from './system'

export type ISafe = {
    id: string
    date: string
    safeHandler: string
    riskState: number
    collateral: string
    debt: string
    totalDebt: string
    availableDebt: string
    accumulatedRate: string
    collateralRatio: string
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

export type ISafeData = {
    totalCollateral: string
    totalDebt: string
    leftInput: string
    rightInput: string
    collateralRatio: number
    liquidationPrice: number
    isGnosisSafe?: boolean
    collateral: string
}

export type ILiquidationData = {
    currentRedemptionPrice: string
    currentRedemptionRate: string
    globalDebt: string
    perSafeDebtCeiling: string
    globalDebtCeiling: string
    collateralLiquidationData: { [key: string]: CollateralLiquidationData }
}

export type ISafePayload = {
    safeData: ISafeData
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

export type ISafeResponse = {
    collateral: string
    createdAt: string | null // Will be null in RPC mode;
    debt: string
    safeHandler: string
    safeId: string
    collateralType: string
}

// query responses for the safes
export type ILiquidationResponse = {
    collateralLiquidationData: { [key: string]: CollateralLiquidationData }
    systemState: SystemSate
}

export type IUserSafeList = ILiquidationResponse & {
    erc20Balances: Array<{ balance: string }>
    safes: Array<ISafeResponse>
}

export type IModifySAFECollateralization = {
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

export type ISingleSafe = {
    safeId: string
    safeHandler: string
    collateral: string
    createdAt: string | null // Will be null in RPC mode
    debt: string
    internalCollateralBalance: {
        balance: string
    }
    modifySAFECollateralization: Array<IModifySAFECollateralization> | null // Will be null over RPC;
    liquidationDiscount: Array<ILiquidationFixedDiscount> | null // Will be null over RPC
}
export type ISafeQuery = ILiquidationResponse & {
    erc20Balances: Array<{ balance: string }>
    safes: Array<ISingleSafe>
    userProxies: [
        {
            address: string
            coinAllowance: {
                amount: string
            } | null
        },
    ]
}

export type IFetchSafesPayload = {
    address: string
    geb: Geb
    tokensData: { [key: string]: TokenData }
    chainId: number
}

export type IFetchSafeById = IFetchSafesPayload & {
    safeId: string
}

export type IManageSafe = {
    safeId: string
    owner: {
        id: string
    }
}

// NEW VAULT STUFF

export type AvailableVaultPair = {
    collateralName: string,
    collateralizationFactor: string,
    apy: string,
    eligibleBalance?: string,
    myVaults?: ISafe[]
}

export type FormState = {
    deposit?: string,
    borrow?: string,
    withdraw?: string,
    repay?: string
}

export type Collateral = {
    name: string,
    data?: TokenData,
    total: string,
    available: string,
    balance: string,
    priceInUSD?: string,
    liquidationData?: CollateralLiquidationData
}

export type Debt = {
    total: string,
    data?: TokenData,
    available: string,
    balance: string,
    priceInUSD: string
}

// SUMMARY STUFF

/* eslint-disable-next-line */
export type SummaryItemValue<T = {}> = T & {
    raw: string,
    formatted: string
}
/* eslint-disable-next-line */
export type SummaryItem<T = {}> = {
    current?: SummaryItemValue<T>,
    after: SummaryItemValue<T>
}
export type SummaryCurrency = {
    usdRaw: string,
    usdFormatted: string
}
