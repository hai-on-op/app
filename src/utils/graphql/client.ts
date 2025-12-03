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
        ? 'https://optimism.graph-eu.p2pify.com/05d687a01b1a9939ca4b88d438ee44b6/sgr-742-111-180'
        : 'https://subgraph.satsuma-prod.com/ea4569e42b10/duuvf2ayrz8e0yxg0udnic--151680/hai-sepolia-redeploy/api'

// force rebuild

export const client = new ApolloClient({
    uri,
    cache: new InMemoryCache(),
})

export const uniClient = new ApolloClient({
    uri: `https://gateway-arbitrum.network.thegraph.com/api/${VITE_GRAPH_API_KEY}/subgraphs/id/EgnS9YE1avupkvCNj9fHnJxppfEmNNywYJtghqiu2pd9`,
    cache: new InMemoryCache(),
})
