import { ChainId, isFormattedAddress } from '~/utils'

const tokens = ['KITE', 'OP', 'DINERO']

export const fetchIncentivesData = async (geb: any, account: string, chainId: ChainId) => {
    const factories: { [key: string]: any } = {
        KITE: geb?.contracts?.merkleDistributorFactoryKite,
        OP: geb?.contracts?.merkleDistributorFactoryOp,
        DINERO: geb?.contracts?.merkleDistributorFactoryDinero,
    }

    const claimData = {}

    // Fetch users claims for each tokens
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        claimData[token] = {
            hasClaimableDistros: null,
            claims: [],
        }
        const tokenDistroClaims = await fetchTokenDistroClaims(account, chainId, token)
        const distributorFactory = factories[token]
        for (let j = 0; j < tokenDistroClaims.length; j++) {
            const distroClaim = tokenDistroClaims[j]
            const distributorAddress = await distributorFactory?.distributors(distroClaim.distributionIndex)
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
        }
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
    return fetch(`https://merkle-distributor.letsgethai.workers.dev/${networkKey}/${formatted}`)
        .then((res) => {
            if (res.status === 200) {
                return res.json()
            }
        })
        .catch((error) => {
            console.error('Failed to get distributions data', error)
        })
}
