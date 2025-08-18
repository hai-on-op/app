import { gql } from '@apollo/client'
import { BigNumber, ethers } from 'ethers'
import { client } from '~/utils/graphql/client'
import { VITE_MAINNET_PUBLIC_RPC } from '~/utils'
import { HAI_VELO_V2_TOKEN_ADDRESS, VELO_TOKEN_ADDRESS, VE_NFT_CONTRACT_ADDRESS } from '~/services/haiVeloService'

export type V1Safe = {
    id: string
    collateral: string
    owner: { address: string }
}

export type FetchV1SafesResult = {
    totalCollateral: string
    safes: V1Safe[]
}

const HAI_VELO_V2_MINIMAL_ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function decimals() view returns (uint8)'
]

const ERC20_MIN_ABI = HAI_VELO_V2_MINIMAL_ERC20_ABI

const VE_NFT_ABI = [
    'function balanceOf(address _owner) view returns (uint256)',
    'function ownerToNFTokenIdList(address _owner, uint256 _index) view returns (uint256)',
    'function balanceOfNFT(uint256 _tokenId) view returns (uint256)'
]

export async function fetchV1Safes(collateralId: 'HAIVELO' = 'HAIVELO', limit = 1000): Promise<FetchV1SafesResult> {
    const QUERY = gql`
        query GetV1HaiVelo($collateralTypeId: ID!, $limit: Int!) {
            collateralType(id: $collateralTypeId) {
                id
                totalCollateral
            }
            safes(
                where: { collateralType_: { id: $collateralTypeId } }
                orderBy: collateral
                orderDirection: desc
                first: $limit
            ) {
                id
                collateral
                owner { address }
            }
        }
    `

    const { data } = await client.query<{ collateralType: { id: string; totalCollateral: string }; safes: V1Safe[] }>({
        query: QUERY,
        variables: { collateralTypeId: collateralId, limit },
        fetchPolicy: 'network-only',
    })

    return {
        totalCollateral: data?.collateralType?.totalCollateral || '0',
        safes: data?.safes || [],
    }
}

function getProvider(rpcUrl?: string) {
    return new ethers.providers.JsonRpcProvider(rpcUrl || VITE_MAINNET_PUBLIC_RPC)
}

export async function fetchV2Totals(rpcUrl?: string): Promise<{ totalSupplyRaw: string; totalSupplyFormatted: string; decimals: number }> {
    const provider = getProvider(rpcUrl)
    const contract = new ethers.Contract(HAI_VELO_V2_TOKEN_ADDRESS, ERC20_MIN_ABI, provider)
    const [totalSupply, decimals]: [BigNumber, number] = await Promise.all([
        contract.totalSupply(),
        contract.decimals(),
    ])
    return {
        totalSupplyRaw: totalSupply.toString(),
        totalSupplyFormatted: ethers.utils.formatUnits(totalSupply, decimals),
        decimals,
    }
}

export async function fetchV2UserBalance(address: string, rpcUrl?: string): Promise<{ raw: string; formatted: string; decimals: number }> {
    const provider = getProvider(rpcUrl)
    const contract = new ethers.Contract(HAI_VELO_V2_TOKEN_ADDRESS, ERC20_MIN_ABI, provider)
    const [bal, decimals]: [BigNumber, number] = await Promise.all([
        contract.balanceOf(address),
        contract.decimals(),
    ])
    return { raw: bal.toString(), formatted: ethers.utils.formatUnits(bal, decimals), decimals }
}

// Optional helpers mirroring HaiVeloProvider on-chain reads
export async function fetchVeloBalance(address: string, rpcUrl?: string): Promise<{ raw: string; formatted: string; decimals: number }> {
    const provider = getProvider(rpcUrl)
    const contract = new ethers.Contract(VELO_TOKEN_ADDRESS, ERC20_MIN_ABI, provider)
    const [bal, decimals]: [BigNumber, number] = await Promise.all([
        contract.balanceOf(address),
        contract.decimals(),
    ])
    return { raw: bal.toString(), formatted: ethers.utils.formatUnits(bal, decimals), decimals }
}

export type VeNftInfo = { tokenId: string; balance: string; balanceFormatted: string }

export async function fetchVeNftsForOwner(address: string, rpcUrl?: string): Promise<{ totalRaw: string; totalFormatted: string; nfts: VeNftInfo[] }> {
    const provider = getProvider(rpcUrl)
    const contract = new ethers.Contract(VE_NFT_CONTRACT_ADDRESS, VE_NFT_ABI, provider)
    const count: BigNumber = await contract.balanceOf(address)
    if (count.isZero()) return { totalRaw: '0', totalFormatted: '0', nfts: [] }
    const size = count.toNumber()
    const tokenIds: BigNumber[] = await Promise.all(Array.from({ length: size }, (_, i) => contract.ownerToNFTokenIdList(address, i)))
    const balances: BigNumber[] = await Promise.all(tokenIds.map((id) => contract.balanceOfNFT(id)))
    const total = balances.reduce((acc, bn) => acc.add(bn), BigNumber.from(0))
    return {
        totalRaw: total.toString(),
        totalFormatted: ethers.utils.formatUnits(total, 18),
        nfts: tokenIds.map((id, i) => ({ tokenId: id.toString(), balance: balances[i].toString(), balanceFormatted: ethers.utils.formatUnits(balances[i], 18) })),
    }
}


