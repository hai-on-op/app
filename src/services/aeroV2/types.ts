export type AeroV2ChainId = 10 | 8453
export type LegacySourceId = 'haiVeloV1' | 'haiVeloV2' | 'haiAeroV1'

export interface AeroV2Action {
    kind: 'deposit' | 'nft' | 'migrate' | 'bridge'
    chainId: AeroV2ChainId
    amount: string
    source?: LegacySourceId
    tokenIds?: string[]
}

export interface AeroV2Config {
    chainId: AeroV2ChainId
    chainName: string
    underlyingSymbol: string
    underlyingAddress: string
    nftAddress?: string
    wrapperAddress?: string
}

export interface AeroV2Balances {
    underlyingWei: string
    wrappedWei: string
    legacy: Record<LegacySourceId, string>
}

export interface AeroV2Approval {
    kind: 'erc20' | 'nft'
    tokenAddress: string
    spender: string
    amountWei?: string
    tokenId?: string
}

export interface AeroV2Quote {
    action: AeroV2Action
    account: string
    wrapperAddress: string
    inputWei: string
    outputWei: string
    nativeFeeWei: string
    tokenFeeWei: string
    approvals: AeroV2Approval[]
    managerAddress?: string
    sourceMailbox?: string
    destinationChainId?: AeroV2ChainId
    destinationWrapperAddress?: string
    destinationMailbox?: string
}

export interface AeroV2TransactionResult {
    hash: string
    chainId: AeroV2ChainId
    kind: AeroV2Action['kind']
    account?: string
    sourceWrapperAddress?: string
    destinationWrapperAddress?: string
    trackingError?: string
    messageId?: string
    destinationChainId?: AeroV2ChainId
    destinationMailbox?: string
}

export interface AeroV2ApprovalResult {
    hash: string
    chainId: AeroV2ChainId
    kind: 'approval'
}
