import axios from 'axios'
import type { IFetchLiquidationDataPayload, IFetchVaultsPayload, IUserVaultList } from '~/types'
import { formatUserVault, gebManager } from '~/utils'


// AERO price cache to avoid repeated API calls
let aeroPriceCache: { price: string; timestamp: number } | null = null
const AERO_PRICE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const AERO_FALLBACK_PRICE = '0.44' // Fallback price if all fetches fail

// Fetch AERO price with caching and multiple fallback sources
const fetchAeroPrice = async (): Promise<string> => {
    // Return cached price if still valid
    if (aeroPriceCache && Date.now() - aeroPriceCache.timestamp < AERO_PRICE_CACHE_TTL) {
        return aeroPriceCache.price
    }

    // Try DeFiLlama first (better CORS support)
    try {
        const res = await axios.get(
            'https://coins.llama.fi/prices/current/base:0x940181a94A35A4569E4529A3CDfB74e38FD98631',
            { timeout: 5000 }
        )
        const price = res.data?.coins?.['base:0x940181a94A35A4569E4529A3CDfB74e38FD98631']?.price
        if (price) {
            const priceStr = price.toString()
            aeroPriceCache = { price: priceStr, timestamp: Date.now() }
            return priceStr
        }
    } catch (error) {
        console.warn('[fetchAeroPrice] DeFiLlama failed, trying fallback:', error)
    }

    // Fallback: try CoinGecko (may have CORS issues in browser)
    try {
        const res = await axios.get(
            'https://api.coingecko.com/api/v3/simple/price?ids=aerodrome-finance&vs_currencies=usd',
            { timeout: 5000 }
        )
        const price = res.data?.['aerodrome-finance']?.usd
        if (price) {
            const priceStr = price.toString()
            aeroPriceCache = { price: priceStr, timestamp: Date.now() }
            return priceStr
        }
    } catch (error) {
        console.warn('[fetchAeroPrice] CoinGecko also failed:', error)
    }

    // Return cached price if we have one (even if stale), otherwise fallback
    if (aeroPriceCache) {
        console.warn('[fetchAeroPrice] Using stale cached price')
        return aeroPriceCache.price
    }

    console.warn('[fetchAeroPrice] All sources failed, using fallback price')
    return AERO_FALLBACK_PRICE
}

// Create HAIAERO liquidation data with correct AERO price
const createHaiAeroLiquidationData = (
    baseData: Record<string, unknown>,
    aeroPrice: string,
    redemptionPrice: string
) => {
    // Calculate the safety price and liquidation price based on AERO's USD price
    // These are used for collateralization ratio calculations
    const safetyCRatio = baseData.safetyCRatio as string || '1.35'
    const liquidationCRatio = baseData.liquidationCRatio as string || '1.2'

    // The currentPrice.value should be the USD price of the collateral
    return {
        ...baseData,
        currentPrice: {
            ...(baseData.currentPrice as Record<string, string> || {}),
            value: aeroPrice, // Use actual AERO price
            // Safety price = price / safetyCRatio / redemptionPrice
            safetyPrice: (parseFloat(aeroPrice) / parseFloat(safetyCRatio) / parseFloat(redemptionPrice)).toString(),
            liquidationPrice: (parseFloat(aeroPrice) / parseFloat(liquidationCRatio) / parseFloat(redemptionPrice)).toString(),
        },
    }
}

export const fetchUserVaults = async (config: IFetchVaultsPayload) => {
    // Filter out HAIAERO from tokensData for the raw fetch (SDK doesn't support it yet)
    const filteredConfig = {
        ...config,
        tokensData: Object.fromEntries(
            Object.entries(config.tokensData).filter(([key]) => key !== 'HAIAERO')
        ),
    }

    const response = await fetchUserVaultsRaw(filteredConfig)
    if (!response) return

    const vaultsResponse: IUserVaultList = response

    // Inject HAIAERO liquidation data with correct AERO price
    const collateralLiquidationData = { ...vaultsResponse.collateralLiquidationData }
    if (!collateralLiquidationData.HAIAERO && collateralLiquidationData.HAIVELOV2) {
        const aeroPrice = await fetchAeroPrice()
        const redemptionPrice = vaultsResponse.systemState.currentRedemptionPrice.value
        collateralLiquidationData.HAIAERO = createHaiAeroLiquidationData(
            collateralLiquidationData.HAIVELOV2,
            aeroPrice,
            redemptionPrice
        )
    }

    const liquidationData = {
        collateralLiquidationData,
        currentRedemptionPrice: vaultsResponse.systemState.currentRedemptionPrice.value,
        currentRedemptionRate: vaultsResponse.systemState.currentRedemptionRate.annualizedRate,
        globalDebt: vaultsResponse.systemState.globalDebt,
        globalDebtCeiling: vaultsResponse.systemState.globalDebtCeiling,
        perVaultDebtCeiling: vaultsResponse.systemState.perSafeDebtCeiling,
    }

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
    // Filter out HAIAERO from tokensData for the SDK fetch (SDK doesn't support it yet)
    const filteredTokensData = Object.fromEntries(
        Object.entries(config.tokensData).filter(([key]) => key !== 'HAIAERO')
    )

    const response = await gebManager.getLiquidationDataRpc(config.geb, filteredTokensData)

    // Inject HAIAERO liquidation data with correct AERO price
    const collateralLiquidationData = { ...response.collateralLiquidationData }
    if (!collateralLiquidationData.HAIAERO && collateralLiquidationData.HAIVELOV2) {
        const aeroPrice = await fetchAeroPrice()
        const redemptionPrice = response.systemState.currentRedemptionPrice.value
        collateralLiquidationData.HAIAERO = createHaiAeroLiquidationData(
            collateralLiquidationData.HAIVELOV2,
            aeroPrice,
            redemptionPrice
        )
    }

    const liquidationData = {
        collateralLiquidationData,
        currentRedemptionPrice: response.systemState.currentRedemptionPrice.value,
        currentRedemptionRate: response.systemState.currentRedemptionRate.annualizedRate,
        globalDebt: response.systemState.globalDebt,
        globalDebtCeiling: response.systemState.globalDebtCeiling,
        perVaultDebtCeiling: response.systemState.perSafeDebtCeiling,
    }
    return liquidationData
}
