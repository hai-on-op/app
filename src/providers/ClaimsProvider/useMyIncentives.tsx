/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ethers } from 'ethers'
import { ChainId, isFormattedAddress } from '~/utils'
import { StandardMerkleTree } from '@openzeppelin/merkle-tree'
import { gql } from '@apollo/client'
import { client } from '~/utils/graphql/client'

// GraphQL query to fetch merkle roots and find the latest one
const MERKLE_ROOTS_QUERY = gql`
    query GetMerkleRoots {
        merkleRoots {
            id
            updatedAt
        }
    }
`

// Function to fetch the latest merkle root timestamp
const fetchLatestMerkleRootTimestamp = async (): Promise<number | null> => {
    try {
        const { data } = await client.query({
            query: MERKLE_ROOTS_QUERY,
            fetchPolicy: 'network-only',
        })

        if (!data?.merkleRoots || data.merkleRoots.length === 0) {
            return null
        }

        // Find the merkle root with the biggest updatedAt value
        const latestMerkleRoot = data.merkleRoots.reduce((latest: any, current: any) => {
            const currentUpdatedAt = Number(current.updatedAt)
            const latestUpdatedAt = Number(latest.updatedAt)
            return currentUpdatedAt > latestUpdatedAt ? current : latest
        })

        return Number(latestMerkleRoot.updatedAt)
    } catch (error) {
        console.error('Failed to fetch merkle roots from GraphQL:', error)
        return null
    }
}

