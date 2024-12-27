import { ethers } from 'ethers'
import { ChainId, isFormattedAddress } from '~/utils'
import { StandardMerkleTree } from '@openzeppelin/merkle-tree'

// TODO: THIS MUST GO TO THE SDK
const REWARD_DISTRIBUTOR_ABI = [
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'targetDuration',
                type: 'uint256',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
        ],
        name: 'OwnableInvalidOwner',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
        ],
        name: 'OwnableUnauthorizedAccount',
        type: 'error',
    },
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
            {
                indexed: false,
                internalType: 'uint256',
                name: 'counter',
                type: 'uint256',
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
                name: 'previousOwner',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'newOwner',
                type: 'address',
            },
        ],
        name: 'OwnershipTransferred',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'uint256',
                name: 'newDuration',
                type: 'uint256',
            },
        ],
        name: 'RewardDurationUpdated',
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
        inputs: [],
        name: 'duration',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes32',
                name: '',
                type: 'bytes32',
            },
            {
                internalType: 'address',
                name: '',
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
        inputs: [],
        name: 'lastSettedMerkleRoot',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'merkleRootCounter',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '',
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
        inputs: [],
        name: 'owner',
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
        name: 'renounceOwnership',
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
                internalType: 'uint256',
                name: 'newDuration',
                type: 'uint256',
            },
        ],
        name: 'setDuration',
        outputs: [],
        stateMutability: 'nonpayable',
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
                internalType: 'address',
                name: 'newOwner',
                type: 'address',
            },
        ],
        name: 'transferOwnership',
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

const tokensAddresses = {
    KITE: '0x47c6ae06686D35DD7656bE6AF3091Fcd626bbB2f',
    OP: '0x7a877B2286B63b71b566AE1debdcC3e80Fc4B868',
    DINERO: '0x9FFc23fd5637bc1A2B73E26d61CF65f9873E8d25',
}

const tokens = ['KITE', 'OP', 'DINERO']

function formatTime(seconds: number) {
    // Handle zero or negative values
    if (seconds <= 0) {
        return 'now'
    }

    // Convert seconds to hours
    const hours = Math.floor(seconds / 3600)

    // If it's more than or equal to 1 hour, return just the hours
    if (hours >= 1) {
        return `${hours} hour${hours > 1 ? 's' : ''}`
    }

    // If less than an hour, convert to minutes
    const minutes = Math.floor(seconds / 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
}

export const fetchIncentivesData = async (geb: any, account: string, chainId: ChainId) => {
    //const factories: { [key: string]: any } = {
    //    KITE: geb?.contracts?.merkleDistributorFactoryKite,
    //    OP: geb?.contracts?.merkleDistributorFactoryOp,
    //}

    //console.log(geb.signer)

    const rewardDistributorAddress = import.meta.env.VITE_REWARD_DISTRIBUTOR_ADDRESS

    const rewardDistributor = new ethers.Contract(rewardDistributorAddress, REWARD_DISTRIBUTOR_ABI, geb?.signer)

    const lastSettedMerkleRoot = await rewardDistributor.lastSettedMerkleRoot()
    //

    const distributionDuration = await rewardDistributor.duration()

    const currentBlock = await geb.provider.getBlock('latest')

    const currentTime = currentBlock.timestamp

    const claimData = {}

    // Fetch users claims for each tokens
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]

        const tokenDistroClaims = await fetchTokenDistroClaims(account, chainId, token)

        const tokenTree = StandardMerkleTree.load(tokenDistroClaims[token.toLowerCase()])

        const distroClaim = tokenDistroClaims[token.toLowerCase()]
        const distroClaimValues = distroClaim.values
        const isClaimed = await rewardDistributor.isClaimed(tokenTree.root, account)

        const accountClaim = distroClaimValues.find(
            (claim) => claim.value[0].toLowerCase() === account.toLowerCase()
        ).value
        const hasClaimableDistros = ethers.BigNumber.from(accountClaim[1]).gt(0) && !isClaimed
        const claimableAmount = ethers.BigNumber.from(accountClaim[1])

        const claimingData = [account, claimableAmount]

        //console.log('claimingData', claimingData)

        const proof = tokenTree.getProof(claimingData)

        const claimIt = async () => {
            // @ts-ignore
            return await rewardDistributor.connect(geb.signer).claim(tokensAddresses[token], claimableAmount, proof)
        }

        // @ts-ignore
        claimData[token] = {
            distroClaim,
            distroClaimValues,
            tree: tokenTree,
            root: tokenTree.root,
            distributorContract: rewardDistributor,
            distributor: rewardDistributorAddress,
            isClaimed,
            accountClaim,
            hasClaimableDistros,
            amount: claimableAmount,
            description: `${token} Daily Rewards`,
            createdAt: new Date().getTime(),
            claims: [],
            proof,
            claimIt,
            nextDistribution: formatTime(
                Number(String(distributionDuration)) - (currentTime - Number(String(lastSettedMerkleRoot)))
            ),
        }

        //console.log('claimData', claimData)

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
