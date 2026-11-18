import type { IFetchLiquidationDataPayload, IFetchVaultsPayload, ILiquidationResponse } from '~/types'
import { formatUserVault, gebManager } from '~/utils'

function formatLiquidationData({ systemState, collateralLiquidationData }: ILiquidationResponse) {
    return {
        collateralLiquidationData,
        currentRedemptionPrice: systemState.currentRedemptionPrice.value,
        currentRedemptionRate: systemState.currentRedemptionRate.annualizedRate,
        globalDebt: systemState.globalDebt,
        globalDebtCeiling: systemState.globalDebtCeiling,
        perVaultDebtCeiling: systemState.perSafeDebtCeiling,
    }
}

export const fetchUserVaults = async (config: IFetchVaultsPayload) => {
    const vaultsResponse = await fetchUserVaultsRaw(config)
    if (!vaultsResponse) return

    const liquidationData = formatLiquidationData(vaultsResponse)
    const userVaults = formatUserVault(vaultsResponse.vaults, liquidationData, config.tokensData)
    return {
        userVaults,
        availableHAI: vaultsResponse.erc20Balances?.length ? vaultsResponse.erc20Balances[0].balance : '0',
        liquidationData,
    }
}

export const fetchUserVaultsRaw = async (config: IFetchVaultsPayload) => {
    const { address, geb } = config

    if (!geb || !config.tokensData) return
    const response = await gebManager.getUserVaultsRpc({
        address: address.toLowerCase(),
        geb,
        tokensData: config.tokensData,
    })

    return response
}

export const fetchLiquidationData = async (config: IFetchLiquidationDataPayload) => {
    const response = await gebManager.getLiquidationDataRpc(config.geb, config.tokensData)

    return formatLiquidationData(response)
}
