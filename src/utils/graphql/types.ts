export type QuerySystemState = {
    id?: 'current'
    safeCount: string // Number of Safes opened through the manager (GebSafeManager)
    unmanagedSafeCount: string // Number of Safes NOT opened through the manager (GebSafeManager)
    totalActiveSafeCount: string // Total number of Safes with debt > 0 and/or collateral > 0
    proxyCount: string // Number of user proxies created
    globalDebt: string // Total debt issued across all collateral types
    globalDebt24hAgo: string // Global debt from 24h ago to calculate 24h TVL % change
    globalUnbackedDebt: string // Total unbacked debt across all collateral types
    globalDebtCeiling: string // Global debt ceiling
    perSafeDebtCeiling: string // Individual safe debt limit
    collateralCount: string // Number of collateral types registered
    globalStabilityFee: string // Base per second stability fee applied to all collateral types
    savingsRate: string // Savings rate
    collateralAuctionCount: string // Number of collateral auctions started
    currentRedemptionRate: QueryRedemptionRate // Latest redemption rate
    currentRedemptionPrice: QueryRedemptionPrice // Latest redemption price
    currentCoinMedianizerUpdate: QueryMedianizerUpdate // Latest Coin medianizer update
    erc20CoinTotalSupply: string // Total supply of COIN outside of the system, equals to ERC20.totalSupply() of Coin
    lastPeriodicUpdate?: string // Last time the periodic update function was called
    createdAt?: string // Timestamp of the block at which the system was created [seconds]
    coinAddress?: string // Coin contract address
    wethAddress?: string // WETH collateral address
    coinUniswapPair?: QueryUniswapPair // Coin uniswap pair address
    systemSurplus: string // System surplus in the accounting engine
    debtAvailableToSettle: string // Debt available to settle in the accounting engine
    createdAtBlock?: string // Block number at which the system was created
    createdAtTransaction?: string // Hash of the transaction that started to create the system
    modifiedAt?: string // Timestamp of the block at which the system was last modified [seconds]
    modifiedAtBlock?: string // Block number at which the system was last modified
    modifiedAtTransaction?: string // Transaction hash at which the system was last modified
}

export type QueryCollateralType = {
    id: string // Collateral type name
    debtAmount: string // Total debt backed by this collateral type
    totalCollateral: string // Total collateral deposited in the system (deposited in this collateral's specific adapter)
    totalCollateralLockedInSafes: string // Total collateral deposited in the system and locked in Safes
    accumulatedRate: string // Total interest accrued on this collateral type
    unmanagedSafeCount: string // Number of Safes backed by this collateral type and NOT opened through the manager (GebSafeManager)
    safeCount: string // Number of Safes backed by this collateral type that were opened through the manager (GebSafeManager)
    currentPrice?: QueryCollateralPrice // Current market price
    stabilityFee: string // Per second stability fee
    totalAnnualizedStabilityFee: string // Total annualized stability calculated with solidity. It takes into account the global SF. Equals to (global SF + collateral SF)^(second per year)
    debtCeiling: string // Debt ceiling/upper limit
    debtFloor: string // Minimum permitted debt per Safe/lower limit
    safetyCRatio: string // Collateral price with safety margin. Used to limit the amount of debt that can be generated per one unit of collateral
    liquidationCRatio: string // Collateral price with liquidation margin. Used only in LiquidationEngine when a Safe is liquidated
    liquidationPenalty: string // Penalty applied to every liquidation involving this collateral type
    collateralAuctionHouseAddress: string // Address of the auction smart contract handling this collateral type
    // auctionType: AuctionType // Type of collateral auction
    liquidationQuantity: string // Max amount of system coins to sell in one auction
    liquidationsStarted: string // Number of liquidations started
    activeLiquidations: string // Number of active liquidations
    // englishAuctionConfiguration: EnglishAuctionConfiguration // Auction configuration (English only)
    stabilityFeeLastUpdatedAt?: string // Time of the last stability fee update
    createdAt?: string // Timestamp of the block at which this collateral type was added [seconds]
    createdAtBlock?: string // Block number at which this collateral type was added
    createdAtTransaction?: string // Hash of the transaction that added this collateral type
    modifiedAt?: string // Timestamp of the block at which this collateral type was last modified [seconds]
    modifiedAtBlock?: string // Block number at which this collateral type was last modified
    modifiedAtTransaction?: string // Hash of the transaction that last modified this collateral type
}
export type QuerySafeCollateralType = {
    id: string // Collateral type name
    safetyCRatio: string // Collateral price with safety margin. Used to limit the amount of debt that can be generated per one unit of collateral
    liquidationCRatio: string // Collateral price with liquidation margin. Used only in LiquidationEngine when a Safe is liquidated
    currentPrice: QueryCollateralPrice // Current market price
}

