/**
 * Minter Protocol Module
 *
 * Re-exports all minter protocol functionality for convenient importing.
 */

// Registry and configuration
export {
    MINTER_PROTOCOLS,
    MINTER_PROTOCOLS_TESTNET,
    getProtocolConfig,
    getProtocolByChain,
    getProtocolByCollateral,
    isMinterCollateral,
    getAllProtocolIds,
    getAllMinterCollateralIds,
    // Backward compatibility exports
    VELO_TOKEN_ADDRESS,
    VE_NFT_CONTRACT_ADDRESS,
    HAI_VELO_V2_TOKEN_ADDRESS,
    HAIVELO_V1_DEPOSITER_ADDRESS,
    HAI_REWARD_DISTRIBUTOR_ADDRESS,
    AERO_TOKEN_ADDRESS,
    VE_AERO_CONTRACT_ADDRESS,
    HAI_AERO_TOKEN_ADDRESS,
} from './registry'

// Service functions
export {
    calculateCollateralMapping,
    calculateBoostMap,
    calculateUserBoost,
    computeBoostApr,
    aggregateDeposits,
    isProtocolCollateral,
    getProtocolCollateralIds,
    supportsV1Migration,
    getTokenLabel,
    fetchLatestTransferAmount,
} from './service'

// Data source functions
export {
    fetchV1Safes,
    fetchV2Safes,
    fetchV2Totals,
    fetchV2UserBalance,
    fetchBaseTokenBalance,
    fetchVeNftsForOwner,
    fetchSafesAtBlock,
    fetchTotalsAtBlock,
    findBlockNumberByTimestamp,
    getLastEpochTotals,
    fetchAccountData,
    type MinterSafe,
    type FetchSafesResult,
    type TokenBalance,
    type VeNftData,
} from './dataSources'