// TODO: THIS MUST GO TO THE SDK
export const REWARD_DISTRIBUTOR_ABI = [
    {
        inputs: [
            { internalType: 'uint256', name: '_epochDuration', type: 'uint256' },
            { internalType: 'uint256', name: '_bufferDuration', type: 'uint256' },
            { internalType: 'address', name: '_rootSetter', type: 'address' },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    { inputs: [], name: 'AlreadyAuthorized', type: 'error' },
    { inputs: [], name: 'EnforcedPause', type: 'error' },
    { inputs: [], name: 'ExpectedPause', type: 'error' },
    { inputs: [], name: 'NotAuthorized', type: 'error' },
    {
        inputs: [
            { internalType: 'uint256', name: '_x', type: 'uint256' },
            { internalType: 'uint256', name: '_y', type: 'uint256' },
        ],
        name: 'NotGreaterThan',
        type: 'error',
    },
    { inputs: [], name: 'RewardDistributor_AlreadyClaimed', type: 'error' },
    { inputs: [], name: 'RewardDistributor_ArrayLengthsMustMatch', type: 'error' },
    { inputs: [], name: 'RewardDistributor_InitialEpochAlreadyStarted', type: 'error' },
    { inputs: [], name: 'RewardDistributor_InitialEpochNotStarted', type: 'error' },
    { inputs: [], name: 'RewardDistributor_InvalidAmount', type: 'error' },
    { inputs: [], name: 'RewardDistributor_InvalidMerkleProof', type: 'error' },
    { inputs: [], name: 'RewardDistributor_InvalidMerkleRoot', type: 'error' },
    { inputs: [], name: 'RewardDistributor_InvalidTokenAddress', type: 'error' },
    { inputs: [], name: 'RewardDistributor_NotRootSetter', type: 'error' },
    { inputs: [], name: 'RewardDistributor_TooSoonEpochNotElapsed', type: 'error' },
    { inputs: [], name: 'RewardDistributor_TransferFailed', type: 'error' },
    { inputs: [], name: 'Unauthorized', type: 'error' },
    { inputs: [], name: 'UnrecognizedCType', type: 'error' },
    { inputs: [], name: 'UnrecognizedParam', type: 'error' },
    {
        anonymous: false,
        inputs: [{ indexed: false, internalType: 'address', name: '_account', type: 'address' }],
        name: 'AddAuthorization',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: 'bytes32', name: '_param', type: 'bytes32' },
            { indexed: true, internalType: 'bytes32', name: '_cType', type: 'bytes32' },
            { indexed: false, internalType: 'bytes', name: '_data', type: 'bytes' },
        ],
        name: 'ModifyParameters',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [{ indexed: false, internalType: 'address', name: 'account', type: 'address' }],
        name: 'Paused',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [{ indexed: false, internalType: 'address', name: '_account', type: 'address' }],
        name: 'RemoveAuthorization',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: 'address', name: '_rescueReceiver', type: 'address' },
            { indexed: true, internalType: 'address', name: '_rewardToken', type: 'address' },
            { indexed: false, internalType: 'uint256', name: '_wad', type: 'uint256' },
        ],
        name: 'RewardDistributorEmergencyWithdrawal',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: 'address', name: '_rewardToken', type: 'address' },
            { indexed: false, internalType: 'bytes32', name: '_merkleRoot', type: 'bytes32' },
            { indexed: false, internalType: 'uint256', name: '_epochCounter', type: 'uint256' },
        ],
        name: 'RewardDistributorMerkleRootUpdated',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: 'address', name: '_account', type: 'address' },
            { indexed: true, internalType: 'address', name: '_rewardToken', type: 'address' },
            { indexed: false, internalType: 'uint256', name: '_wad', type: 'uint256' },
        ],
        name: 'RewardDistributorRewardClaimed',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [{ indexed: false, internalType: 'address', name: 'account', type: 'address' }],
        name: 'Unpaused',
        type: 'event',
    },
    {
        inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
        name: 'addAuthorization',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
        name: 'authorizedAccounts',
        outputs: [{ internalType: 'bool', name: '_authorized', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'authorizedAccounts',
        outputs: [{ internalType: 'address[]', name: '_accounts', type: 'address[]' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'bufferDuration',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: '_token', type: 'address' },
            { internalType: 'uint256', name: '_wad', type: 'uint256' },
            { internalType: 'bytes32[]', name: '_merkleProof', type: 'bytes32[]' },
        ],
        name: 'claim',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: '_rescueReceiver', type: 'address' },
            { internalType: 'address', name: '_token', type: 'address' },
            { internalType: 'uint256', name: '_wad', type: 'uint256' },
        ],
        name: 'emergencyWithdraw',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'epochCounter',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'epochDuration',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'bytes32', name: '_root', type: 'bytes32' },
            { internalType: 'address', name: '_account', type: 'address' },
        ],
        name: 'isClaimed',
        outputs: [{ internalType: 'bool', name: '_hasClaimed', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'address', name: '_token', type: 'address' }],
        name: 'merkleRoots',
        outputs: [{ internalType: 'bytes32', name: '_root', type: 'bytes32' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'bytes32', name: '_param', type: 'bytes32' },
            { internalType: 'bytes', name: '_data', type: 'bytes' },
        ],
        name: 'modifyParameters',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address[]', name: '_tokens', type: 'address[]' },
            { internalType: 'uint256[]', name: '_wads', type: 'uint256[]' },
            { internalType: 'bytes32[][]', name: '_merkleProofs', type: 'bytes32[][]' },
        ],
        name: 'multiClaim',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    { inputs: [], name: 'pause', outputs: [], stateMutability: 'nonpayable', type: 'function' },
    {
        inputs: [],
        name: 'paused',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
        name: 'removeAuthorization',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'rootSetter',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
    },
    { inputs: [], name: 'startInitialEpoch', outputs: [], stateMutability: 'nonpayable', type: 'function' },
    {
        inputs: [],
        name: 'startTimestamp',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    { inputs: [], name: 'unpause', outputs: [], stateMutability: 'nonpayable', type: 'function' },
    {
        inputs: [
            { internalType: 'address[]', name: '_tokens', type: 'address[]' },
            { internalType: 'bytes32[]', name: '_merkleRoots', type: 'bytes32[]' },
        ],
        name: 'updateMerkleRoots',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
]

const tokensAddresses: Record<string, string> = {
    KITE: '0xf467C7d5a4A9C4687fFc7986aC6aD5A4c81E1404',
    OP: '0x4200000000000000000000000000000000000042',
    DINERO: '0x9FFc23fd5637bc1A2B73E26d61CF65f9873E8d25',
    HAI: '0x10398AbC267496E49106B07dd6BE13364D10dC71',
}

const tokens = ['KITE', 'OP', 'DINERO', 'HAI'] as const

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

// Define proper types for incentive claims
interface IncentiveClaim {
    isPaused?: boolean
    isClaimed?: boolean
    hasClaimableDistros?: boolean
    amount?: any
    description?: string
    claimIt?: () => Promise<any>
    [key: string]: any
}

interface TimerData {
    endTime: number
    nextDistribution: string
    isPaused: boolean
}

interface IncentivesData {
    claimData: Record<string, IncentiveClaim>
    timerData: TimerData
}

export const fetchIncentivesData = async (geb: any, account: string, chainId: ChainId): Promise<IncentivesData> => {
    //const factories: { [key: string]: any } = {
    //    KITE: geb?.contracts?.merkleDistributorFactoryKite,
    //    OP: geb?.contracts?.merkleDistributorFactoryOp,
    //}

    //console.log(geb.signer)

    const rewardDistributorAddress = import.meta.env.VITE_REWARD_DISTRIBUTOR_ADDRESS

    const rewardDistributor = new ethers.Contract(rewardDistributorAddress, REWARD_DISTRIBUTOR_ABI, geb?.signer)

    const bufferDuration = await rewardDistributor.bufferDuration()
    const startTimestamp = await rewardDistributor.startTimestamp()
    const epochDuration = await rewardDistributor.epochDuration()
    const epochCounter = await rewardDistributor.epochCounter()

    // Fetch the latest merkle root timestamp from GraphQL
    const latestMerkleRootTimestamp = await fetchLatestMerkleRootTimestamp()

    // Use the latest merkle root timestamp if available, otherwise fallback to calculation
    let lastSettedMerkleRoot: number
    if (latestMerkleRootTimestamp) {
        lastSettedMerkleRoot = latestMerkleRootTimestamp
        console.log('Using latest merkle root timestamp from GraphQL:', lastSettedMerkleRoot)
    } else {
        // Fallback to the original calculation
        lastSettedMerkleRoot =
            Number(startTimestamp) +
            Number(epochDuration) * (Number(epochCounter) - 1) +
            Number(bufferDuration) * (Number(epochCounter) - 1)
        console.log('Using calculated merkle root timestamp (fallback):', lastSettedMerkleRoot)
    }

    console.log('lastSettedMerkleRoot', lastSettedMerkleRoot)

    console.log('lastSettedMerkleRoot', lastSettedMerkleRoot, Number(startTimestamp))

    console.log('fetching incentives data!!!', rewardDistributorAddress, bufferDuration, lastSettedMerkleRoot)

    const distributionDuration = Number(epochDuration) + Number(bufferDuration)
    const isPaused = await rewardDistributor.paused()

    const currentBlock = await geb.provider.getBlock('latest')
    const currentTime = currentBlock.timestamp

    console.log('currentTime', currentTime, currentBlock, distributionDuration)

    const claimData = {}

    // Calculate timer data independently of claims
    const timerData = {
        endTime: Number(lastSettedMerkleRoot) + Number(distributionDuration),
        nextDistribution: formatTime(
            Number(String(distributionDuration)) - (currentTime - Number(String(lastSettedMerkleRoot)))
        ),
        isPaused
    }

    // Fetch users claims for each tokens
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]

        const tokenDistroClaims = await fetchTokenDistroClaims(account, chainId, token)

        try {
            // Skip if no claims data for this token
            if (!tokenDistroClaims || !tokenDistroClaims[token.toLowerCase()]) {
                console.log(`No claims data for token ${token}`)
                continue
            }

            const tokenTree = StandardMerkleTree.load(tokenDistroClaims[token.toLowerCase()])
            const distroClaim = tokenDistroClaims[token.toLowerCase()]

            if (!distroClaim || !distroClaim.values) {
                console.log(`No claim values for token ${token}`)
                continue
            }

            const distroClaimValues = distroClaim.values
            const isClaimed = await rewardDistributor.isClaimed(tokenTree.root, account)

            const accountClaim = distroClaimValues.find(
                (claim: any) => claim.value[0].toLowerCase() === account.toLowerCase()
            )?.value

            if (accountClaim) {
                //      console.log('Account Claim =======', accountClaim)
                const hasClaimableDistros = accountClaim && ethers.BigNumber.from(accountClaim[1]).gt(0) && !isClaimed
                const claimableAmount = accountClaim ? ethers.BigNumber.from(accountClaim[1]) : ethers.BigNumber.from(0)
                //        console.log('here===================?? ds fvsdv')

                const claimingData = [account, claimableAmount]

                //console.log('claimingData', claimingData)

                const proof = tokenTree.getProof(claimingData)

                const claimIt = async () => {
                    console.log(tokensAddresses[token], String(claimableAmount), proof, geb.signer, rewardDistributor)
                    try {
                        const tx = await rewardDistributor
                            .connect(geb.signer)
                            .claim(tokensAddresses[token], claimableAmount, proof)

                        // Wait for the transaction to be confirmed
                        await tx.wait()
                        return tx
                    } catch (err) {
                        console.log('err', err)
                        throw err
                    }
                }

                const claimAll = async () => {
                    console.log(tokensAddresses)

                    const targetTokensAddresses: string[] = []
                    const claimableAmounts: ethers.BigNumber[] = []
                    const allProofs: string[][] = []

                    const tokenDistroClaims = await fetchTokenDistroClaims(account, chainId, 'whatever')

                    for (let i = 0; i < Object.keys(tokenDistroClaims).length; i++) {
                        const tokenKey = Object.keys(tokenDistroClaims)[i].toUpperCase() as keyof typeof tokensAddresses

                        console.log('claiming all token', tokenKey)

                        const tokenTree = StandardMerkleTree.load(tokenDistroClaims[tokenKey.toLowerCase()])
                        const distroClaim = tokenDistroClaims[tokenKey.toLowerCase()]
                        const distroClaimValues = distroClaim.values
                        const isClaimed = await rewardDistributor.isClaimed(tokenTree.root, account)

                        const accountClaim = distroClaimValues.find(
                            (claim: any) => claim.value[0].toLowerCase() === account.toLowerCase()
                        )?.value

                        const hasClaimableDistros =
                            accountClaim && ethers.BigNumber.from(accountClaim[1]).gt(0) && !isClaimed

                        if (hasClaimableDistros) {
                            const claimableAmount = ethers.BigNumber.from(accountClaim[1])
                            const claimingData = [account, claimableAmount]
                            const proof = tokenTree.getProof(claimingData)

                            targetTokensAddresses.push(tokensAddresses[tokenKey])
                            claimableAmounts.push(claimableAmount)
                            allProofs.push(proof)
                        }
                    }

                    //console.log('claiming all', tokensAddresses, claimableAmounts, allProofs)

                    if (targetTokensAddresses.length > 0) {
                        const tx = await rewardDistributor
                            .connect(geb.signer)
                            .multiClaim(targetTokensAddresses, claimableAmounts, allProofs)

                        // Wait for the transaction to be confirmed
                        await tx.wait()
                        return tx
                    }

                    return null
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
                    description: `${token}`,
                    createdAt: new Date().getTime(),
                    claims: [],
                    proof,
                    claimIt,
                    endTime: timerData.endTime,
                    nextDistribution: timerData.nextDistribution,
                    claimAll,
                    isPaused: timerData.isPaused,
                }

                console.log('claimData', token, claimData)
            } else {
                console.log('No claim found for account', account, token)
            }
        } catch (err) {
            console.log('err', err)
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

    return {
        claimData,
        timerData
    }
}

function formatDistro<T extends Record<string, Record<string, any>>>(obj: T): Partial<T> {
    const result: Partial<T> = {}

    for (const key in obj) {
        if (Object.keys(obj[key]).length > 0) {
            result[key] = obj[key]
        }
    }

    console.log('result', obj, result)

    return result
}

const fetchTokenDistroClaims = async (account: string, chainId: ChainId, token: string) => {
    const formatted = isFormattedAddress(account)
    if (!formatted) return Promise.reject(new Error('Invalid address'))
    // const baseNetwork = chainId === 10 ? 'optimism' : 'optimism-sepolia'
    // const networkKey = `${baseNetwork}-${token.toLowerCase()}`
    // const fetchedClaims = await claimFetcher(networkKey, formatted)
    const fetchedClaims = await claimFetcher()
    return formatDistro(fetchedClaims)
}

// function claimFetcher(networkKey: string, formatted: string) {
function claimFetcher() {
    return fetch(`${import.meta.env.VITE_MERKLER_WORKER}`)
        .then(async (res) => {
            const result = await res.json()

            if (res.status === 200) {
                return result
            }
        })
        .catch((error) => {
            console.error('Failed to get distributions data', error)
        })
}
