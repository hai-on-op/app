import { BigNumber } from 'ethers'
import {
    Geb,
    type TokenData,
    type TokenLiquidationData,
    fetchLiquidationData,
    fetchUserSafes,
    utils,
} from '@hai-on-op/sdk'
import type { ILiquidationResponse, IUserVaultList } from '~/types'

type UserListConfig = {
    geb: Geb
    address: string
    tokensData: Record<string, TokenData>
    proxy_not?: null
    safeId_not?: null
}

// returns LiquidationData
const getLiquidationDataRpc = async (
    geb: Geb,
    tokensData: Record<string, TokenData>
): Promise<ILiquidationResponse> => {
    const liquidationData = await fetchLiquidationData(geb, tokensData)

    const systemState = {
        currentRedemptionPrice: {
            value: parseRay(liquidationData.redemptionPrice),
        },
        currentRedemptionRate: {
            // Calculate 8h exponentiation of the redemption rate
            annualizedRate: Math.pow(Number(parseRay(liquidationData.redemptionRate)), 3600 * 24 * 365).toString(),
        },
        globalDebt: parseRad(liquidationData.globalDebt),
        globalDebtCeiling: parseRad(liquidationData.globalDebtCeiling),
        perSafeDebtCeiling: parseWad(liquidationData.safeDebtCeiling),
    }

    const parsedLiquidationData = liquidationData.tokensLiquidationData.map((tokenLiquidationData) =>
        parseTokenLiquidationData(liquidationData.redemptionPrice, tokenLiquidationData)
    )

    const collateralLiquidationData = Object.keys(tokensData).reduce(
        (accumulator, key, index) => ({
            ...accumulator,
            [key]: parsedLiquidationData[index],
        }),
        {}
    )

    return {
        systemState,
        collateralLiquidationData,
    }
}

function parseTokenLiquidationData(redemptionPrice: BigNumber, tokenLiquidationData: TokenLiquidationData) {
    return {
        accumulatedRate: parseRay(tokenLiquidationData.accumulatedRate),
        currentPrice: {
            liquidationPrice: parseRay(tokenLiquidationData.liquidationPrice),
            safetyPrice: parseRay(tokenLiquidationData.safetyPrice),
            // Price not directly available but can be calculated
            // Price feed price = safetyPrice * safetyCRatio * redemptionPrice
            value: parseRad(
                tokenLiquidationData.safetyPrice
                    .mul(tokenLiquidationData.safetyCRatio)
                    .mul(redemptionPrice)
                    .div(BigNumber.from(10).pow(36))
            ),
        },
        debtFloor: parseRad(tokenLiquidationData.debtFloor),
        liquidationCRatio: parseRay(tokenLiquidationData.liquidationCRatio),
        liquidationPenalty: parseWad(tokenLiquidationData.liquidationPenalty),
        safetyCRatio: parseRay(tokenLiquidationData.safetyCRatio),
        totalAnnualizedStabilityFee: Math.pow(
            Number(parseRay(tokenLiquidationData.stabilityFee)),
            3600 * 24 * 365 // Second per year
        ).toString(),
    }
}

// Returns list of user vaults
const getUserVaultsRpc = async (config: UserListConfig): Promise<IUserVaultList> => {
    const [userCoinBalance, vaultsData] = await fetchUserSafes(config.geb, config.address)

    const vaults = vaultsData.map((vault) => ({
        collateral: parseWad(vault.lockedCollateral),
        freeCollateral: parseWad(vault.freeCollateral),
        debt: parseWad(vault.generatedDebt),
        createdAt: null,
        vaultHandler: vault.addy,
        vaultId: vault.id.toString(),
        collateralType: vault.collateralType,
    }))

    return {
        vaults,
        erc20Balances: [{ balance: parseWad(userCoinBalance) }],
        ...(await getLiquidationDataRpc(config.geb, config.tokensData)),
    }
}

export const gebManager = {
    getUserVaultsRpc,
    getLiquidationDataRpc,
}

// Helper functions
export const parseWad = (val: BigNumber) => utils.wadToFixed(val).toString()
export const parseRay = (val: BigNumber) => utils.rayToFixed(val).toString()
export const parseRad = (val: BigNumber) => utils.radToFixed(val).toString()