export type QueryCollateralPrice = {
    id?: string // Equal to: <tx hash>-<log index>
    block?: string // Block number
    timestamp: string // Timestamp in seconds
    collateral?: QueryCollateralType // Collateral type
    safetyPrice: string // Price of the collateral divided by the redemptionPrice and then divided again by the safetyCRatio
    liquidationPrice: string // Price of the collateral divided by the redemptionPrice and then divided again by the liquidationCRatio
    value: string // Collateral price in denomination currency
}

export type QueryRedemptionPrice = {
    id?: string // Equals to: <tx hash>-<log index>
    block?: string // Block number
    timestamp: string // Timestamp in seconds
    redemptionRate: string // The rate of change of the redemption price
    value: string // Redemption price value
}

export type QueryRedemptionRate = {
    id?: string // Equal to: <tx hash>-<log index>
    perSecondRate: string // The rate of change of the redemption price
    eightHourlyRate: string // 8 hour redemption rate
    twentyFourHourlyRate: string // 24 hour redemption rate
    hourlyRate: string // One hour redemption rate
    annualizedRate: string // Annualized redemption rate
    createdAt?: string // Timestamp of the block at which this rate was created [seconds]
    createdAtBlock?: string // Block number at which this rate was created
    createdAtTransaction?: string // Hash of the transaction that created this rate
}

export type QueryMedianizerUpdate = {
    id: string // Equal to: <tx hash>-<log index>
    medianizerAddress: string // FSM address
    symbol: string // Price pair symbol
    value: string // The rate of change of the redemption price
    createdAt?: string // Timestamp of the block at which this transaction was executed [seconds]
    createdAtBlock?: string // Block number at which this transaction was executed
    createdAtTransaction?: string // Hash of the transaction that executed this exit
}

export type QuerySafe = {
    id?: string // Equal to: <SafeHandler>-<CollateralType>
    safeId: string // Safe ID if this Safe was created through the Safe Manager (GebSafeManager)
    collateralType: QuerySafeCollateralType // Collateral type associated with this Safe
    collateral: string // Amount of collateral locked in the Safe
    debt: string // Outstanding Safe debt
    cRatio: string // Current CRatio for this Safe
    safeHandler?: string // The address of the Safe handler (ownership at the SAFEEngine level if the Safe was created using GebSafeManager)
    owner: QueryUser // Address of the Safe owner (top level ownership)
    proxy?: QueryUserProxy // Optional proxy address (if the owner used a proxy to create the Safe)
    createdAt: string // Timestamp of the block at which this Safe was opened [seconds]
    createdAtBlock?: string // Block number at which this Safe was opened
    createdAtTransaction?: string // Hash of the transaction that opened the Safe
    internalCollateralBalance?: QueryInternalCollateralBalance // Collateral balance of the safeHandler
    internalCoinBalance?: QueryInternalCoinBalance // Coin balance of the safe handler
    modifiedAt?: string // Timestamp of the block at which this Safe was last modified [seconds]
    modifiedAtBlock?: string // Block number at which this Safe was last modified
    modifiedAtTransaction?: string // Hash of the transaction that last modified the Safe
    saviour: QuerySafeSaviour // Saviour contract helping to prevent liquidation

    modifySAFECollateralization?: QueryModifySAFECollateralization[] // List of CRatio changes
    liquidationDiscount?: QueryDiscountAuction[] // List of discount auctions associated with this Safe
    liquidationEnlish?: QueryEnglishAuction[] // List of English auctions associated with this Safe
}

export type QuerySystemStateData = {
    systemStates: [QuerySystemState]
    collateralTypes: QueryCollateralType[]
    // dailyStats: [QueryHistoricalStat],
    // redemptionRates: [QueryRedemptionRate],
    // safes: [QuerySafe]
}

