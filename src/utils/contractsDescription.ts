// temporary: We can add this values to the SDK
export const contractsDescriptions: { [k: string]: string } = {
    safeEngine:
        'The VaultEngine contract is the core of HAI Protocol. It is responsible for having the accountance of all opened Vaults.',
    accountingEngine:
        'The AccountingEngine contract is responsible for the accounting of HAI Protocol. Holds both system surplus and debt, and auctions them off when necessary.',
    taxCollector:
        'The TaxCollector contract is responsible for collecting the Stability Fee from Vaults and sending it to the StabilityFeeTreasury.',
    liquidationEngine: 'The LiquidationEngine contract is responsible for the liquidation of Vaults.',
    oracleRelayer:
        'The OracleRelayer centralizes the oracle price feeds and provides a single price feed for the system.',
    globalSettlement: 'The GlobalSettlement contract is responsible for the global settlement of HAI Protocol.',
    debtAuctionHouse:
        'The DebtAuctionHouse contract is responsible for the creation and execution of all Debt Auctions.',
    surplusAuctionHouse:
        'The SurplusAuctionHouse contract is responsible for the creation and execution of all Surplus Auctions.',
    stabilityFeeTreasury:
        'The StabilityFeeTreasury contract is responsible for the collection of the Stability Fee from the TaxCollector and the distribution of the Stability Fee to the Protocol Token Holders.',
    safeManager: 'The VaultManager contract is responsible for the creation and execution of Vaults.',
    joinCoin: 'The JoinCoin allows users to join and exit the system with the Coin',
    systemCoin:
        'The System Coin contract is the ERC20 token (HAI) that is used to mint or burn debts within the system.',
    proxyFactory: 'The ProxyFactory contract hosts proxy ownership and facilitates deployment.',
    medianizerCoin: 'The Oracle responsible for quoting the price of the system Coin.',
    rateSetter: 'The RateSetter contract is responsible for the triggering the update of the PI Controller.',
    piCalculator: 'The PiController contract calculates the redemption rate given error history parameters.',
    weth: 'The Weth contract.',
    protocolToken:
        'The ProtocolToken contract is the ERC20Votes token (KITE) that is used for Surplus and Debt auctions.',
    postSettlementSurplusAuctionHouse:
        'The PostSettlementSurplusAuctionHouse contract is responsible for auctioning all remaining surplus after Global Settlement is triggered.',
    postSettlementSurplusAuctioneer:
        'The SettlementSurplusAuctioneer contract receives the surplus from the AccountingEngine when Global Settlement is triggered and auctions it off.',
    oracleJob:
        'The OracleJob contract enables keepers to be rewarded for updating the redemption rate, and the oracle price feeds.',
    accountingJob:
        'The AccountingJob contract enables keepers to be rewarded for updating the system surplus and debt.',
    liquidationJob: 'The LiquidationJob contract enables keepers to be rewarded for liquidating Vaults.',
}
