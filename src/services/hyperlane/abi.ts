/**
 * Hyperlane Contract ABIs
 *
 * Minimal ABIs for interacting with Hyperlane contracts.
 */

/**
 * HypERC20Collateral ABI (Source chain - locks tokens)
 * Used on Base to lock haiAERO before bridging to Optimism
 */
export const HYP_ERC20_COLLATERAL_ABI = [
    // Transfer tokens cross-chain
    {
        inputs: [
            { name: '_destination', type: 'uint32' },
            { name: '_recipient', type: 'bytes32' },
            { name: '_amount', type: 'uint256' },
        ],
        name: 'transferRemote',
        outputs: [{ name: 'messageId', type: 'bytes32' }],
        stateMutability: 'payable',
        type: 'function',
    },
    // Quote gas payment for a destination (queries the configured hook)
    // Note: TokenRouter's quoteGasPayment only takes destination, not gas amount
    {
        inputs: [{ name: '_destinationDomain', type: 'uint32' }],
        name: 'quoteGasPayment',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    // Get the wrapped token address
    {
        inputs: [],
        name: 'wrappedToken',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    // Get the mailbox address
    {
        inputs: [],
        name: 'mailbox',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    // Events
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'destination', type: 'uint32' },
            { indexed: true, name: 'recipient', type: 'bytes32' },
            { indexed: false, name: 'amount', type: 'uint256' },
        ],
        name: 'SentTransferRemote',
        type: 'event',
    },
] as const

/**
 * Interchain Gas Paymaster ABI (fee quoting)
 */
export const INTERCHAIN_GAS_PAYMASTER_ABI = [
    {
        inputs: [
            { name: '_destinationDomain', type: 'uint32' },
            { name: '_gasAmount', type: 'uint256' },
        ],
        name: 'quoteGasPayment',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const

/**
 * HypERC20 Synthetic ABI (Optimism - burns synthetic tokens for reverse bridge)
 * Used on Optimism for the bridged haiAERO, also supports transferRemote for reverse bridging
 */
export const HYP_ERC20_SYNTHETIC_ABI = [
    // Transfer tokens cross-chain (burns on Optimism, releases on Base)
    {
        inputs: [
            { name: '_destination', type: 'uint32' },
            { name: '_recipient', type: 'bytes32' },
            { name: '_amount', type: 'uint256' },
        ],
        name: 'transferRemote',
        outputs: [{ name: 'messageId', type: 'bytes32' }],
        stateMutability: 'payable',
        type: 'function',
    },
    // Quote gas payment for a destination
    {
        inputs: [{ name: '_destinationDomain', type: 'uint32' }],
        name: 'quoteGasPayment',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    // Standard ERC20 functions
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'totalSupply',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'decimals',
        outputs: [{ name: '', type: 'uint8' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'symbol',
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'name',
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
    // Approve (synthetic token is also an ERC20)
    {
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    // Events
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'origin', type: 'uint32' },
            { indexed: true, name: 'recipient', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' },
        ],
        name: 'ReceivedTransferRemote',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'destination', type: 'uint32' },
            { indexed: true, name: 'recipient', type: 'bytes32' },
            { indexed: false, name: 'amount', type: 'uint256' },
        ],
        name: 'SentTransferRemote',
        type: 'event',
    },
] as const

/**
 * Standard ERC20 Approval ABI (for approving HypCollateral to spend tokens)
 */
export const ERC20_APPROVAL_ABI = [
    {
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'decimals',
        outputs: [{ name: '', type: 'uint8' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const

/**
 * Hyperlane Mailbox ABI (for checking message status)
 */
export const HYPERLANE_MAILBOX_ABI = [
    // Check if a message has been processed
    {
        inputs: [{ name: '_id', type: 'bytes32' }],
        name: 'delivered',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    // Get the local domain ID
    {
        inputs: [],
        name: 'localDomain',
        outputs: [{ name: '', type: 'uint32' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const