export type QueryUniswapPair = {
    id: string // Pair address
    address: string // Contract address of the pair
    label: string // Pair name/label
    token0: string // Base token address
    token1: string // Quote token address
    sqrtPriceX96: string // SqrtPriceX96
    createdAt?: string // Timestamp of the block at which the pair was created [unix time]
    createdAtBlock?: string // Block number at which the pair was created
    createdAtTransaction?: string // Hash of the transaction that started to create the pair
    modifiedAt?: string // Timestamp of the block at which the pair was last modified [unix time]
    modifiedAtBlock?: string // Block number at which the pair was last modified
    modifiedAtTransaction?: string // Hash of the tx that last modified the pair
}

export type QueryHistoricalStat = {
    id?: string // Block timestamp / 86400
    timestamp: string // Time of the snapshot
    blockNumber?: string // Block Number
    redemptionRate: QueryRedemptionRate // Redemption rate
    redemptionPrice: QueryRedemptionPrice // Redemption price
    marketPriceUsd: string // Price of COIN in USD (Uniswap pool price * ETH median price)
    marketPriceEth: string // Price of COIN in ETH (Uniswap v2 pool price)
    globalDebt: string // Global debt
    erc20CoinTotalSupply: string // ERC20 COIN Supply
}

export type QueryUser = {
    address: string
}

export type QueryUserProxy = {
    id: string // Proxy address
    address: string // Proxy contract address
    coinAllowance?: QueryERC20Allowance // Allowance of the proxy to spend its owner RAIs (Useful when we need to repay debt)
    protAllowance?: QueryERC20Allowance // Allowance of the proxy to spend its owner prot tokens (Useful when we need to repay debt)
    uniCoinLpAllowance?: QueryERC20Allowance // Allowance of the proxy to spend its owner uni LP shares (Useful when we need to repay debt)
    owner: QueryUser // Owner address
}

export type QueryERC20Allowance = {
    id?: string // Equal to: <tokenAddress>-<allowedAddress>-<approvedAddress>
    tokenAddress: string // Address of the ERC20 token
    label: string // Static label such as COIN, GOV, COIN_UNI_POOL to identify the asset
    address: string // Account that allows others to spend
    balance: QueryERC20Balance // Balance that can be spent
    approvedAddress: string // Address being approved to spend the balance
    amount: string // Current token allowance
    modifiedAt?: string // Timestamp of the block at which this balance was last modified [unix time]
    modifiedAtBlock?: string // Block number at which this balance was last modified
    modifiedAtTransaction?: string // Hash of the transaction that last modified the allowance
}

export type QueryERC20Balance = {
    id?: string // <tokenAddress>-<address>
    tokenAddress: string // Address of the ERC20 token
    label: string // Static label such as COIN, GOV, COIN_UNI_POOL to identify the asset
    address: string // Address of the owner that has the balance
    owner: QueryUser // Either the address or the owner of the proxy if the address is a Proxy
    balance: string // Balance amount
    modifiedAt?: string // Timestamp of the block at which this balance was last modified [unix time]
    modifiedAtBlock?: string // Block number at which this balance was last modified
    modifiedAtTransaction?: string // Hash of the transaction that last modified the balance

    approvals?: QueryERC20Allowance[] // List of spend allowances (addresses that can spend the balance)
}

export type QueryInternalCollateralBalance = {
    id?: string // Equal to: <accountHandler>-<CollateralType>
    accountHandler?: string // Account ownership at the SafeEngine level
    owner: QueryUser // Ultimate owner of the balance
    collateralType: QueryCollateralType // Collateral type
    proxy: QueryUserProxy // Proxy address (if the balance belongs to a proxy)
    balance: string // Actual balance
    createdAt?: string // Timestamp of the block at which this balance was created [seconds]
    createdAtBlock?: string // Block number at which this balance was created
    createdAtTransaction?: string // Hash of the transaction that created this balance
    modifiedAt?: string // Timestamp of the block at which this balance was last modified [seconds]
    modifiedAtBlock?: string // Block number at which this balance was last modified
    modifiedAtTransaction?: string // Hash of the transaction that last modified this transaction
}

