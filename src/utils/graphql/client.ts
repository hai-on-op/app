import { NETWORK_ID, VITE_GRAPH_API_KEY } from '../constants'
import { ApolloClient, InMemoryCache } from '@apollo/client'

// const uri =
//     NETWORK_ID === 10
//         ? 'https://subgraph.satsuma-prod.com/ea4569e42b10/duuvf2ayrz8e0yxg0udnic--151680/hai-mainnet/api'
//         : 'https://subgraph.satsuma-prod.com/ea4569e42b10/duuvf2ayrz8e0yxg0udnic--151680/sepolia-staking/api'

// const uri =
//     NETWORK_ID === 10
//         ? 'https://subgraph.satsuma-prod.com/ea4569e42b10/duuvf2ayrz8e0yxg0udnic--151680/hai-mainnet/version/v1.0.12/api'
//         : 'https://subgraph.satsuma-prod.com/ea4569e42b10/duuvf2ayrz8e0yxg0udnic--151680/sepolia-staking/api'

const uri =
    NETWORK_ID === 10
        ? 'https://subgraph.satsuma-prod.com/ea4569e42b10/duuvf2ayrz8e0yxg0udnic--151680/hai-mainnet-v2/version/v1.0.0/api'
        : 'https://subgraph.satsuma-prod.com/ea4569e42b10/duuvf2ayrz8e0yxg0udnic--151680/sepolia-staking/api'

export const client = new ApolloClient({
    uri,
    cache: new InMemoryCache(),
})

export const uniClient = new ApolloClient({
    uri: `https://gateway-arbitrum.network.thegraph.com/api/${VITE_GRAPH_API_KEY}/subgraphs/id/EgnS9YE1avupkvCNj9fHnJxppfEmNNywYJtghqiu2pd9`,
    cache: new InMemoryCache(),
})
