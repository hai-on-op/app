// Selected functions and events from core-test's compiled WrappedTokenV3 ABI.
export { default as WRAPPED_TOKEN_V3_ABI } from './wrappedTokenV3.abi.json'

export const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address,address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
    'event Approval(address indexed owner,address indexed spender,uint256 value)',
]

export const SAERO_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function tokenOfOwnerByIndex(address,uint256) view returns (uint256)',
    'function TOKEN() view returns (address)',
    'function ownerOf(uint256) view returns (address)',
    'function staked(uint256) view returns (uint128 amount,uint48 end,bool isPermanent)',
    'function getApproved(uint256) view returns (address)',
    'function isApprovedForAll(address,address) view returns (bool)',
    'function approve(address,uint256)',
    'event Approval(address indexed owner,address indexed approved,uint256 indexed tokenId)',
]

export const MAILBOX_ABI = [
    'function localDomain() view returns (uint32)',
    'function delivered(bytes32) view returns (bool)',
    'event Dispatch(address indexed sender,uint32 indexed destination,bytes32 indexed recipient,bytes message)',
    'event DispatchId(bytes32 indexed messageId)',
]