export type QueryInternalCoinBalance = {
    id?: string // Equals to: <accountHandler>
    accountHandler?: string // Account ownership at the SafeEngine level
    owner: QueryUser // Ultimate owner of the balance (the accountHandler or the proxy)
    proxy: QueryUserProxy // Proxy address (if the balance belongs to a proxy)
    balance: string // Actual balance
    createdAt?: string // Timestamp of the block at which this balance was first created [seconds]
    createdAtBlock?: string // Block number at which this balance was first created
    createdAtTransaction?: string // Hash of the transaction that first created this balance
    modifiedAt?: string // Timestamp of the block at which this balance was last modified [seconds]
    modifiedAtBlock?: string // Block number at which this balance was last modified
    modifiedAtTransaction?: string // Hash of the transaction that last modified this balance
}

export type QuerySafeSaviour = {
    id: string // Contract address
    allowed: boolean // If the saviour is currently allowed in the liquidation engine
    successSaveCount?: string // Counter of successful save
    failSaveCount?: string // Counter of failed save

    safes?: QuerySafe[] // List of safe protected by the saviour
}

export type QueryModifySAFECollateralization = {
    id: string // Equal to: <TX hash>-<Log index>
    safe?: QuerySafe // Safe modified
    safeHandler?: string // safeHandler address (ownership at the SAFEEngine level)
    collateralType?: QueryCollateralType // Collateral type of the modification
    deltaCollateral: string // Change in collateral
    deltaDebt: string // Change in debt
    accumulatedRate: string // Accumulated rate at the time of the transaction
    createdAt: string // Timestamp of the modification [seconds]
    createdAtBlock?: string // Block number at which the modification happened
    createdAtTransaction: string // Hash of the transaction that made the modification
}

export type QueryConfiscateSAFECollateralAndDebt = {
    id: string // Equal to: <TX hash>-<Log index>
    safe?: QuerySafe // Safe modified
    safeHandler?: string // safeHandler address (ownership at the SAFEEngine level)
    collateralType?: QueryCollateralType // Collateral type of the confisaction
    deltaCollateral: string // Change in collateral
    deltaDebt: string // Change in debt
    debtCounterparty?: string // Who to give/take the debt to
    collateralCounterparty?: string // Who to give/take the collateral to
    globalUnbackedDebt?: string // Total amount of unbacked debt
    createdAt: string // Timestamp of the confiscation [seconds]
    createdAtBlock?: string // Block number at which the confiscation happened
    createdAtTransaction: string // Hash of the transaction that made the confiscation
}

export type QueryDiscountAuction = {
    id?: string // Equal to: <Auction house address>-<auction ID>
    auctionId: string // Auction incremental id
    collateralType?: QueryCollateralType // Auction collateral type
    safeHandler?: string // Safe handler address in the SafeEngine
    sellInitialAmount: string // Total collateral for sale at the start of the auction
    amountToRaise: string // Max amount of system coins to raise
    buyAmount: string // Amount of system coins raised so far
    sellAmount: string // Cumulative collateral amount sold so far
    safe: QuerySafe // Liquidated Safe
    startedBy: string // Address that started the auction
    numberOfBatches: string // Number of individual batches of collateral sold
    isSettled: boolean // Whether the settle function that returns remaining collateral to the Safe was called
    createdAt: string // Timestamp of the block in which the auction started
    createdAtBlock?: string // Block number at which the auction started
    createdAtTransaction?: string // Hash of the transaction that started the auction

    batchSold?: QueryDiscountAuctionBatch[]
}

export type QueryDiscountAuctionBatch = {
    id?: string // Equal to: <Auction house address>-<auction id>-<batch number>
    batchNumber: string // Incremental batch id
    auction: QueryDiscountAuction // Auction in which the batch was sold
    buyAmount: string // Amount of tokens bought in the batch
    sellAmount: string // Amount of collateral sold in the batch
    price: string // Collateral price
    buyer: string // Bidder address
    createdAt: string // Timestamp of the block at which the batch was created
    createdAtBlock?: string // Block number at which the batch was created
    createdAtTransaction?: string // Hash of the transaction that created the batch
}

