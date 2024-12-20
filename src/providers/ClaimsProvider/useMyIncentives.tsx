import { ethers } from 'ethers'
import { ChainId, isFormattedAddress } from '~/utils'
import { StandardMerkleTree } from '@openzeppelin/merkle-tree'

// TODO: THIS MUST GO TO THE SDK
const REWARD_DISTRIBUTOR_ABI = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address[]',
                name: 'tokens',
                type: 'address[]',
            },
            {
                indexed: false,
                internalType: 'bytes32[]',
                name: 'roots',
                type: 'bytes32[]',
            },
        ],
        name: 'MerkleRootsUpdated',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'oldSetter',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'newSetter',
                type: 'address',
            },
        ],
        name: 'RewardSetterUpdated',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'user',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'RewardsClaimed',
        type: 'event',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                internalType: 'bytes32[]',
                name: 'merkleProof',
                type: 'bytes32[]',
            },
        ],
        name: 'claim',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes32',
                name: 'root',
                type: 'bytes32',
            },
            {
                internalType: 'address',
                name: 'user',
                type: 'address',
            },
        ],
        name: 'isClaimed',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'merkleRoots',
        outputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'tokens',
                type: 'address[]',
            },
            {
                internalType: 'uint256[]',
                name: 'amounts',
                type: 'uint256[]',
            },
            {
                internalType: 'bytes32[][]',
                name: 'merkleProofs',
                type: 'bytes32[][]',
            },
        ],
        name: 'multiClaim',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'recoverERC20',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'rewardSetter',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'newRewardSetter',
                type: 'address',
            },
        ],
        name: 'setRewardSetter',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'tokens',
                type: 'address[]',
            },
            {
                internalType: 'bytes32[]',
                name: 'roots',
                type: 'bytes32[]',
            },
        ],
        name: 'updateMerkleRoots',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
]

const tokens = ['KITE', 'OP', "DINERO"]

export const fetchIncentivesData = async (geb: any, account: string, chainId: ChainId) => {
    //const factories: { [key: string]: any } = {
    //    KITE: geb?.contracts?.merkleDistributorFactoryKite,
    //    OP: geb?.contracts?.merkleDistributorFactoryOp,
    //}

    const rewardDistributorAddress = import.meta.env.VITE_REWARD_DISTRIBUTOR_ADDRESS

    const rewardDistributor = new ethers.Contract(rewardDistributorAddress, REWARD_DISTRIBUTOR_ABI, geb?.provider)

    const claimData = {}

    // Fetch users claims for each tokens
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]

        const tokenDistroClaims = await fetchTokenDistroClaims(account, chainId, token)

        console.log(account, 'tokenDistroClaims', tokenDistroClaims)

        const tokenTree = StandardMerkleTree.load(tokenDistroClaims[token.toLowerCase()])

        console.log('tokenDistroClaims', tokenDistroClaims)
        console.log('token tree: ', tokenTree)

        console.log('token root', tokenTree.root)

        const distroClaim = tokenDistroClaims[token.toLowerCase()]
        const distroClaimValues = distroClaim.values
        const isClaimed = await rewardDistributor.isClaimed(tokenTree.root, account)

        const accountClaim = (distroClaimValues.find((claim) => claim.value[0].toLowerCase() === account.toLowerCase())).value
        const hasClaimableDistros = ethers.BigNumber.from(accountClaim[1]).gt(0) && !isClaimed
        const claimableAmount = ethers.BigNumber.from(accountClaim[1])

        // @ts-ignore
        claimData[token] = {
            distroClaim,
            distroClaimValues,
            tree: tokenTree,
            root: tokenTree.root,
            distributor: rewardDistributorAddress,
            isClaimed,
            accountClaim,
            hasClaimableDistros,
            amount: claimableAmount,
            description: `${token} Daily Rewards`,
            createdAt: new Date().getTime(),
            claims: []
        }

        console.log('claimData', claimData)

        /*for (let j = 0; j < tokenDistroClaims.length; j++) {
            const distroClaim = tokenDistroClaims[j]
            const distributorAddress = rewardDistributorAddress
            const distributor = geb?.distributors?.getMerkleDistributor(distributorAddress)
            const isClaimed = await distributor?.isClaimed(distroClaim.index)
            const deploymentTime = await distributor?.deploymentTime()
            const claimState = {
                ...distroClaim,
                distributorAddress,
                isClaimed,
                createdAt: deploymentTime?.toNumber(),
            }
            if (!isClaimed) {
                claimData[token].hasClaimableDistros = true as boolean | null
            }
            claimData[token].claims.push(claimState)
        }*/
    }

    return claimData
}

const fetchTokenDistroClaims = (account: string, chainId: ChainId, token: string) => {
    const formatted = isFormattedAddress(account)
    if (!formatted) return Promise.reject(new Error('Invalid address'))
    const baseNetwork = chainId === 10 ? 'optimism' : 'optimism-sepolia'
    const networkKey = `${baseNetwork}-${token.toLowerCase()}`
    return claimFetcher(networkKey, formatted)
}

function claimFetcher(networkKey: string, formatted: string) {
    return fetch(`${import.meta.env.VITE_MERKLER_WORKER}`)
        .then((res) => {
            if (res.status === 200) {
                return res.json()
            }
        })
        .catch((error) => {
            console.error('Failed to get distributions data', error)
        })
}