export type QueryEnglishAuction = {
    id?: string // Collateral type name or 'DEBT', 'SURPLUS_PRE' or 'SURPLUS_POST'. Equal to <collateral type>-<auction id>
    auctionId: string // Incremental auction id
    englishAuctionType: QueryEnglishAuctionType // Whether the auction handles collateral, surplus or debt
    sellToken: QueryAuctionToken // Token/coin being sold
    buyToken: QueryAuctionToken // Token/coin being bought
    sellInitialAmount: string // Amount of tokens that the system is selling at the start of the auction
    buyInitialAmount: string // Amount of tokens that the system is buying at the start of the auction
    sellAmount: string // Amount of tokens that the system is currently selling in the auction
    buyAmount: string // Amount of tokens that that are currently being bought in the auction
    price: string // Sell price (sellAmount / buyAMount) of the best offer
    targetAmount?: string // Used for collateral auctions only. Threshold of buyToken at which the system starts to decrease the amount sold
    winner: string // Auction winner
    startedBy: string // Address that started the auction
    isClaimed: boolean // Whether the bought tokens were claimed by the auction winner
    numberOfBids?: string // Total number of bids
    auctionDeadline: string // Deadline for the auction after which no more bids can be placed
    englishAuctionConfiguration?: QueryEnglishAuctionConfiguration // Auction configuration
    safe: QuerySafe // Used only for collateral auctions. This is the Safe that got liquidated
    createdAt: string // Timestamp of the block at which the auction started
    createdAtBlock?: string // Block number at which the auction started
    createdAtTransaction?: string // Hash of the transaction that started the auction

    englishAuctionBids?: QueryEnglishAuctionBid[] // List of individual bids
}

export type QueryEnglishAuctionType = 'LIQUIDATION' | 'DEBT' | 'SURPLUS' | 'STAKED_TOKEN'

export type QueryAuctionToken = 'COIN' | 'COLLATERAL' | 'PROTOCOL_TOKEN' | 'PROTOCOL_TOKEN_LP'

export type QueryEnglishAuctionConfiguration = {
    id: string // Collateral type name, 'DEBT' or 'SURPLUS'
    LIQUIDATION_collateralType: QueryCollateralType // Collateral type
    bidIncrease: string // Minimum bid increase (e.g 1.05 means a minimum 5% increase for the next bid compared to the current one)
    bidDuration: string // How long the auction lasts after a new bid is submitted
    totalAuctionLength: string // Maximum auction length
    DEBT_amountSoldIncrease?: string // Increase in amount sold upon auction restart (used only for DEBT auctions)
}

export type QueryEnglishAuctionBid = {
    id?: string // Collateral type name or 'DEBT', 'SURPLUS_PRE' or 'SURPLUS_POST'. Equal to: <collateral type>-<auction id>-<bid number>
    bidNumber: string // Incremental bid id
    type: QueryEnglishBidType // Bid type, either increase buy or decrease sell
    auction?: QueryEnglishAuction // Auction to which the bid belongs (if it's a bid on a collateral auction)
    sellAmount: string // How many tokens/coins are sold in the auction
    buyAmount: string // How many tokens are being bought from the auction
    price: string // Price of the asset being sold (sellAmount / buyAmount)
    bidder: string // Bidder address
    owner?: string // Owner of proxy 'Bidder' address (if exists)
    createdAt: string // Timestamp of the block at which the liquidation started
    createdAtBlock?: string // Block number at which the liquidation started
    createdAtTransaction?: string // Hash of the transaction that started the liquidation
}

export type QueryEnglishBidType = 'INCREASE_BUY' | 'DECREASE_SOLD'

export type QueryAuctionRestarts = {
    auctionId: string
    englishAuctionType: QueryEnglishAuctionType
    auctionRestartTimestamps: string[]
    auctionRestartHashes: string[]
}

export type QueryLiquidityPool = {
    id: string // Address of pool
    name: string // Name of pool
    inputTokens: {
        symbol: string
    }[]
    inputTokenBalances: [string, string]
    totalValueLockedUSD: string
}

export type QueryLiquidityPoolWithPositions = QueryLiquidityPool & {
    positions: {
        account: {
            id: string
        }
        cumulativeDepositUSD: string
        cumulativeDepositTokenAmounts: [string, string]
        cumulativeWithdrawUSD: string
        cumulativeWithdrawTokenAmounts: [string, string]
    }[]
}
